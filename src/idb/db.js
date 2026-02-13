import Dexie from "dexie";

import { appsConfig } from "@/config/applications";

// конфигураторы БД
const db_name = 'OSIDB';
const db_version = 1;

// инициализация БД
const DB = new Dexie(db_name);

// const defaultApps = await appsConfig.getAllApps();
// Функция для получения упрощенных объектов приложений
async function getDefaultApps() {
    const apps = await appsConfig.getAllApps();
    
    // Преобразуем каждый объект приложения в упрощенную версию
    return apps.map(app => ({
        id: app.id,
        name: app.name,
        label: app.label,
        category: app.category || 'Other',
        icon: app.icon || '',
        iconclass: app.iconclass || '',
        description: app.description || '',
        defWidth: app.defWidth || false,
        defHeight: app.defHeight || false,
        isMaximized: app.isMaximized || false,
        resizable: app.resizable || false,
        canMinimize: app.canMinimize || false,
        showOnDesktop: app.showOnDesktop !== undefined ? app.showOnDesktop : true,
        showInStartMenu: app.showInStartMenu !== undefined ? app.showInStartMenu : true,
        // Сохраняем только базовые данные, удаляем функции и компоненты
        path: app.path || '',
        component: app.component ? app.component.name || 'Component' : 'Component',
        // Добавляем только примитивные типы данных
        data: app.data && typeof app.data === 'object' ? JSON.parse(JSON.stringify(app.data)) : {}        
    }));
}

// описание схемы БД
DB.version(db_version).stores({
    users: '++id, name, login, password, apps, data, config, systemСonfig, createdAt, updatedAt',
    settings: '++id, key, value, updatedAt',
});

const Def_userConfig = {
    avatar: "cat.jpg"
};

const Def_userSystemconfig = {
    desktopWallpaper: "nwall.jpg",
    windows: {},
};

// -=-=-=-=-=-=-Описание классов моделей-=-=-=-=-=-=-
export class User {
    constructor(data = {}) {
        this.login = data.login || 'user';
        this.name = data.name || 'User';
        this.password = data.password || '';    //ПРОДУМАТЬ РЕАЛЬНУЮ СХЕМУ ЗАЩИТЫ
        this.apps = data.apps || [];
        this.data = data.data || {};
        this.config = data.config || Def_userConfig;
        this.systemconfig = data.systemconfig || Def_userSystemconfig
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();

        // автоматическое присваение id (вариант для "совместимости")
        if (data.id) {
            this.id = data.id;
        }
    }
}

export class Setting {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.updatedAt = new Date();
    }
}


