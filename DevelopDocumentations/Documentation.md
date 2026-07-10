# Документация Проекта OSI

## Общее описание

OSI - это веб-приложение, реализующее операционную систему с графическим интерфейсом (GUI) в браузере. Оно состоит из различных компонентов и приложений, имитирующих работу классической операционной системы.

## Структура проекта

### Основные директории

- **src/** - Исходный код приложения
- **docs/** - Сгенерированная документация и ресурсы для продакшена
- **public/** - Публичные ресурсы (HTML, favicon)
- **DevelopDocumentations/** - Документация разработки

### Структура src/

#### Каталоги

1. **src/apps/** - Приложения системы
2. **src/assets/** - Общие ассеты (обои, аватары, favicon)
3. **src/components/os/** - Компоненты операционной системы
4. **src/config/** - Конфигурационные файлы
5. **src/core/** - Вспомогательные утилиты (`helpers.js`)
6. **src/idb/** - Работа с IndexedDB (Dexie)
7. **src/services/** - Сервисы (уведомления и др.)
8. **src/stores/** - Pinia-сторы
9. **src/styles/** - Глобальные стили (подключаются в `App.vue`)

#### Основные файлы

- `src/App.vue` - Главный компонент приложения (глобальные стили `global.css`)
- `src/main.js` - Точка входа (Vue, Pinia, Bootstrap, инициализация БД)
- `src/config/applications.js` - Конфигурация приложений
- `src/config/os.js` - Конфигурация операционной системы

## Компоненты ОС

### Основные компоненты интерфейса

1. **DesktopArea** - Рабочая область экрана (ярлыки, обои, запуск приложений)
2. **TaskBar** - Панель задач
3. **AutorizationArea** - Область авторизации
4. **NotificationsArea** - Область уведомлений
5. **SimpleWindow** - Простое окно приложения (см. [кэш async-компонентов](./SimpleWindow-AsyncComponents.md))
6. **AppIcon** - Универсальный компонент отображения иконки приложения (PNG / CSS / эмодзи)

## Приложения системы

### Активные приложения

1. **OSIAppManager** - Менеджер приложений
2. **OSICalculator** - Калькулятор
3. **OSIDirDigger** - Проводник файлов
4. **OSIMPlayer** - Музыкальный плеер
5. **OSINotificator** - Менеджер уведомлений
6. **OSIPicta** - Просмотрщик изображений
7. **OSIJustRead** - Просмотрщик текстовых файлов
8. **OSISettings** - Настройки системы
9. **OSITetris** - Игра в тетрис

### Иконки приложений

Иконки хранятся **в папке каждого приложения** как `icon.png` (128×128, круглый бейдж на прозрачном фоне).

Пример: `src/apps/system/OSISettings/icon.png`

Отображение через компонент **`AppIcon`** (`src/components/os/AppIcon/`):
- приоритет: `iconImg` → `iconclass` (старый CSS/Bootstrap) → `icon` (эмодзи)
- размеры: `size="sm"` (TaskBar), `md` (рабочий стол), `lg` (AppManager)

**Старый подход** (Bootstrap Icons + CSS-градиент `text-ico-*`) сохранён в коде как закомментированные строки `iconclass` в `applications.js` и как fallback в `AppIcon`.

## Конфигурации

### applications.js
Файл отвечает за конфигурацию приложений: метаданные, поведение окна и **подключение Vue-компонента**. Каждое приложение описывается через класс `OSIApp` с параметрами:
- `id` — уникальный ID приложения (латиница, lowercase)
- `name` — имя компонента (должно совпадать с именем `.vue`-файла, например `OSICalculator`)
- `label` — отображаемое название
- `category` — категория (`system`, `utilities`, `games`)
- **`iconImg`** — PNG-иконка: `require('@/apps/system/OSINewApp/icon.png')`
- `icon` — эмодзи-иконка (запасной вариант)
- `iconclass` — *(устаревший)* CSS-классы Bootstrap Icons + градиент (`text-ico-tech`, `text-ico-purpure`…)
- `defWidth` / `defHeight` — стандартные размеры окна
- `isMaximized` — открывать ли окно развёрнутым
- `resizable` / `canMinimize` — параметры управления окном
- `showOnDesktop` / `showInStartMenu` / `deskContextMenu` — где отображать приложение
- `suppFormats` — поддерживаемые типы файлов (например `["audio"]`, `["image"]`) для ассоциаций в DirDigger
- **`loader`** — функция lazy-load компонента: `() => import('@/apps/system/...')`

Загрузка компонентов централизована в `appsConfig.getAppLoader(appName)`. Редактировать `SimpleWindow.vue` при добавлении нового приложения **не нужно**.

Подробно о lazy-load, кэше `asyncComponentCache` и сохранении state при перемещении окна: **[SimpleWindow-AsyncComponents.md](./SimpleWindow-AsyncComponents.md)**.

**Вспомогательные методы `appsConfig`:**
- `enrichApp(userApp)` / `enrichApps(userApps)` — дополняет записи из IndexedDB полями из конфига (в т.ч. `iconImg`), сохраняя пользовательские флаги `showOnDesktop` и др.

### os.js
Конфигурационный файл операционной системы с основными настройками:
- Имя системы (OSI)
- Версия
- Дата сборки
- Переводы названий версий на русский и английский

## Хранилища данных

### IndexedDB (`src/idb/db.js`)
Основное хранилище данных пользователя: учётные записи, окна, файлы (`dfiles`), уведомления. Используется Dexie.

Подробное руководство по версиям схемы, миграциям данных и API: **`src/idb/README.md`**.

Ключевые моменты:
- `usersTable.getbyId()` / `getAll()` возвращают экземпляры `User` с датами `createdAt`/`updatedAt` как объектами `Date`
- `usersTable.setDesktopWallpaper(userId, name)` — смена обоев **без перезаписи** списка окон в `systemconfig`
- `getIndexedDBStats()` — статистика БД для OSISettings (размер таблиц, квота origin)
- при удалении пользователя каскадно удаляются его записи в `dfiles`

### Pinia (`src/stores/`)
Активно используется store уведомлений (`notifications.js`). Остальное состояние (окна, пользователь) управляется через API `usersTable` и реактивные `ref` из `db.js`.

## Помощь в разработке

Проект использует Vue.js 3 (в основном Options API), Pinia (частично) и Dexie. Приложение построено как модульная система: каждый компонент и каждое приложение развиваются независимо, а регистрация новых программ выполняется через `applications.js`.

## Структура приложений

Все приложения находятся в директории `src/apps/` и организованы в следующую структуру:
- `system/` - системные приложения
- `utilities/` - служебные приложения
- `games/` - игровые приложения
- `learn/` - обучающие материалы

Каждое приложение имеет стандартную структуру:
- `.vue` файл с компонентом интерфейса
- `template.html` - шаблон HTML
- `style.css` - стили приложения
- `lang.js` - файл локализации (если требуется)
- **`icon.png`** - иконка приложения для рабочего стола, меню «Пуск» и таскбара

### Рабочий стол (DesktopArea)

- Ярлыки приложений заполняют столбец сверху вниз; при нехватке места автоматически переносятся **в следующий столбец справа** (`flex-direction: column` + `flex-wrap: wrap`)
- Смена обоев: `DesktopArea` предоставляет `changeWallpaper` через `provide`; запись в БД — `usersTable.setDesktopWallpaper()`

### OSISettings (кратко)

- Разделы: описание, учётные записи, оформление (обои), управление памятью
- localStorage: `JSH.browser.getLocalStorageUsage()`
- IndexedDB: `getIndexedDBStats()` (загрузка по переходу в раздел «Управление памятью»)
- Выход из учётной записи: `window.location.reload()` (возврат на экран авторизации)

## Как запустить проект

Для запуска проекта необходимо выполнить следующие шаги:

1. Установить зависимости: `npm install`
2. Запустить сервер разработки: `npm run serve`

## Предварительная настройка проекта

Проект требует установки следующих зависимостей:

- **Pinia** - для управления состоянием приложения:
  ```
  npm install pinia
  ```

- **BootstrapVue 3** (для Vue 3) - для UI компонентов:
  ```
  npm install bootstrap bootstrap-vue-3
  npm install bootstrap-icons
  ```

- **music-metadata** - необходим для работы с аудиофайлами в OSIMPlayer:
  ```
  npm install music-metadata
  ```

## Полезные команды

- Убить процессы на порту: `npx kill-port *порт*`
- Сборка проекта в папку docs (для размещения на GitLab Pages): `publicPath: process.env.NODE_ENV === "production" ? "/osi/" : "/", outputDir: "docs"`

## Дополнительная информация

Основные технологии и библиотеки проекта:
- Vue.js 3 (Options API)
- Pinia (уведомления) + Dexie / IndexedDB (основные данные)
- BootstrapVue 3 для UI компонентов
- Bootstrap Icons для иконок
- music-metadata — для работы с аудиофайлами в OSIMPlayer

## Документация для разработчика

### Создание своего приложения (пошагово)

1. Создайте директорию и файлы компонента в `src/apps/system/OSINewApp/`:
   ```
   apps/system/OSINewApp/
     ├── OSINewApp.vue     # Основной компонент
     ├── template.html     # HTML-шаблон
     ├── style.css         # Стили приложения
     ├── lang.js           # Локализация (по необходимости)
     └── icon.png          # Иконка 128×128 (круг, прозрачный фон)
   ```

2. Зарегистрируйте приложение в `src/config/applications.js` — добавьте экземпляр `OSIApp` **с полями `loader` и `iconImg`**:
   ```javascript
   new OSIApp({
       id: 'osinewapp',
       name: 'OSINewApp',
       label: 'Новое приложение',
       category: 'utilities',
       description: 'Краткое описание.',
       // iconclass: 'bi-stars text-ico-purpure',  // старый подход (опционально)
       iconImg: require('@/apps/system/OSINewApp/icon.png'),
       defWidth: 800,
       defHeight: 450,
       resizable: true,
       canMinimize: true,
       showOnDesktop: true,
       showInStartMenu: true,
       loader: () => import('@/apps/system/OSINewApp/OSINewApp.vue'),
   }),
   ```

3. Пересоберите или перезапустите dev-сервер (`npm run serve`).  
   `SimpleWindow` подхватит компонент автоматически через `appsConfig.getAppLoader()`.

4. В `OSINewApp.vue` объявите **стандартный контракт** props и emits (см. ниже) — иначе Vue будет предупреждать в консоли.

> **Важно:** путь в `loader` должен быть **статической строкой** (как в примере выше). Webpack (Vue CLI) использует его для code splitting. Динамический `import(переменная)` из конфига не поддерживается.

### Правила написания приложений

1. **Структура директории**:
   - Системные приложения размещаются в `src/apps/system/`
   - Имя папки, имя `.vue`-файла и поле `name` в конфиге должны совпадать (например `OSINewApp`)

2. **Регистрация в `applications.js`**:
   - Единственная точка регистрации нового приложения
   - Обязательные поля: `id`, `name`, `label`, `loader`
   - Функции (`loader`) в IndexedDB не сохраняются — в БД попадают только примитивные метаданные (это уже учтено в `getDefaultApps()`)

3. **Структура Vue-компонента**:
   - Используется Options API (как в существующих приложениях)
   - HTML — в `template.html`, стили — в `style.css`
   - Компонент должен быть самодостаточным внутри окна OSI

4. **Контракт с `SimpleWindow` (обязательно для всех оконных приложений)**:

   `SimpleWindow` передаёт **одинаковый набор** props и слушает **одинаковый набор** событий у любого приложения в окне. Даже если приложение не открывает файлы и не эмитит события — их нужно **объявить** в компоненте, чтобы Vue не выдавал предупреждения в dev-режиме.

   **Props:**
   - `windowId` — ID окна
   - `USERID` — ID текущего пользователя
   - `fileData`, `fileId`, `fileName`, `fileType` — данные файла (при открытии из DirDigger; иначе пустые значения по умолчанию)

   **Emits:**
   - `startapp` — открыть другое приложение с файлом (например, «открыть в Picta»)
   - `error` — сообщить об ошибке
   - `notification` — отправить уведомление в систему

   Пример (эталон для нового приложения):
   ```javascript
   props: {
       windowId: { type: String, required: true },
       USERID: { type: Number, default: 0 },
       fileData: { type: Object, default: null },
       fileId: { type: [String, Number], default: null },
       fileName: { type: String, default: '' },
       fileType: { type: String, default: '' },
   },

   emits: ['startapp', 'error', 'notification'],
   ```

   Использование file-props — по необходимости (см. `OSIMPlayer`). Остальные приложения могут их не использовать, но объявлять обязаны.

5. **Обработка событий на уровне ОС (`App.vue`)**:
   - События из приложения проходят цепочку: приложение → `SimpleWindow` → `App.vue`
   - В `App.vue` подключены `handleError` и `handleNotification` — пока **заглушки** (TODO: `notificationService`, toast)
   - Реальный пример эмита из приложения: `OSIDirDigger` (`$emit('startapp', …)`, `$emit('error', …)`, `$emit('notification', …)`)

6. **Интеграция с системой**:
   - Меню «Пуск» и рабочий стол берут список из `appsConfig` по флагам `showInStartMenu`, `showOnDesktop`
   - Записи пользователя из IDB дополняются через `appsConfig.enrichApps()` (иконки и метаданные из конфига)
   - Иконки отображаются компонентом `AppIcon` в `DesktopArea`, `TaskBar`, `OSIAppManager`, `OSIDirDigger`
   - Запуск приложения выполняет `DesktopArea.launchApp()`
   - Состояние окон и пользовательские данные хранятся в IndexedDB (`usersTable`, `dFiles`)

7. **Система управления окнами**:
   - Все приложения открываются внутри `SimpleWindow` (заголовок, кнопки, drag/resize)
   - Параметры окна (`defWidth`, `isMaximized`, `resizable` и т.д.) задаются в `applications.js`
   - Позиция и z-index сохраняются в `usersTable` при перемещении и активации
   - Компонент приложения загружается через **кэшированный** `defineAsyncComponent` — экземпляр не должен перемонтироваться при drag (см. [SimpleWindow-AsyncComponents.md](./SimpleWindow-AsyncComponents.md))

8. **Сохранение состояния приложения**:
   - Рекомендуется хранить состояние в IndexedDB через `usersTable` / `dFiles`
   - Пример: `OSICalculator` сохраняет выражение и историю в `systemdata.windowsstates`
   - Не полагайтесь на перемонтирование как на «сброс» — кэш в `SimpleWindow` как раз его предотвращает

9. **Локализация**:
   - Файл `lang.js` с объектом `LangPack` (ключи `ru`, `en`)
   - Подключение: `import { LangPack } from './lang'`

10. **Работа с файлами**:
    - Для приложений, открывающих файлы, укажите `suppFormats` в конфиге
    - DirDigger использует этот список для предложения «Открыть с помощью…»
    - При открытии файла данные попадают в окно через props `fileData` / `fileId` / `fileName` / `fileType`
    - `fileType` в props — часто **категория** dFiles (`text`, `image`), не MIME; при догрузке используйте `dFiles.getInfo(id)` (подробнее в [SimpleWindow-AsyncComponents.md](./SimpleWindow-AsyncComponents.md))

## Библиотека вспомогательных функций

Проект использует централизованную библиотеку `src/core/helpers.js` для предоставления общих утилит и функциональности. Она экспортирует объект JSH с следующими категориями:

### 1. Браузерные функции
- `detectBrowser()` - определение типа и версии браузера пользователя
- `getLocalStorageUsage()` - анализ использования localStorage, включая объем данных по записям

### 2. Локализация (языковые данные)
- Системный объект `lang` с переводами для различных категорий приложений:
  - utilities (утилиты)
  - system (системные)
  - games (игры)

### 3. Системные функции
- `getImageList()` - получение списка всех изображений из директории `src/assets/wallpapers/`
- `getAvatarsList()` - получение списка аватаров из директории `src/assets/avatars/`

### Примеры подключения и использования

**Подключение библиотеки:**
```javascript
// В компоненте Vue или другом JS файле
import { JSH } from '@/core/helpers.js';
```

**Использование функций:**

1. Определение браузера:
```javascript
const browser = JSH.browser.detectBrowser();
console.log(`Браузер: ${browser.name}, Версия: ${browser.version}`);
```

2. Анализ localStorage:
```javascript
const usage = JSH.browser.getLocalStorageUsage();
if (usage) {
    console.log(`Использовано ${usage.total.kilobytes} KB из 5 MB`);
}
```

3. Получение списка изображений:
```javascript
// Для получения обоев рабочего стола
const wallpapers = JSH.system.getImageList();

// Для получения аватаров пользователей
const avatars = JSH.system.getAvatarsList();
```

4. Использование локализации (пример):
```javascript
// Получение перевода по ключу
const categoryLabel = JSH.lang.ru.cattype_system; // "Система"
```

Эта библиотека упрощает доступ к часто используемым функциям и позволяет использовать общие механизмы в разных частях приложения без дублирования кода.

## Технологии проекта

- Vue.js 3 (Options API)
- Pinia + Dexie (IndexedDB)
- CSS для стилизации
- Bootstrap 5 / BootstrapVue 3
- Персистентность: IndexedDB (`src/idb/db.js`, см. `src/idb/README.md`)
