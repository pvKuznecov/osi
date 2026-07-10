# SimpleWindow: кэш async-компонентов (`asyncComponentCache`)

Документ для разработчиков приложений OSI. Описывает механизм загрузки Vue-компонентов внутри окон, причину появления кэша и практические рекомендации.

**Связанные файлы:**
- `src/components/os/SimpleWindow/SimpleWindow.vue` — реализация кэша
- `src/components/os/SimpleWindow/template.html` — `<component :is="dynamicComponent" …>`
- `src/config/applications.js` — `loader` и `appsConfig.getAppLoader(appName)`
- `src/App.vue` — список окон (`sortedWindows`) из `IDBWindows`

---

## Как устроена загрузка приложения в окне

1. Пользователь запускает программу (рабочий стол, «Пуск», DirDigger).
2. `DesktopArea.launchApp()` создаёт запись окна в `usersTable` / `IDBWindows`.
3. `App.vue` рендерит `<SimpleWindow>` для каждого видимого окна.
4. `SimpleWindow` через computed `dynamicComponent` получает async-компонент по `appName`.
5. В шаблоне: `<component :is="dynamicComponent" :window-id="windowId" :USERID="USERID" … />`.

Каждое приложение регистрируется в `applications.js` полем `loader`:

```javascript
loader: () => import('@/apps/system/OSIJustRead/OSIJustRead.vue'),
```

`getAppLoader(appName)` возвращает эту функцию. `defineAsyncComponent(loader)` оборачивает её в ленивый компонент Vue.

---

## Что кэшируется и что нет

| Сущность | Кэшируется? | Пояснение |
|----------|-------------|-----------|
| **Определение компонента** (`defineAsyncComponent`) | Да, один раз на `appName` | Общий «чертёж» компонента OSIJustRead, OSIPicta и т.д. |
| **Экземпляр компонента в окне** | Нет | У каждого `SimpleWindow` свой экземпляр со своими props (`windowId`, `fileId`, …) |
| **Состояние приложения** (`data`, открытые файлы) | Нет в кэше | Живёт в экземпляре; при размонтировании теряется, если не сохранено в IDB |

Ключ кэша: **`appName`** (например `OSIJustRead`), не `windowId`.

Два окна JustRead → один кэшированный loader, **два независимых экземпляра** компонента.

---

## Зачем нужен `asyncComponentCache`

### Проблема без кэша

Изначально `dynamicComponent` был computed примерно так:

```javascript
dynamicComponent() {
    const loader = appsConfig.getAppLoader(this.appName);
    return loader ? defineAsyncComponent(loader) : null;
}
```

При **каждом пересчёте** computed создаётся **новый объект** определения компонента. Для Vue это **другой компонент** → старый экземпляр **размонтируется** (`beforeUnmount`), создаётся новый (`mounted`).

Пересчёт `dynamicComponent` происходит при любом ре-рендере `SimpleWindow`, в том числе когда:

- обновляется `IDBWindows` после `updatePosition` (перетаскивание окна);
- меняется `zIndex` при активации окна;
- обновляются props `positionx` / `positiony` из БД;
- родитель (`App.vue`) перерисовывает список `sortedWindows`.

### Симптомы для приложения

- Пропадает содержимое, сбрасывается `data`.
- Список файлов в UI есть, а область просмотра пустая.
- Повторные срабатывания `watch` на `fileId` / `fileData` с некорректными данными из props окна.
- Лишние запросы к IndexedDB и перезапись `windstates`.

Пример: **OSIJustRead** после перетаскивания показывал «Файл не выбран», хотя файл оставался в боковом списке.

### Решение

Модульный кэш `asyncComponentCache` + функция `getCachedAsyncComponent(appName)`:

```javascript
const asyncComponentCache = Object.create(null);

function getCachedAsyncComponent(appName) {
    const loader = appsConfig.getAppLoader(appName);
    if (!loader) return null;

    if (!asyncComponentCache[appName]) {
        asyncComponentCache[appName] = defineAsyncComponent(loader);
    }

    return asyncComponentCache[appName];
}
```

Computed только **возвращает** уже созданное определение → Vue **сохраняет** экземпляр приложения при перемещении окна.

---

## Область действия

Кэш актуален для **всех приложений**, открываемых через `SimpleWindow`:

- OSIJustRead, OSIPicta, OSIMPlayer, OSIDirDigger, OSICalculator, OSISettings и др.

На DirDigger как отдельное приложение в окне — да. На код **вне** `SimpleWindow` (если появится) — не влияет.

Кэш **не заменяет** логику сохранения состояния в приложении (`windstates`, `dFiles`). Он лишь предотвращает **случайную потерю state** из-за перемонтирования.

---

## События, которые раньше ломали state (теперь — нет)

| Действие пользователя | Что происходит в системе |
|-----------------------|---------------------------|
| Перетаскивание окна | `debounceSavePosition` → `usersTable.windows.updatePosition` → `IDBWindows` обновляется → ре-рендер `SimpleWindow` |
| Клик по окну (фокус) | `activate` → смена `zIndex` → ре-рендер |
| Разворот / сворачивание | обновление записи окна в БД |

Без кэша любое из этих действий могло перемонтировать приложение. С кэшем — **нет**.

---

## Рекомендации разработчику приложения

### 1. Не полагаться на перемонтирование как «сброс»

Плохо: ожидать, что при каждом открытии окна `mounted` заново инициализирует чистое состояние без IDB.