// -=-=-=-=-=-=-Основные операции CRUD-=-=-=-=-=-=-
export const usersTable = {
    // обновление|сохранение учетной записи
    async save(userData) {
        try {
            const NUser = new User(userData);
            console.log('NUser', NUser);

            if (NUser.id) {
                // Преобразуем объект User в простой объект для IndexedDB
                const userForDB = this.prepareUserForDB(NUser);
                console.log('userForDB', userForDB);

                userForDB.updatedAt = new Date();
                await DB.users.update(userForDB.id, userForDB);

                return NUser;
            } else {
                // зачищаем id в NUser (автоматически сгенерирует)
                delete NUser.id;

                NUser.apps = await getDefaultApps();
                NUser.createdAt = new Date();
                NUser.updatedAt = new Date();

                console.log('NUser-2', NUser);

                return await DB.users.add(NUser);
            }
        } catch (error) {
            console.error('Error operation (users; save):', error);            
            throw new Error(`Failed to save user: ${error.message}`);
        }
    },

    prepareUserForDB(user) {
        // Функция для проверки сериализуемости
        const isSerializable = (value) => {
            if (value === null || value === undefined) return true;
            if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return true;
            if (value instanceof Date) return true;
            
            try {
                JSON.stringify(value);
                return true;
            } catch {
                return false;
            }
        };

        // Функция для создания безопасной копии
        const createSafeCopy = (value) => {
            if (!isSerializable(value)) return undefined;
            
            if (Array.isArray(value)) return value.map(createSafeCopy).filter(item => item !== undefined);
            
            if (value && typeof value === 'object' && !(value instanceof Date)) {
                const result = {};
                Object.entries(value).forEach(([key, val]) => {
                    if (typeof val !== 'function' && isSerializable(val)) result[key] = createSafeCopy(val);
                });
                return result;
            }
            
            return value;
        };

        // Создаем безопасный объект для сохранения
        return {
            id: user.id,
            login: user.login || '',
            name: user.name || '',
            password: user.password || '',
            apps: Array.isArray(user.apps) ? user.apps.map(app => createSafeCopy(app) || {}).filter(app => Object.keys(app).length > 0) : [],
            data: createSafeCopy(user.data) || {},
            config: createSafeCopy(user.config) || { avatar: "cat.jpg" },
            systemconfig: createSafeCopy(user.systemconfig) || { desktopWallpaper: "nwall.jpg" },
            createdAt: user.createdAt instanceof Date ? user.createdAt : (user.createdAt ? new Date(user.createdAt) : new Date()),
            updatedAt: user.updatedAt instanceof Date ? user.updatedAt : (user.updatedAt ? new Date(user.updatedAt) : new Date())
        };
    },

    // поиск учетной записи по id
    async getbyId(id) {
        try {
            return await DB.users.get(id);
        } catch (error) {
            console.error('Error operation (users; getbyId):', error);            
            throw new Error(`Failed to get user by id ${id}: ${error.message}`);
        }
    },

    // поиск учетной записи по login
    async getbyLogin(login) {
        try {
            return await DB.users.where('login').equals(login).first();
        } catch (error) {
            console.error('Error operation (users; getbyLogin):', error);
            throw new Error(`Failed to get user by login ${login}: ${error.message}`);
        }
    },

    // получить массив всех учетных записей
    async getAll() {
        try {
            return await DB.users.toArray();
        } catch (error) {
            console.error('Error operation (users; getAll):', error);
            throw new Error(`Failed to get all users`);
        }
    },

    // получить массив apps учетной записи
    async getApps(id) {
        try {
            const USER = await DB.users.get(id);
            if (USER && USER.apps) {
                return USER.apps;
            } else {
                console.error('Error operation (users; getApps).');
            }
        } catch (error) {
            console.error('Error operation (users; getApps):', error);            
            throw new Error(`Failed to get user by id ${id}: ${error.message}`);
        }
    },

    // получить config пользователя по id
    async getConfig(id) {
        try {
            const USER = await DB.users.get(id);
            if (USER && USER.config) {
                return USER.config;
            } else {
                console.error('Error operation (users; getConfig).');
            }
        } catch (error) {
            console.error('Error operation (users; getConfig):', error);            
            throw new Error(`Failed to get user by id ${id}: ${error.message}`);
        }
    },

    // получить systemconfig пользователя по id
    async getSConfig(id) {
        try {
            const USER = await DB.users.get(id);
            if (USER && USER.systemconfig) {
                return USER.systemconfig;
            } else {
                console.error('Error operation (users; getSConfig).');
            }
        } catch (error) {
            console.error('Error operation (users; getSConfig):', error);            
            throw new Error(`Failed to get user by id ${id}: ${error.message}`);
        }
    },

    // обновление конфигуратора приложений в учетной записи
    async updateAppSetting(userId, appId, key, value) {
        try {
            // Получаем пользователя
            const user = await DB.users.get(userId);
            
            if (!user) {
                throw new Error(`Пользователь с ID ${userId} не найден`);
            }
            
            // Находим приложение в массиве apps
            const appIndex = user.apps.findIndex(app => app.id === appId);
            if (appIndex === -1) {
                throw new Error(`Приложение с ID ${appId} не найдено у пользователя ${userId}`);
            }
            
            // Обновляем значение ключа
            // Используем $set для реактивного обновления, если это необходимо
            const updatedApps = [...user.apps];
            
            updatedApps[appIndex] = {
                ...updatedApps[appIndex],
                [key]: value
            };
            
            // Сохраняем обновленный массив приложений
            await DB.users.update(userId, {
                apps: updatedApps,
                updatedAt: new Date()
            });
            
            // console.log(`Обновлено: пользователь ${userId}, приложение ${appId}, ${key} = ${value}`);
            return { success: true, userId, appId, key, value };
            
        } catch (error) {
            console.error('Error operation (users; updateAppSetting):', error);
            throw new Error(`Failed to update app setting: ${error.message}`);
        }
    },

    // удалить учетную запись
    async delete(id) {
        try {
            return await DB.users.delete(id);
        } catch (error) {
            console.error('Error operation (users; delete):', error);
            throw new Error(`Failed to delete user ${id}: ${error.message}`);
        }
    },

    // кол-во учетных записей
    async count() {
        try {
            return await DB.users.count();
        } catch (error) {
            console.error('Error operation (users; count):', error);
            throw new Error(`Failed to count users`);
        }
    },

    async search(query) {
        try {
            return await DB.users
                .filter(user =>
                    user.login.toLowerCase().includes(query.toLowerCase()) ||
                    JSON.stringify(user.data).toLowerCase().includes(query.toLowerCase())
                ).toArray();
        } catch (error) {
            console.error('Error operation (users; search');
            throw new Error(`Search failed: ${error.message}`);
        }
    },

    // получить объект "окна" в SConfig пользователя (по его id)
    async getSConfig_windows(userId) {
        try {
            const FindUser = await this.getbyId(userId);
            const FindSConfig = (FindUser && FindUser.systemconfig) ? FindUser.systemconfig : false;
            
            return (FindSConfig && FindSConfig.windows) ? FindSConfig.windows : false;
        } catch (error) {
            console.error('Error operation(users; getSConfig_windows).');
            throw new Error(`Failed: ${error.message}`);
        }
    },
    // создание нового "окна" в SConfig пользователя
    async addSConfig_newWindow(userId, appData) {
        const newId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            let FindUser = await this.getbyId(userId);

            if (FindUser) {
                let nSystemConfig = (FindUser.systemconfig) ? FindUser.systemconfig : {windows: {}};
                let nWindows = (nSystemConfig && nSystemConfig.windows) ? nSystemConfig.windows : false;
                nWindows[newId] = { ...appData };

                if (nSystemConfig && nWindows) {
                    nSystemConfig.windows = nWindows;
                    FindUser.systemconfig = nSystemConfig;
                    
                    const userForDB = this.prepareUserForDB(FindUser);
                    userForDB.updatedAt = new Date();

                    await DB.users.update(userForDB.id, userForDB);

                    return true;
                } else {
                    console.error('Error operation(users; addSConfig_newWindow; c:1).');
                    return false;
                }
            } else {
                console.error('Error operation(users; addSConfig_newWindow; c:2).');
                return false;
            }

        } catch (error) {
            console.error('Error operation(users; addSConfig_newWindow).');
            throw new Error(`Failed: ${error.message}`);
        }
    },
    // поиск "окна" в SConfig пользователя по его id
    async getSConfig_window_byId(userId, windowId) {
        try {
            const FindUser = await this.getbyId(userId);
            const FindSConfig = (FindUser && FindUser.systemconfig) ? FindUser.systemconfig : false;
            const FindWindows = (FindSConfig && FindSConfig.windows) ? FindSConfig.windows : false;

            return (FindWindows && Object.keys(FindWindows).includes(windowId)) ? FindWindows[windowId] : false;
        } catch (error) {
            console.error('Error operation(users; getSConfig_window_byId).');
            throw new Error(`Failed: ${error.message}`);
        }
    },
    // поиск "окна" в SConfig пользователя по данным приложения
    async getSConfig_window_byConfig(userId, appData) {
        try {
            const FindWindows = await this.getSConfig_windows(userId);
            
            if (FindWindows) {
                let res = false;

                Object.keys(FindWindows).forEach(function(key) {
                    if (
                        appData.id
                        && FindWindows[key].id === appData.id
                        && appData.name
                        && FindWindows[key].name === appData.name
                    ) {
                        res = FindWindows[key];
                    }
                });

                return res;
            } else { return false; }
        } catch (error) {
            console.error('Error operation(users; getSConfig_window_byConfig).');
            throw new Error(`Failed: ${error.message}`);
        }
    },
};

