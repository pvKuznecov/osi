# IndexedDB в OSI (`src/idb/`)

Локальное хранилище OSI построено на **Dexie** (обёртка над IndexedDB браузера).  
Весь код сосредоточен в `db.js`. Имя базы: **`OSIDB`**.

При старте приложения (`main.js` → `initDatabase()`) база открывается, при необходимости создаётся пользователь по умолчанию и запускаются **миграции данных**.

---

## Два независимых уровня версий

В проекте **две разные «версии»**. Их нельзя путать.

| Константа | Где | Что контролирует |
|-----------|-----|------------------|
| `db_version` | `db.js` | **Схема Dexie**: таблицы, индексы (`users`, `dfiles`) |
| `CURRENT_DATA_VERSION` | `db.js` | **Структура JSON внутри** записей `users` (apps, окна, уведомления…) |

### `db_version` (схема Dexie)

```js
const db_version = 1;

DB.version(db_version).stores({
    users: '++id, name, login, ...',
    dfiles: '++id, name, userid, parentid, [userid+parentid], ...',
});
```

Dexie при повышении `db_version` **автоматически** обновляет индексы и таблицы при следующем открытии БД у пользователя.

**Не мигрирует автоматически:** содержимое вложенных объектов (`user.apps`, `user.systemconfig.windows` и т.д.).

### `CURRENT_DATA_VERSION` (миграции данных)

```js
const CURRENT_DATA_VERSION = 1;
```

Версия хранится **у каждого пользователя**:

```
user.systemdata.migrationVersion
```

Функция `runDataMigrations()` в `initDatabase()` проходит всех пользователей и применяет недостающие шаги миграции.

---

## Структура данных

### Таблица `users` (документ пользователя)

```
User
├── login, name, password
├── apps[]                    ← копия метаданных из applications.js + пользовательские флаги (в т.ч. iconImg как URL)
├── config                    ← avatar и др.
├── notifs[]                  ← уведомления
├── systemconfig
│   ├── desktopWallpaper
│   ├── windows[]             ← открытые окна
│   └── activeWindowId
└── systemdata
    ├── windowsstates{}       ← состояние UI приложений по windowId
    └── migrationVersion      ← версия миграции данных
```

### Таблица `dfiles` (виртуальная файловая система)

Файлы и папки пользователя. API: `dFiles` (`getRoot`, `addFile`, `delete`…).  
Миграции `dfiles` пока не автоматизированы — при изменении структуры файлов нужна отдельная логика.

---

## Как запускаются миграции

```
main.js
  └── initDatabase()
        ├── [если users пуста] создать default user
        └── runDataMigrations()   ← всегда, для всех существующих пользователей
```

Пользователю **ничего делать не нужно** — достаточно обновить страницу после деплоя новой версии сайта.

---

## Текущие миграции данных

### Миграция v1 (`migrationVersion` 0 → 1)

Применяется, если у пользователя нет `systemdata.migrationVersion` или она `< 1`.

| Действие | Функция | Описание |
|----------|---------|----------|
| Синхронизация приложений | `mergeUserApps()` | Добавляет в `user.apps` приложения из `applications.js`, которых нет у пользователя. Пользовательские `showOnDesktop`, `showInStartMenu` и др. **сохраняются** |
| Нормализация окон | `normalizeSystemConfig()` | Дополняет окна полями `zIndex`, `fileId`, `fileName`, `fileType`, `fileData`, `isMinimized`, `isMaximized` |

Новые пользователи создаются сразу с `migrationVersion: CURRENT_DATA_VERSION` через `Def_systemdata`.

---

## Как добавить миграцию данных (v2, v3…)

### Шаг 1. Увеличить `CURRENT_DATA_VERSION`

```js
const CURRENT_DATA_VERSION = 2;  // было 1
```

### Шаг 2. Добавить ветку в `runDataMigrations()`

В цикле `while (version < CURRENT_DATA_VERSION)` после блока `if (nextVersion === 1)`:

```js
if (nextVersion === 2) {
    // Пример: переименование поля в уведомлениях
    updates.notifs = (user.notifs || []).map(n => ({
        ...n,
        pinned: n.pinned ?? false,
    }));
}
```

Каждый шаг увеличивает `systemdata.migrationVersion` на 1.  
Миграции выполняются **последовательно**: 0→1→2, даже если пользователь «отстал» на несколько версий.

### Шаг 3. Обновить дефолты для новых пользователей (при необходимости)

Если новое поле должно быть у всех с нуля — добавьте его в `Def_systemdata`, `Def_notifs`, класс `User` или в создание default user в `initDatabase()`.

### Шаг 4. Проверить вручную

1. Откройте DevTools → Application → IndexedDB → `OSIDB` → `users`.
2. Запомните `systemdata.migrationVersion`.
3. Понизьте версию вручную (или удалите поле) для теста.
4. Перезагрузите страницу — версия должна обновиться, данные — по логике миграции.

---

## Как изменить схему Dexie (новая таблица / индекс)

Используйте, когда нужно:
- добавить таблицу;
- добавить/убрать индекс в `.stores()`;
- изменить состав индексируемых полей на верхнем уровне записи.

### Шаг 1. Не менять старую версию — добавить новую