Хорошо: явно сохранять состояние в `usersTable.windstates` (по `windowId` + `USERID`) и восстанавливать в `initFromIDB()`.

Эталоны: `OSICalculator`, `OSIPicta`, `OSIJustRead`.

### 2. Защита от повторной загрузки файла из props

Props `fileId` / `fileData` на окне **живут всё время жизни окна** (в т.ч. после открытия из DirDigger). При перемонтировании (или ошибках в watch) watch может сработать снова.

Рекомендуемый паттерн (как в Picta / JustRead):

```javascript
data() {
    return {
        isInitialized: false,
        pendingFileId: null,
        pendingFileData: null,
        lastExternalFileId: null,
    };
},

watch: {
    fileId: {
        async handler(newId) {
            if (!newId) return;
            if (!this.isInitialized) {
                this.pendingFileId = newId;
                return;
            }
            const normalizedId = String(newId);
            // Уже открыт — только переключить, не перезагружать
            const existingIndex = this.files.findIndex(
                f => f.id != null && String(f.id) === normalizedId
            );
            if (existingIndex !== -1) {
                this.currentIndex = existingIndex;
                this.lastExternalFileId = normalizedId;
                return;
            }
            if (this.lastExternalFileId === normalizedId) return;
            this.lastExternalFileId = normalizedId;
            const fileData = await dFiles.getInfo(newId);
            if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
        },
        immediate: true,
    },
},
```

### 3. `fileType` в props окна ≠ MIME-тип файла

В `systemconfig.windows` и в props `fileData` поле `type` часто означает **категорию dFiles** (`text`, `image`, `audio`, `file`), а не `text/plain`.

При повторной загрузке из `fileData` без `blob` нельзя подставлять `this.fileType` как MIME.

Решение в приложении:

- при наличии `id` без blob — грузить через `dFiles.getInfo(id)`;
- выносить определение MIME в `resolveMimeType(fileName, fileData)` (расширение, `mimetype`, `type` только если содержит `/`).

### 4. Отображение контента — не только по точному MIME

Шаблон вида `v-if="currentFileType === 'text/plain'"` ломается для `.json`, `.md` с пустым MIME, записей с ошибочным `mimetype: 'text'`.

Лучше: computed `isTextViewable` на базе `isTextLike(name, mimetype)` или единая ветка для всех текстовых форматов.

### 5. Сериализация state для `windstates`

В `saveState` не сохранять несериализуемое (`File`, `Blob`). Для файловых приложений — строка `content` + метаданные; `File` держать только в памяти на время сессии.

Использовать `usersTable.createSafeCopy` (вызывается внутри `windstates.updateVal`).

### 6. `beforeUnmount` и асинхронный `saveState`

Если нужно сохранить state при закрытии окна — помнить, что `saveState()` async. При закрытии окна `closeComplWindow` удаляет запись из `windowsstates`; для сворачивания и перезагрузки страницы важнее периодическое сохранение (watch + throttle).

---

## Варианты использования кэша (для инфраструктуры)

### Текущий вариант (рекомендуемый)

Кэш на уровне модуля `SimpleWindow.vue`. Прозрачен для приложений, не требует изменений в `applications.js`.

**Когда подходит:** всегда, для всех оконных приложений (текущая конфигурация OSI).

### Альтернатива: кэш в `applications.js`

Вынести `getCachedAsyncComponent` в `appsConfig`, если понадобится использовать тот же loader вне `SimpleWindow`:

```javascript
// гипотетически
appsConfig.getAsyncComponent(appName);
```

**Когда имеет смысл:** превью приложения, встроенный виджет, тесты — пока в проекте не используется.

### Альтернатива: eager import (без async)

Заменить `loader` на синхронный import в конфиге — убрать code splitting, увеличить начальный бандл. Кэш не нужен, но теряется ленивая загрузка.

**Когда не использовать:** production OSI с десятком приложений.

### Сброс кэша (только dev / HMR)

При hot-reload кэш может держать старую версию компонента. Обходные пути:

- полная перезагрузка страницы (F5);
- в dev при необходимости: `delete asyncComponentCache[appName]` (не реализовано в production-коде намеренно).

---

## Чего кэш не делает

- Не синхронизирует state между **двумя окнами** одного приложения (два окна JustRead — два независимых state).
- Не исправляет ошибки в watch / MIME / шаблоне конкретного приложения.
- Не отменяет необходимость `windstates` при перезагрузке всей страницы (F5) — экземпляры всё равно создаются заново, восстановление только из IDB.
- Не влияет на закрытие окна (`closeComplWindow` удаляет state окна из БД по дизайну).

---

## Чеклист при отладке «пропал контент после движения окна»

1. Убедиться, что в `SimpleWindow` используется `getCachedAsyncComponent` (кэш включён).
2. В DevTools Vue: не вызываются ли лишние `mounted` / `beforeUnmount` при drag.
3. Проверить `watch` на `fileId` / `fileData` — нет ли повторной загрузки с `replaceList: true`.
4. Проверить `mimetype` в `files` / `currentFile` — не стал ли `'text'` вместо `text/plain`.
5. Проверить шаблон — не слишком ли узкий `v-if` по MIME.
6. Проверить `windstates` — сохраняется ли state до действия пользователя (throttle 2 с в JustRead).

---

## История изменения

Механизм добавлен при исправлении бага OSIJustRead (контент пропадал после перетаскивания окна, открытого из DirDigger). Аналогичная уязвимость потенциально затрагивала все приложения с stateful UI в `SimpleWindow`.
