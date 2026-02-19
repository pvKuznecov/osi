import Dexie from "dexie";
import { ref } from "vue";
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
        showOnDesktop: app.showOnDesktop || false,
        showInStartMenu: app.showInStartMenu || false,
        // Сохраняем только базовые данные, удаляем функции и компоненты
        path: app.path || '',
        component: (app.component && app.component.name) ? app.component.name : 'Component',
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
    windows: [],
    activeWindowId: null,
};

let nextZIndex = 100;
const IDBWindows = ref([]);
const activeWindowId = ref(null);

function getRandomPosPixel() {
    const min = Math.ceil(50); // Округляем минимум вверх
    const max = Math.floor(200); // Округляем максимум вниз

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// -=-=-=-=-=-=-Описание классов моделей-=-=-=-=-=-=-
export class User {
    constructor(data = {}) {
        this.login = data.login || 'user';
        this.name = data.name || 'User';
        this.password = data.password || '';    //TODO ПРОДУМАТЬ РЕАЛЬНУЮ СХЕМУ ЗАЩИТЫ
        this.apps = data.apps || [];
        this.data = data.data || {};
        this.config = data.config || Def_userConfig;
        this.systemconfig = data.systemconfig || Def_userSystemconfig
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        // автоматическое присваение id (вариант для "совместимости")
        if (data.id) this.id = data.id;
    }
}

export class Setting {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.updatedAt = new Date();
    }
}

export class Window {
    constructor(data = {}) {
        this.id = (data.id) ? data.id : Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.canMinimize = data.canMinimize || false;
        this.category = data.category || 'other';
        this.defHeight = data.defHeight || 400;
        this.defWidth = data.defWidth || 850;
        this.description = data.description || '';
        this.icon = data.icon || '';
        this.iconclass = data.iconclass || '';
        this.isMaximized = data.isMaximized || false;
        this.label = data.label || 'Unknown';
        this.name = data.name || "Unknown name";
        this.resizable = data.resizable || false;
        this.showInStartMenu = data.showInStartMenu || false;
        this.showOnDesktop = data.showOnDesktop || false;
        this.zIndex = data.zIndex || nextZIndex++;
        this.positionx = data.positionx || getRandomPosPixel();
        this.positiony = data.positiony || getRandomPosPixel();
    }
}