Dexie требует **цепочку версий**. Старую `DB.version(1)` оставляем, добавляем `DB.version(2)`:

```js
const db_version = 2;  // актуальная версия

DB.version(1).stores({
    users: '...',
    dfiles: '...',
});

DB.version(2).stores({
    users: '...',           // новая схема users (если изменилась)
    dfiles: '...',
    sessions: '++id, userId', // пример новой таблицы
}).upgrade(async (tx) => {
    // Перенос/дополнение данных при переходе 1 → 2
    const users = await tx.users.toArray();
    await Promise.all(users.map(user =>
        tx.users.update(user.id, {
            lastLogin: user.lastLogin ?? null,
            updatedAt: new Date(),
        })
    ));
});
```

### Шаг 2. `.upgrade()` обязателен, если нужно преобразовать данные

Без `.upgrade()` Dexie создаст таблицы/индексы, но **старые записи не изменятся**.

### Шаг 3. Миграции Dexie и данных — можно комбинировать

- **Dexie v2** — новая таблица `sessions`.
- **DATA v3** — новое поле внутри `user.notifs`.

Это независимые счётчики. Меняйте каждый только когда нужно.

---

## Когда что использовать

| Изменение | Что поднимать |
|-----------|----------------|
| Новое приложение в `applications.js` | `CURRENT_DATA_VERSION` + `mergeUserApps` (уже в v1) или новая миграция |
| Новое поле в объекте окна | `CURRENT_DATA_VERSION` + миграция или `normalizeSystemConfig` |
| Новый формат `windowsstates` | `CURRENT_DATA_VERSION` + миграция |
| Новая таблица IndexedDB | `db_version` + `DB.version(N).upgrade()` |
| Новый индекс для поиска по `dfiles` | `db_version` |
| Переименование поля в JSON user | `CURRENT_DATA_VERSION` + миграция |

---

## Что мигрируется автоматически, а что нет

| Ситуация | Автоматически? |
|----------|----------------|
| Первый визит пользователя | Да — создаётся default user |
| Returning user, добавили приложение в конфиг | Да — через `mergeUserApps` (v1+) |
| Returning user, новое поле с default в коде (`w.zIndex ?? 100`) | Частично — код терпит отсутствие, миграция не обязательна |
| Переименование/удаление поля | Нет — нужна миграция |
| Новая таблица Dexie | Схема да, данные в ней — только через `.upgrade()` |
| Файлы в `dfiles` | Нет — отдельная логика |

---

## Публичный API (импорты из `@/idb/db`)

| Экспорт | Назначение |
|---------|------------|
| `initDatabase()` | Старт БД + миграции |
| `clearDatabase()` | Очистка `users` и `dfiles` |
| `usersTable` | Пользователи, окна, уведомления, состояния (`delete` также удаляет все `dfiles` пользователя) |
| `usersTable.setDesktopWallpaper(userId, name)` | Смена обоев без затирания `systemconfig.windows` |
| `getIndexedDBStats()` | Статистика OSIDB для экрана настроек |
| `dFiles` | Виртуальная ФС |
| `IDBWindows`, `activeWindowId` | Реактивное состояние окон (Vue `ref`) |
| `CURRENT_DATA_VERSION` | Актуальная версия миграции данных |
| `DB` | Экземпляр Dexie (для отладки) |
| Классы `User`, `DFile`, `Window`, `Notification` | Модели |

---

## Рекомендации

1. **Аддитивные изменения** (новое поле с default) — можно обойтись кодом `?? default`, но для списков (`apps`) лучше миграция.
2. **Одна миграция — одна задача** — проще отлаживать и откатывать логику.
3. **Не удаляйте старые `DB.version(N)`** — Dexie строит цепочку апгрейдов.
4. **Тестируйте на копии данных** — в DevTools можно экспортировать/импортировать IndexedDB или работать с вторым пользователем.
5. **Не храните большие blob в `systemconfig.windows`** — файлы должны жить в `dfiles`, в окне — только `fileId`.
6. При крупном рефакторинге см. план разбиения `db.js` в обсуждении с агентом (папки `repositories/`, `models/`).

---

## Чеклист перед релизом с изменением данных

- [ ] Нужна ли миграция данных? → поднять `CURRENT_DATA_VERSION`, дописать ветку в `runDataMigrations`
- [ ] Нужна ли миграция схемы? → поднять `db_version`, добавить `DB.version(N).upgrade()`
- [ ] Обновлены дефолты для новых пользователей (`Def_*`, `initDatabase`)
- [ ] Проверено на пользователе со старой `migrationVersion` (0 или отсутствует)
- [ ] Проверено на новом пользователе
- [ ] При необходимости — обновить `DevelopDocumentations/Documentation.md`

---

## Ссылки

- [Dexie: Versioning](https://dexie.org/docs/Tutorial/Design#database-versioning)
- [Dexie: upgrade()](https://dexie.org/docs/Version/Version.upgrade())
- Конфиг приложений: `src/config/applications.js`
- Версия OSI: `src/config/os.js`
- IndexedDB (миграции, API): `src/idb/README.md`
- Документация разработчика: `DevelopDocumentations/Documentation.md`