export const settingsTable = {
    // сохранение настройки
    async save(key, value) {
        try {
            const existing = await DB.settings.where('key').equals(key).first();

            if (existing) {
                await DB.settings.update(existing.id, {
                    value: value,
                    updatedAt: new Date(),
                });
                return existing.id;
            } else {
                return await DB.settings.add(new Setting(key, value));
            }
        } catch (error) {
            console.error('Error operation (settings; save');
            throw new Error(`Failed to save setting ${key}: ${error.message}`);
        }
    },

    // получить настройку
    async get(key, defaultVal = null) {
        try {
            const findSetting = DB.settings.where('key').equals(key).first();

            return findSetting ? findSetting.value : defaultVal;
        } catch (error) {
            console.error('Error operation (settings; get');
            throw new Error(`Failed to get setting ${key}: ${error.message}`);
        }
    },

    // удалить настройку
    async delete(key) {
        try {
            const findSetting = await DB.settings.where('key').equals(key).first();

            if (findSetting) {
                return await DB.settings.delete(findSetting.id);
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error operation (settings; delete');
            throw new Error(`Failed to delete setting ${key}: ${error.message}`);
        }
    },

    // получить все настройки
    async getAll() {
        try {
            return await DB.settings.toArray();
        } catch (error) {
            console.error('Error operation (settings; getAll');
            throw new Error(`Failed to get all settings`);
        }
    },
};


// -=-=-=-=-=-=-Служебное-=-=-=-=-=-=-

// инициализация БД с тестовыми данными
export async function initDatabase() {
    try {
        // проверка, пустая ли база
        const userCount = await usersTable.count();

        if (userCount === 0) {
            // Загружаем apps асинхронно
            const defaultAppsList = await getDefaultApps();

            // создание базового пользователя
            const defaultUser = new User({
                login: 'user',
                password: '',
                apps: defaultAppsList,
                data: {},
                config: {
                    avatar: 'robot.jpg',
                },
                systemconfig: {
                    desktopWallpaper: "nwall.jpg"
                },
            });

            await usersTable.save(defaultUser);
            console.log('Default user created.');
        }

        // инициализация базовых настроек 
        const defaultSettings = [
            ['theme', 'dark'],
            ['avatarDefault', 'cat'],
        ];

        for (const [key, value] of defaultSettings) {
            const existing = await settingsTable.get(key);

            if (existing === null) {
                await settingsTable.set(key, value);
            }
        }

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing DB:', error);

        throw error;
    }    
}

/**
 * Очистка базы данных (осторожно!)
 */
export async function clearDatabase() {
    try {
        await Promise.all([
            DB.users.clear(),
            DB.settings.clear()
        ]);
        console.log('Database cleared');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

// ==================== МИГРАЦИИ ====================

// Пример добавления миграции при увеличении версии
// DB.version(2).stores({
//     users: '++id, login, password, apps, data, config, systemConfig, createdAt, updatedAt, lastLogin',
//     settings: '++id, key, value, updatedAt',
//     sessions: '++id, userId, token, expiresAt, createdAt' // Новая таблица
// }).upgrade(async (tx) => {
//     // Добавляем поле lastLogin к существующим пользователям
//     const users = await tx.users.toArray();
//     await Promise.all(
//         users.map(user => 
//             tx.users.update(user.id, { 
//                 lastLogin: null,
//                 updatedAt: new Date() 
//             })
//         )
//     );
    
//     console.log('Migration to version 2 completed');
// });

export { DB };

export default {
    DB,
    User,
    usersTable,
    settingsTable,
    initDatabase,
    clearDatabase
};