// -=-=-=-=-=-=-Основные операции CRUD-=-=-=-=-=-=-
export const usersTable = {
    // обновление|сохранение учетной записи
    async save(userData) {
        try {
            const NUser = new User(userData);

            if (NUser.id) {
                // Преобразуем объект User в простой объект для IndexedDB
                const userForDB = this.prepareUserForDB(NUser);

                userForDB.updatedAt = new Date();
                await DB.users.update(userForDB.id, userForDB);

                return NUser;
            } else {
                // зачищаем id в NUser (автоматически сгенерирует)
                delete NUser.id;

                NUser.apps = await getDefaultApps();
                NUser.createdAt = new Date();
                NUser.updatedAt = new Date();

                return await DB.users.add(NUser);
            }
        } catch (error) {
            console.error('Error operation (users; save):', error);            
            throw new Error(`Failed to save user: ${error.message}`);
        }
    },

    // Функция для проверки сериализуемости
    isSerializable(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return true;
        if (value instanceof Date) return true;
        
        try {
            JSON.stringify(value);
            return true;
        } catch {
            return false;
        }
    },

    // Функция для создания безопасной копии
    createSafeCopy(value) {
        const self = this;
        
        // Базовая проверка на null/undefined
        if (value === null || value === undefined) return undefined;
        
        // Проверка сериализуемости
        if (!this.isSerializable(value)) return undefined;
        
        // Примитивные типы возвращаем как есть
        if (typeof value !== 'object' || value instanceof Date) return value;
        
        // Обработка массивов
        if (Array.isArray(value)) {
            return value
                .map(item => self.createSafeCopy(item))
                .filter(item => item !== undefined);
        }
        
        // Обработка объектов
        const result = {};
        Object.entries(value).forEach(([key, val]) => {
            // Пропускаем функции
            if (typeof val === 'function') return;
            
            // Проверяем сериализуемость значения
            if (self.isSerializable(val)) {
                const copied = self.createSafeCopy(val);
                if (copied !== undefined) {
                    result[key] = copied;
                }
            }
        });
        
        return result;
    },

    prepareUserForDB(user) {
        // Создаем безопасный объект для сохранения
        const self = this;
        
        return {
            id: user.id,
            login: user.login || '',
            name: user.name || '',
            password: user.password || '',
            apps: Array.isArray(user.apps) 
                ? user.apps
                    .map(app => self.createSafeCopy(app))
                    .filter(app => app && Object.keys(app).length > 0) 
                : [],
            data: this.createSafeCopy(user.data) || {},
            config: this.createSafeCopy(user.config) || { avatar: "cat.jpg" },
            systemconfig: this.createSafeCopy(user.systemconfig) || Def_userSystemconfig,
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
        if (!userId) throw new Error('User ID required');
        
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

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    windows: {
        async reupdate(userId) {
            if (!userId) throw new Error('User ID required');

            try {
                const FindWindows = await this.windows_getAll(userId);
                
                // Убедимся, что у всех окон есть zIndex
                const windowsWithZIndex = FindWindows.map(w => ({
                    ...w,
                    zIndex: w.zIndex || 100
                }));
                
                IDBWindows.value = windowsWithZIndex;
                
                // Обновляем activeWindowId
                const user = await DB.users.get(userId);

                if (user && user.systemconfig) activeWindowId.value = user.systemconfig.activeWindowId;
                
                return { success: true, userId };
            } catch (error) {
                console.error('Failed to reupdate windows:', error);
                throw new Error(`Failed to reupdate windows: ${error.message}`);
            }
        },

        // создание нового окна с обновлением данных
        async create(userId, appData) {
            // валидация
            if (!appData.name) throw new Error('App name required!');

            // Используем существующий id или создаем новый
            const windowId = appData.id || Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            try {                
                // Получаем текущие окна из БД
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                const currentWindows = user?.systemconfig?.windows || [];
                
                // Проверяем, существует ли уже окно с таким ID
                const existingWindowIndex = currentWindows.findIndex(w => w.id === windowId);
                
                let newWindows;
                let targetWindow;
                
                if (existingWindowIndex !== -1) {
                    // Окно уже существует - используем его с сохраненными координатами
                    targetWindow = currentWindows[existingWindowIndex];
                    
                    // Обновляем только некоторые свойства, но сохраняем позицию
                    targetWindow = {
                        ...targetWindow,
                        ...appData,
                        id: windowId, // сохраняем ID
                        // НЕ перезаписываем positionx и positiony, если они не переданы явно
                        positionx: appData.positionx !== undefined ? appData.positionx : targetWindow.positionx,
                        positiony: appData.positiony !== undefined ? appData.positiony : targetWindow.positiony,
                        isMinimized: false
                    };
                    
                    newWindows = [...currentWindows];
                    newWindows[existingWindowIndex] = targetWindow;
                } else {
                    // Новое окно - определяем zIndex
                    let maxZIndex = 100;
                    if (currentWindows.length > 0) {
                        const zIndices = currentWindows.map(w => w.zIndex || 100);
                        maxZIndex = Math.max(...zIndices, 100);
                    }
                    
                    const newZIndex = maxZIndex + 1;
                    
                    // Создаем новое окно с переданными координатами или рандомными
                    targetWindow = new Window({
                        ...appData,
                        id: windowId,
                        zIndex: newZIndex,
                        isMinimized: false,
                        // Если координаты переданы, используем их, иначе будут рандомные из конструктора
                        positionx: appData.positionx,
                        positiony: appData.positiony
                    });
                    
                    newWindows = [...currentWindows, targetWindow];
                }

                // Устанавливаем активное окно
                activeWindowId.value = windowId;

                // Обновляем системную конфигурацию пользователя
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = newWindows;
                        user.systemconfig.activeWindowId = windowId;
                        user.updatedAt = new Date();
                    });

                // Обновляем реактивную переменную
                IDBWindows.value = newWindows;
                
                return targetWindow;
            } catch (error) {
                console.error('Error creating/updating window:', error);
                throw error;
            }
        },

        // получить список всех окон по ID пользователя
        async windows_getAll(userId) {
            if (!userId) throw new Error('User ID required');
            
            const user = await DB.users.get(userId);

            if (!user) throw new Error(`User with ID ${userId} not found`);
            
            const windows = user?.systemconfig?.windows || [];
            
            // Убедимся, что у каждого окна есть zIndex
            const windowsWithZIndex = windows.map(w => ({
                ...w,
                zIndex: w.zIndex || 100
            }));
            
            return windowsWithZIndex;
        },

        // получение конкретного окна по ID пользователя + ID окна
        async getById(userId, windowId) {
            if (!userId) throw new Error('User ID required')
            if (!windowId) throw new Error('Window ID required')
            
            const user = await DB.users.get(userId)
            if (!user) throw new Error(`User with ID ${userId} not found`)
            
            const findWindows = user?.systemconfig?.windows || [];
            let result = null;

            findWindows.forEach(function(val) {
                if (val.id === windowId) result = val;
            });

            return result;
        },
        
        // проверка наличия окна по ID пользователя + ID окна
        async exists(userId, windowId) {
            if (!userId) throw new Error('User ID required')
            if (!windowId) throw new Error('Window ID required')
            
            try {
                const window = await this.getById(userId, windowId);
                return window !== null;
            } catch {
                return false;
            }
        },

        // возвращает "следующее" значение zIndex, которое можно использовать
        async getCurZIndex(userId) {
            if (!userId) throw new Error('User ID required');

            let maxZIndex = 100;

            try {
                const findWindows = await this.windows_getAll(userId);

                if (findWindows && findWindows.length > 0) {
                    findWindows.forEach(function(value) {
                        if (value.zIndex > maxZIndex) maxZIndex = value.zIndex;
                    });

                    return (maxZIndex + 1);
                } else {
                    return maxZIndex;
                }
            } catch {
                return maxZIndex;
            }            
        },

        // Сохраняем все окна в systemconfig.windows пользователя
        async saveWindowsToUser(userId) {
            if (!userId) throw new Error('User ID required');

            try {
                const user = await DB.users.get(userId);
                const nWindows = IDBWindows.value.map(w => (new Window(w)));
                // const nWindows = IDBWindows.value.map(w => (this.prepareWindowForDB(w)));

                let uSystemconfig = user.systemconfig || Def_userSystemconfig;
                
                uSystemconfig.windows = nWindows;
                uSystemconfig.activeWindowId = activeWindowId.value;
                
                // Сохраняем обновленный systemconfig
                await DB.users.where('id').equals(userId)
                .modify(user => {
                    user.systemconfig = uSystemconfig;
                    user.updatedAt = new Date();
                });
                
                return { success: true, userId };
            } catch (error) {
                console.error('Failed to save windows to IDB:', error);
                throw new Error(`Failed to update user's systemconfig/windows: ${error.message}`);
            }
        },

        // активирование окна (поднятие его zIndex)
        async activate(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {                
                // Получаем пользователя
                const user = await DB.users.get(userId);
                const windows = user?.systemconfig?.windows || [];
                
                // Находим окно
                const windowIndex = windows.findIndex(w => w.id === windowId);

                if (windowIndex === -1) throw new Error(`Window with ID ${windowId} not found`);
                
                // Если окно свернуто - разворачиваем его
                if (windows[windowIndex].isMinimized) windows[windowIndex].isMinimized = false;
                
                // Находим текущий максимальный zIndex
                const maxZIndex = Math.max(...windows.map(w => w.zIndex || 100), 100);
                const newZIndex = maxZIndex + 1;
                
                // Обновляем zIndex активируемого окна
                windows[windowIndex].zIndex = newZIndex;

                // Обновляем конфиг
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = windows;
                        user.systemconfig.activeWindowId = windowId;
                        user.updatedAt = new Date();
                    });

                // Обновляем реактивную переменную
                IDBWindows.value = windows;
                activeWindowId.value = windowId;

                return { success: true };                
            } catch (error) {
                console.error('Failed to activate window:', error);
                throw error;
            }
        },

        // поиск "окна" в SConfig пользователя по данным приложения
        async getWindow_byConfig(userId, appData) {
            if (!userId) throw new Error('User ID required');
            if (!appData) throw new Error('appData required');
            
            try {
                const FindWindows = await this.windows_getAll(userId);
                
                if (FindWindows && FindWindows.length > 0) {
                    let res = false;

                    FindWindows.forEach(function(val) {
                        if (appData && appData.name && val.name === appData.name) res = val;
                    });

                    return res;
                } else {
                    return false;
                }
            } catch (error) {
                console.error('Error operation(users; getSConfig_window_byConfig).', error);
                throw new Error(`Failed: ${error.message}`);
            }
        },

        // сворачивание окна
        async minimize(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {                
                // Получаем пользователя
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                const windows = user?.systemconfig?.windows || [];
                
                // Находим индекс сворачиваемого окна
                const windowIndex = windows.findIndex(w => w.id === windowId);
                
                if (windowIndex === -1) throw new Error(`Window with ID ${windowId} not found`);
                
                // Устанавливаем isMinimized в true
                windows[windowIndex].isMinimized = true;
                
                // Определяем новое активное окно (окно с максимальным zIndex среди не свернутых)
                const nonMinimizedWindows = windows.filter(w => !w.isMinimized);
                let newActiveWindowId = null;
                
                if (nonMinimizedWindows.length > 0) {
                    // Находим окно с максимальным zIndex среди не свернутых
                    newActiveWindowId = nonMinimizedWindows.reduce((max, w) => 
                        (w.zIndex > max.zIndex) ? w : max
                    , nonMinimizedWindows[0]).id;
                }
                
                console.log('Window minimized, new active window:', newActiveWindowId);
                
                // Обновляем конфиг
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = windows;
                        user.systemconfig.activeWindowId = newActiveWindowId;
                        user.updatedAt = new Date();
                    });
                
                // Обновляем глобальные переменные
                activeWindowId.value = newActiveWindowId;
                IDBWindows.value = windows;
                
                return { success: true, userId, windowId, newActiveWindowId };
            } catch (error) {
                console.error('Failed to minimize window:', error);
                throw new Error(`Failed to minimize window: ${error.message}`);
            }
        },
        
        // восстановление окна из свернутого состояния
        async restore(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {                
                // Получаем пользователя
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                const windows = user?.systemconfig?.windows || [];
                
                // Находим индекс восстанавливаемого окна
                const windowIndex = windows.findIndex(w => w.id === windowId);
                
                if (windowIndex === -1) throw new Error(`Window with ID ${windowId} not found`);
                
                // Устанавливаем isMinimized в false
                windows[windowIndex].isMinimized = false;
                
                // Получаем текущий максимальный zIndex
                const maxZIndex = Math.max(...windows.map(w => w.zIndex || 100), 100);
                const newZIndex = maxZIndex + 1;
                
                // Обновляем zIndex восстанавливаемого окна
                windows[windowIndex].zIndex = newZIndex;
                
                console.log('Window restored with zIndex:', newZIndex);
                
                // Обновляем конфиг
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = windows;
                        user.systemconfig.activeWindowId = windowId;
                        user.updatedAt = new Date();
                    });
                
                // Обновляем глобальные переменные
                activeWindowId.value = windowId;
                IDBWindows.value = windows;
                
                return { success: true, userId, windowId, zIndex: newZIndex };
            } catch (error) {
                console.error('Failed to restore window:', error);
                throw new Error(`Failed to restore window: ${error.message}`);
            }
        },

        // "закрытие" окна у пользователя
        async close(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {
                const FindWindows = await this.windows_getAll(userId);
                
                // Фильтруем окна, удаляя закрываемое
                const resultArray = FindWindows.filter(val => val.id !== windowId);

                // Обновляем реактивную переменную
                IDBWindows.value = resultArray;

                // Получаем пользователя и обновляем его конфиг
                const user = await DB.users.get(userId);
                let uSystemconfig = user.systemconfig || Def_userSystemconfig;
                
                // Обновляем windows в конфиге
                uSystemconfig.windows = resultArray.map(w => new Window(w));
                // uSystemconfig.windows = resultArray.map(w => this.prepareWindowForDB(w));
                
                // Если закрываем активное окно, активируем другое
                if (uSystemconfig.activeWindowId === windowId) {
                    if (resultArray.length > 0) {
                        // Активируем окно с максимальным zIndex
                        const windowsWithZIndex = resultArray.map(w => ({
                            ...w,
                            zIndex: w.zIndex || 100
                        }));
                        
                        const maxZWindow = windowsWithZIndex.reduce((max, w) => 
                            w.zIndex > max.zIndex ? w : max
                        );
                        
                        uSystemconfig.activeWindowId = maxZWindow.id;
                        activeWindowId.value = maxZWindow.id;
                    } else {
                        uSystemconfig.activeWindowId = null;
                        activeWindowId.value = null;
                    }
                }

                // Сохраняем в БД
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig = uSystemconfig;
                        user.updatedAt = new Date();
                    });

                // Обновляем nextZIndex
                if (resultArray.length > 0) {
                    const maxZ = Math.max(...resultArray.map(w => w.zIndex));
                    nextZIndex = maxZ + 1;
                } else {
                    nextZIndex = 100;
                }

                return { success: true, userId, windowId };
            } catch (error) {
                console.error('Error operation(users; windows.close).', error);
                throw new Error(`Failed: ${error.message}`);
            }
        },

        // фиксирование новых координат окна
        async updatePosition(userId, windowId, positionx, positiony) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');
            if (positionx === undefined || positiony === undefined) throw new Error('Position coordinates required');

            try {
                // Получаем пользователя
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                const windows = user?.systemconfig?.windows || [];
                
                // Находим индекс окна
                const windowIndex = windows.findIndex(w => w.id === windowId);
                
                if (windowIndex === -1) throw new Error(`Window with ID ${windowId} not found`);
                
                // Обновляем позицию окна
                windows[windowIndex].positionx = positionx;
                windows[windowIndex].positiony = positiony;
                
                // Обновляем конфиг в БД
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = windows;
                        user.updatedAt = new Date();
                    });
                
                // Обновляем реактивную переменную
                IDBWindows.value = windows;
                
                return { 
                    success: true, 
                    userId, 
                    windowId, 
                    positionx, 
                    positiony 
                };
            } catch (error) {
                console.error('Error updating window position:', error);
                throw new Error(`Failed to update window position: ${error.message}`);
            }
        },

        async updateSize(userId, windowId, width, height) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');
            if (width === undefined || height === undefined) throw new Error('Width and height required');

            try {
                // Получаем пользователя
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                const windows = user?.systemconfig?.windows || [];
                
                // Находим индекс окна
                const windowIndex = windows.findIndex(w => w.id === windowId);
                
                if (windowIndex === -1) throw new Error(`Window with ID ${windowId} not found`);
                
                // Обновляем размеры окна
                windows[windowIndex].defWidth = width;
                windows[windowIndex].defHeight = height;
                
                // Обновляем конфиг в БД
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemconfig.windows = windows;
                        user.updatedAt = new Date();
                    });
                
                // Обновляем реактивную переменную
                IDBWindows.value = windows;
                
                return { 
                    success: true, 
                    userId, 
                    windowId, 
                    width, 
                    height 
                };
            } catch (error) {
                console.error('Error updating window size:', error);
                throw new Error(`Failed to update window size: ${error.message}`);
            }
        },
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

// ==================== МИГРАЦИИ (пример, не факт что рабочий) ====================

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

export { DB, IDBWindows, activeWindowId };

export default {
    DB,
    User,
    Window,
    usersTable,
    settingsTable,
    initDatabase,
    clearDatabase
};
