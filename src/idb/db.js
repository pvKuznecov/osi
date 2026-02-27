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
    users: '++id, name, login, password, apps, data, config, systemconfig, systemdata, createdAt, updatedAt',
    // settings: '++id, key, value, updatedAt',
    dfiles: '++id, name, userid, parentid, [userid+parentid], type, size, mimetype, data, private, protect, createdAt, updatedAt',
});

// ========Default configs========
const Def_userConfig = { avatar: "cat.jpg" };
const Def_systemdata = {windowsstates: {}};
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
        this.systemconfig = data.systemconfig || Def_userSystemconfig;
        this.systemdata = data.systemdata || Def_systemdata;
        this.protect = data.protect || false;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        // автоматическое присваение id (вариант для "совместимости")
        if (data.id) this.id = data.id;
    }
}

export class DFile {
    // Статическое свойство для обозначения корня
    static ROOT_PARENT = 0;

    constructor(data = {}) {
        // автоматическое присваение id (вариант для "совместимости")
        if (data.id) this.id = data.id;

        this.name = data.name || 'Unknown';
        this.userid = data.userid || null;                      // владелец (связь с users.id)
        this.parentid = data.parentid ?? DFile.ROOT_PARENT;     // родительская папка
        this.type = data.type || '';                            // тип
        this.size = data.size || 0;                             // размер в байтах
        this.mimetype = data.mimetype || '';                    // MIME-тип
        this.private = data.private || false;                   // приватный/публичный
        this.protect = data.protect || false;                   // защищенный от удаления
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();

        // Типозависимые поля
        this.extension = data.extension || this.getExtensionFromName();

        // Для папок
        if (this.type === 'folder') {
            this.children = data.children || [];        // массив ID дочерних элементов
            this.isExpanded = data.isExpanded || false; //UI метка "открытая\закрытая папка"
            this.metadata = {}; // пустой metadata для папок
        } else {
            // Для файлов - содержимое в blob
            this.blob = data.blob || data.data || null;
            
            // Сохраняем метаданные в metadata объект (ЕДИНСТВЕННОЕ МЕСТО)
            this.metadata = {
                duration: data.duration || 0,
                artist: data.artist || '',
                album: data.album || '',
                title: data.title || this.name,
                bitrate: data.bitrate || 0,
                width: data.width || 0,
                height: data.height || 0,
                camera: data.camera || '',
                dateTaken: data.dateTaken || null,
                contains: data.contains || [],
                compressedSize: data.compressedSize || 0,
                appId: data.appId || ''
            };
        }
    }

    // Геттеры для удобного доступа к метаданным
    get camera() { return this.metadata?.camera || ''; }
    get width() { return this.metadata?.width || 0; }
    get height() { return this.metadata?.height || 0; }
    get duration() { return this.metadata?.duration || 0; }
    get artist() { return this.metadata?.artist || ''; }
    get album() { return this.metadata?.album || ''; }
    get title() { return this.metadata?.title || this.name; }
    get dateTaken() { return this.metadata?.dateTaken || null; }
    get contains() { return this.metadata?.contains || []; }
    get compressedSize() { return this.metadata?.compressedSize || 0; }
    get appId() { return this.metadata?.appId || ''; }
    
    // Сеттеры для обновления метаданных
    set camera(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.camera = value; 
    }
    
    set width(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.width = value; 
    }
    
    set height(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.height = value; 
    }
    
    set duration(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.duration = value; 
    }
    
    set artist(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.artist = value; 
    }
    
    set album(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.album = value; 
    }
    
    set title(value) { 
        if (!this.metadata) this.metadata = {};
        this.metadata.title = value; 
    }

    getExtensionFromName() {
        const parts = this.name.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    // Вспомогательный метод для получения иконки
    getIcon() {
        const iconMap = {
            folder: '📁',
            audio: '🎵',
            text: '📝',
            image: '🖼️',
            video: '🎬',
            app: '⚙️',
            archive: '📦',
            file: '📄'
        };
        return iconMap[this.type] || '📄';
    }
    
    // Проверка, является ли элемент папкой
    isFolder() { return this.type === 'folder'; }
    
    // Получить путь к файлу
    async getPath(db) {
        if (!this.parentid || this.parentid === DFile.ROOT_PARENT) {
            return [this];
        } else {
            const path = [];
            let current = this;
        
            while (current.parentid && current.parentid !== DFile.ROOT_PARENT) {
                const parent = await db.dfiles.get(current.parentid);
                if (!parent) break;
                path.unshift(parent);
                current = parent;
            }
            
            // Добавляем корень
            if (current.parentid === DFile.ROOT_PARENT) {
                const root = await db.dfiles
                    .where('[userid+parentid]')
                    .equals([this.userid, DFile.ROOT_PARENT])
                    .first();
                if (root) path.unshift(root);
            }
        
            return path;
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

export class WindowState {
    constructor(data = {}) {
        this.windowId = data.windowId || null;
        this.data = data.data || {};
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

    // комплексное закрытие окна (окно + состояние) с транзакцией и таймаутом
    async closeComplWindow(userId, windowId) {
        if (!userId) throw new Error('User ID required');
        if (!windowId) throw new Error('Window ID required');

        console.log(`Starting transaction for closing window ${windowId}`);
        
        // Сначала проверяем, существует ли пользователь
        const user = await DB.users.get(userId);
        if (!user) {
            console.error(`User with ID ${userId} not found`);
            return { success: false, reason: 'user_not_found' };
        }
        
        const windowExists = user.systemconfig?.windows?.some(w => w.id === windowId);
        const stateExists = !!(user.systemdata?.windowsstates?.[windowId]);
        
        console.log(`Window exists: ${windowExists}, State exists: ${stateExists}`);
        
        if (!windowExists && !stateExists) {
            return { success: true, alreadyClosed: true };
        }
        
        // Используем транзакцию с ТАЙМАУТОМ
        try {
            // Создаем промис с таймаутом
            const transactionPromise = DB.transaction('rw', DB.users, async () => {
                // Получаем пользователя снова внутри транзакции
                const currentUser = await DB.users.get(userId);
                // Подготавливаем изменения
                const updates = { updatedAt: new Date() };
                
                // Обновляем systemdata (удаляем состояние)
                if (currentUser.systemdata?.windowsstates?.[windowId]) {
                    const newSystemData = { ...currentUser.systemdata };
                    delete newSystemData.windowsstates[windowId];
                    updates.systemdata = newSystemData;
                }
                
                // Обновляем systemconfig (удаляем окно)
                if (currentUser.systemconfig?.windows) {
                    const newWindows = currentUser.systemconfig.windows.filter(w => w.id !== windowId);
                    const newSystemConfig = {
                        ...currentUser.systemconfig,
                        windows: newWindows
                    };
                    
                    // Обновляем activeWindowId если нужно
                    if (newSystemConfig.activeWindowId === windowId) {
                        if (newWindows.length > 0) {
                            const maxZWindow = newWindows.reduce((max, w) => 
                                (w.zIndex || 0) > (max.zIndex || 0) ? w : max
                            );
                            newSystemConfig.activeWindowId = maxZWindow.id;
                        } else {
                            newSystemConfig.activeWindowId = null;
                        }
                    }
                    
                    updates.systemconfig = newSystemConfig;
                }
                
                // Применяем изменения
                await DB.users.update(userId, updates);
                
                // Обновляем реактивные переменные
                const updatedUser = await DB.users.get(userId);
                
                activeWindowId.value = updatedUser.systemconfig?.activeWindowId || null;
                IDBWindows.value = updatedUser.systemconfig?.windows || [];
                
                console.log(`Window ${windowId} closed successfully`);
                return { success: true, userId, windowId };
            });
            
            // Создаем промис таймаута на 5 секунд
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Transaction timeout after 5s')), 5000);
            });
            
            // Гонка между транзакцией и таймаутом
            return await Promise.race([transactionPromise, timeoutPromise]);
            
        } catch (error) {
            if (error.message === 'Transaction timeout after 5s') {
                console.error('Transaction timeout, falling back to simple deletion');
            } else {
                console.error('Transaction failed:', error);
            }
            
            // Fallback на простое удаление
            console.log('Falling back to simple deletion...');
            
            const currentUser = await DB.users.get(userId);
            if (!currentUser) return { success: false };
            
            // Просто удаляем состояние и окно по отдельности
            if (currentUser.systemdata?.windowsstates?.[windowId]) {
                const newStates = { ...currentUser.systemdata.windowsstates };
                delete newStates[windowId];
                
                await DB.users.update(userId, {
                    systemdata: { ...currentUser.systemdata, windowsstates: newStates }
                });
            }
            
            if (currentUser.systemconfig?.windows) {
                const newWindows = currentUser.systemconfig.windows.filter(w => w.id !== windowId);
                await DB.users.update(userId, {
                    systemconfig: { ...currentUser.systemconfig, windows: newWindows }
                });
            }
            
            // Обновляем реактивные переменные
            const updatedUser = await DB.users.get(userId);
            activeWindowId.value = updatedUser.systemconfig?.activeWindowId || null;
            IDBWindows.value = updatedUser.systemconfig?.windows || [];
            
            return { success: true, userId, windowId, fallback: true, timeout: error.message === 'Transaction timeout after 5s' };
        }
    },

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

        async close(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {
                // Получаем пользователя
                const user = await DB.users.get(userId);
                if (!user) throw new Error(`User with ID ${userId} not found`);
                
                // Получаем текущие окна
                const currentWindows = user?.systemconfig?.windows || [];
                
                // Проверяем, существует ли окно
                const windowExists = currentWindows.some(w => w.id === windowId);
                
                if (!windowExists) {
                    console.log(`Window ${windowId} already doesn't exist for user ${userId}`);
                    // Если окна нет, просто обновляем реактивную переменную
                    IDBWindows.value = currentWindows;
                    return { success: true, userId, windowId, alreadyClosed: true };
                }
                
                // Фильтруем окна, удаляя закрываемое
                const resultArray = currentWindows.filter(val => val.id !== windowId);

                // Обновляем реактивную переменную
                IDBWindows.value = resultArray;

                // Обновляем systemconfig пользователя
                let uSystemconfig = user.systemconfig || Def_userSystemconfig;
                
                // Обновляем windows в конфиге (создаем новые объекты Window)
                uSystemconfig.windows = resultArray.map(w => new Window(w));
                
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
                    const maxZ = Math.max(...resultArray.map(w => w.zIndex || 100));
                    nextZIndex = maxZ + 1;
                } else {
                    nextZIndex = 100;
                }

                return { success: true, userId, windowId };
            } catch (error) {
                console.error('Error operation(users; windows.close).', error);
                throw new Error(`Failed to close window: ${error.message}`);
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

    windstates: {
        // получить список всех состояний окон по ID пользователя
        async getAll(userId) {
            if (!userId) throw new Error('User ID required');
            
            try {
                const user = await DB.users.get(userId);

                if (!user) {
                    throw new Error(`User with ID ${userId} not found`);
                } else {
                    const states = Object.values(user?.systemdata?.windowsstates) || [];
                
                    return states;
                }
            } catch (error) {
                console.error("Error: ", error);
                return false;
            }        
        },

        // получить состояние конкретного окна по ID пользователя + ID окна
        async getById(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {
                const user = await DB.users.get(userId);
                
                if (!user) {
                    throw new Error(`User with ID ${userId} not found`);
                } else {
                    const states = user?.systemdata?.windowsstates || false;

                    if (states && Object.keys(states).includes(windowId)) {
                        return states[windowId];
                    } else {
                        return false;
                    }
                }
            } catch (error) {
                console.error("Error: ", error);
                return false;
            }
        },

        async delById(userId, windowId) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');

            try {
                const user = await DB.users.get(userId);

                if (!user) {
                    console.error(`User with ID ${userId} not found`);
                    return false;
                }

                // Проверяем, есть ли systemdata и windowsstates
                if (!user.systemdata) {
                    console.log(`No systemdata for user ${userId}`);
                    return true; // Считаем успешным, т.к. состояния нет
                }
                
                if (!user.systemdata.windowsstates) {
                    console.log(`No windowsstates for user ${userId}`);
                    return true; // Считаем успешным, т.к. состояний нет
                }

                const states = user.systemdata.windowsstates;
                
                // Проверяем, есть ли состояние для этого окна
                if (!states[windowId]) {
                    console.log(`No state found for window ${windowId}`);
                    return true; // Состояния нет, считаем успешным
                }

                // Создаем новый объект без удаляемого состояния
                const newStates = { ...states };
                delete newStates[windowId];

                // Обновляем в БД
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemdata.windowsstates = newStates;
                        user.updatedAt = new Date();
                    });
                
                console.log(`State for window ${windowId} deleted successfully`);
                return { success: true, userId, windowId };
            } catch (error) {
                console.error("Error in delById: ", error);
                return false;
            }
        },

        // переписать состояние окна по ID пользователя + ID окна + данные состояния
        async updateVal(userId, windowId, stateData = false) {
            if (!userId) throw new Error('User ID required');
            if (!windowId) throw new Error('Window ID required');
            if (!stateData) throw new Error('State data required');

            try {
                const user = await DB.users.get(userId);

                if (!user) throw new Error(`User with ID ${userId} not found`);

                // Создаем безопасную копию stateData для сохранения в БД
                const safeStateData = usersTable.createSafeCopy(stateData);
                
                if (!safeStateData) throw new Error('Failed to create safe copy of state data');

                // Инициализируем systemdata.windowsstates если его нет
                if (!user.systemdata) user.systemdata = {};
                
                if (!user.systemdata.windowsstates) user.systemdata.windowsstates = {};

                // Получаем текущие состояния
                const states = user.systemdata.windowsstates || {};                
                // Создаем новый объект состояний
                const newData = { ...states };

                // Сохраняем безопасную копию данных для этого окна
                newData[windowId] = safeStateData;

                // Обновляем в БД
                await DB.users.where('id').equals(userId)
                    .modify(user => {
                        user.systemdata.windowsstates = newData;
                        user.updatedAt = new Date();
                    });

                return { success: true, userId, windowId, stateData: safeStateData };                
            } catch (error) {
                console.error("Error in updateVal: ", error);
                return false;
            }
        },
    },
};

export const dFiles = {
    // получить корневую папку пользователя
    async getRoot(userId) {
        if (!userId) throw new Error('User ID required');

        try {
            // пытаемся найти корень
            let RootFolder = await DB.dfiles
                .where('[userid+parentid]')
                .equals([userId, DFile.ROOT_PARENT])
                .and(item => item.type === 'folder' && item.name === 'root')
                .first();
            
            // корня нет - создаем
            if (!RootFolder) {
                RootFolder = new DFile({
                    name: 'root',
                    userid: userId,
                    parentid: DFile.ROOT_PARENT,
                    type: 'folder',
                    protect: true, // защищаем корень от удаления
                    children: []
                });
                
                RootFolder.id = await DB.dfiles.add(RootFolder);
            }
            
            return RootFolder;
        } catch (error) {
            console.error('Error getting root folder:', error);
            throw error;
        }
    },

    // Получить содержимое папки
    async getFolderContents(userId, folderId) {
        if (!folderId) throw new Error('Folder ID required');
        if (!userId) throw new Error('User ID required');
        
        try {
            const folder = await DB.dfiles.get(folderId);
            if (!folder) throw new Error('Folder not found');               //не нашли
            if (folder.userid !== userId) throw new Error('Access denied'); //не принадлежит пользователю
            if (folder.type !== 'folder') throw new Error('Not a folder');  //это не папка
            
            // Получаем все элементы с этим parentid
            const contents = await DB.dfiles
                .where('[userid+parentid]')
                .equals([userId, folderId])
                .toArray();
            
            // Сортируем: сначала папки, потом файлы
            return contents.sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') {
                    return -1;
                } else if (a.type !== 'folder' && b.type === 'folder') {
                    return 1;
                } else {
                    return a.name.localeCompare(b.name);
                }
            });
        } catch (error) {
            console.error('Error getting folder contents:', error);
            throw error;
        }
    },

    // Создать новую папку
    async createFolder(userId, parentId, folderName) {
        if (!userId) throw new Error('User ID required');
        if (!parentId) throw new Error('Parent ID required');
        if (!folderName) throw new Error('Folder name required');
        
        try {
            // Проверяем родительскую папку
            const parent = await DB.dfiles.get(parentId);
            if (!parent) throw new Error('Parent folder not found');
            if (parent.userid !== userId) throw new Error('Access denied');
            if (parent.type !== 'folder') throw new Error('Parent is not a folder');
            
            // Проверяем, нет ли уже папки с таким именем
            const existing = await DB.dfiles
                .where('[userid+parentid]')
                .equals([userId, parentId])
                .and(item => item.name === folderName && item.type === 'folder')
                .first();
            
            if (existing) throw new Error('Folder with this name already exists');  //папка с таким именем уже существует (в родительской)
            
            // Создаем новую папку
            const newFolder = new DFile({
                name: folderName,
                userid: userId,
                parentid: parentId,
                type: 'folder',
                children: []
            });
            
            const id = await DB.dfiles.add(newFolder);
            
            // Обновляем список детей в родительской папке
            if (!parent.children) parent.children = []; //если список детей в родителе пуст - создаем пустой

            parent.children.push(id);

            await DB.dfiles.update(parentId, {
                children: parent.children,
                updatedAt: new Date()
            });
            
            return { ...newFolder, id };
        } catch (error) {
            console.error('Error creating folder:', error);
            throw error;
        }
    },

    // Добавить файл (из загрузки)
    async addFile(userId, parentId, fileData, blob) {
        if (!userId) throw new Error('User ID required');
        if (!parentId) throw new Error('Parent ID required');
        if (!fileData) throw new Error('File data required');
        
        try {
            // Определяем тип файла
            const type = this.getFileType(fileData.type, fileData.name);
            
            // Создаем объект для сохранения
            const fileObj = {
                name: fileData.name,
                userid: userId,
                parentid: parentId,
                type: type,
                size: fileData.size,
                mimetype: fileData.type,
                blob: blob,  // Сохраняем как blob, не data!
                extension: fileData.name.split('.').pop(),
                // Метаданные сохраняем как отдельные поля
                width: fileData.metadata?.width || 0,
                height: fileData.metadata?.height || 0,
                duration: fileData.metadata?.duration || 0,
                artist: fileData.metadata?.artist || '',
                album: fileData.metadata?.album || '',
                title: fileData.metadata?.title || fileData.name
            };
            
            const id = await DB.dfiles.add(fileObj);
            
            // Обновляем родительскую папку
            const parent = await DB.dfiles.get(parentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(id);
                await DB.dfiles.update(parentId, {
                    children: parent.children,
                    updatedAt: new Date()
                });
            }
            
            return { ...fileObj, id };
        } catch (error) {
            console.error('Error adding file:', error);
            throw error;
        }
    },

    // Определение типа файла
    getFileType(mimeType, fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        
        // По MIME типу
        if (mimeType) {
            if (mimeType.startsWith('audio/')) return 'audio';
            if (mimeType.startsWith('image/')) return 'image';
            if (mimeType.startsWith('video/')) return 'video';
            if (mimeType.startsWith('text/')) return 'text';
        }
        
        // По расширению
        const audioExt = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
        const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        const videoExt = ['mp4', 'avi', 'mkv', 'mov', 'wmv'];
        const textExt = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js'];
        const archiveExt = ['zip', 'rar', '7z', 'tar', 'gz'];
        
        if (audioExt.includes(ext)) {
            return 'audio';
        } else if (imageExt.includes(ext)) {
            return 'image';
        } else if (videoExt.includes(ext)) {
            return 'video';
        } else if (textExt.includes(ext)) {
            return 'text';
        } else if (archiveExt.includes(ext)) {
            return 'archive';
        } else {
            return 'file';
        }
    },

    // Удалить элемент (файл или папку)
    async delete(userId, itemId, recursive = false) {
        if (!userId) throw new Error('User ID required');
        if (!itemId) throw new Error('Item ID required');
        
        try {
            const item = await DB.dfiles.get(itemId);

            if (!item) throw new Error('Item not found');   //эл-т не найден
            if (item.userid !== userId) throw new Error('Access denied');   //эл-т "чужой"
            if (item.protect) throw new Error('Item is protected'); //эл-т защищен от удаления
            
            // Если это папка и recursive = false, проверяем что она пуста
            if (item.type === 'folder' && !recursive) {
                const contents = await DB.dfiles
                    .where('parentid')
                    .equals(itemId)
                    .count();
                
                if (contents > 0) {
                    throw new Error('Folder is not empty. Use recursive delete to remove all contents.');
                }
            }
            
            // Рекурсивное удаление
            if (item.type === 'folder' && recursive) {
                const contents = await DB.dfiles
                    .where('parentid')
                    .equals(itemId)
                    .toArray();
                
                for (const child of contents) {
                    await this.delete(userId, child.id, true);
                }
            }
            
            // Удаляем себя из родительской папки
            if (item.parentid) {
                const parent = await DB.dfiles.get(item.parentid);
                if (parent && parent.children) {
                    parent.children = parent.children.filter(id => id !== itemId);
                    await DB.dfiles.update(item.parentid, {
                        children: parent.children,
                        updatedAt: new Date()
                    });
                }
            }
            
            // Удаляем сам элемент
            await DB.dfiles.delete(itemId);
            
            return { success: true, itemId };
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    },
    
    // Переименовать элемент
    async rename(userId, itemId, newName) {
        if (!userId) throw new Error('User ID required');
        if (!itemId) throw new Error('Item ID required');
        if (!newName) throw new Error('New name required');
        
        try {
            const item = await DB.dfiles.get(itemId);
            if (!item) throw new Error('Item not found');
            if (item.userid !== userId) throw new Error('Access denied');
            
            // Проверяем, нет ли в этой папке элемента с таким именем
            if (item.parentid) {
                const existing = await DB.dfiles
                    .where('[userid+parentid]')
                    .equals([userId, item.parentid])
                    .and(i => i.name === newName && i.id !== itemId)
                    .first();
                
                if (existing) {
                    throw new Error('Item with this name already exists in this folder');
                }
            }
            
            item.name = newName;
            item.updatedAt = new Date();
            
            await DB.dfiles.update(itemId, {
                name: newName,
                updatedAt: item.updatedAt
            });
            
            return { success: true, item };
        } catch (error) {
            console.error('Error renaming item:', error);
            throw error;
        }
    },
    
    // Переместить элемент
    async move(userId, itemId, newParentId) {
        if (!userId) throw new Error('User ID required');
        if (!itemId) throw new Error('Item ID required');
        
        try {
            const item = await DB.dfiles.get(itemId);
            if (!item) throw new Error('Item not found');
            if (item.userid !== userId) throw new Error('Access denied');
            
            // Если newParentId не указан или null - перемещаем в корень
            let targetParentId = newParentId ?? DFile.ROOT_PARENT;
            
            if (targetParentId !== DFile.ROOT_PARENT) {
                const newParent = await DB.dfiles.get(targetParentId);
                if (!newParent) throw new Error('Target folder not found');
                if (newParent.userid !== userId) throw new Error('Access denied to target folder');
                if (newParent.type !== 'folder') throw new Error('Target is not a folder');
                
                // Проверяем, не пытаемся ли переместить папку в саму себя
                if (item.type === 'folder') {
                    let current = newParent;
                    while (current && current.id !== DFile.ROOT_PARENT) {
                        if (current.id === itemId) {
                            throw new Error('Cannot move folder into itself or its descendant');
                        }
                        current = current.parentid ? await DB.dfiles.get(current.parentid) : null;
                    }
                }
            }
            
            // Проверяем, нет ли в целевой папке элемента с таким именем
            const existing = await DB.dfiles
                .where('[userid+parentid]')
                .equals([userId, targetParentId])
                .and(i => i.name === item.name && i.id !== itemId)
                .first();
            
            if (existing) {
                throw new Error('Item with this name already exists in target folder');
            }
            
            // Удаляем из старой родительской папки
            if (item.parentid && item.parentid !== DFile.ROOT_PARENT) {
                const oldParent = await DB.dfiles.get(item.parentid);
                if (oldParent && oldParent.children) {
                    oldParent.children = oldParent.children.filter(id => id !== itemId);
                    await DB.dfiles.update(item.parentid, {
                        children: oldParent.children,
                        updatedAt: new Date()
                    });
                }
            }
            
            // Добавляем в новую родительскую папку
            if (targetParentId !== DFile.ROOT_PARENT) {
                const newParent = await DB.dfiles.get(targetParentId);
                if (newParent) {
                    if (!newParent.children) newParent.children = [];
                    newParent.children.push(itemId);
                    await DB.dfiles.update(targetParentId, {
                        children: newParent.children,
                        updatedAt: new Date()
                    });
                }
            }
            
            // Обновляем сам элемент
            item.parentid = targetParentId;
            item.updatedAt = new Date();
            
            await DB.dfiles.update(itemId, {
                parentid: targetParentId,
                updatedAt: item.updatedAt
            });
            
            return { success: true, item };
        } catch (error) {
            console.error('Error moving item:', error);
            throw error;
        }
    },
    
    // Поиск файлов
    async search(userId, query, type = null) {
        if (!userId) throw new Error('User ID required');
        if (!query) throw new Error('Search query required');
        
        try {
            let collection = DB.dfiles
                .where('userid')
                .equals(userId)
                .and(item => item.name.toLowerCase().includes(query.toLowerCase()));
            
            if (type) {
                collection = collection.and(item => item.type === type);
            }
            
            return await collection.toArray();
        } catch (error) {
            console.error('Error searching files:', error);
            throw error;
        }
    },
    
    // Получить информацию о файле/папке
    async getInfo(itemId) {
        if (!itemId) throw new Error('Item ID required');
        
        try {
            const item = await DB.dfiles.get(itemId);
            if (!item) throw new Error('Item not found');
            
            // Для папок считаем общий размер и количество элементов
            if (item.type === 'folder') {
                const contents = await DB.dfiles
                    .where('parentid')
                    .equals(itemId)
                    .toArray();
                
                const totalSize = contents.reduce((sum, child) => sum + (child.size || 0), 0);
                const fileCount = contents.filter(c => c.type !== 'folder').length;
                const folderCount = contents.filter(c => c.type === 'folder').length;
                
                return {
                    ...item,
                    totalSize,
                    fileCount,
                    folderCount,
                    itemCount: contents.length
                };
            }
            
            return item;
        } catch (error) {
            console.error('Error getting item info:', error);
            throw error;
        }
    }
};
// export const settingsTable = {
//     // сохранение настройки
//     async save(key, value) {
//         try {
//             const existing = await DB.settings.where('key').equals(key).first();

//             if (existing) {
//                 await DB.settings.update(existing.id, {
//                     value: value,
//                     updatedAt: new Date(),
//                 });
//                 return existing.id;
//             } else {
//                 return await DB.settings.add(new Setting(key, value));
//             }
//         } catch (error) {
//             console.error('Error operation (settings; save');
//             throw new Error(`Failed to save setting ${key}: ${error.message}`);
//         }
//     },

//     // получить настройку
//     async get(key, defaultVal = null) {
//         try {
//             const findSetting = DB.settings.where('key').equals(key).first();

//             return findSetting ? findSetting.value : defaultVal;
//         } catch (error) {
//             console.error('Error operation (settings; get');
//             throw new Error(`Failed to get setting ${key}: ${error.message}`);
//         }
//     },

//     // удалить настройку
//     async delete(key) {
//         try {
//             const findSetting = await DB.settings.where('key').equals(key).first();

//             if (findSetting) {
//                 return await DB.settings.delete(findSetting.id);
//             } else {
//                 return null;
//             }
//         } catch (error) {
//             console.error('Error operation (settings; delete');
//             throw new Error(`Failed to delete setting ${key}: ${error.message}`);
//         }
//     },

//     // получить все настройки
//     async getAll() {
//         try {
//             return await DB.settings.toArray();
//         } catch (error) {
//             console.error('Error operation (settings; getAll');
//             throw new Error(`Failed to get all settings`);
//         }
//     },
// };


// -=-=-=-=-=-=-Служебное-=-=-=-=-=-=-

// инициализация БД с тестовыми данными
export async function initDatabase() {
    try {
        // проверка, пустая ли таблица users
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

        // // инициализация базовых настроек 
        // const defaultSettings = [
        //     ['theme', 'dark'],
        //     ['avatarDefault', 'cat'],
        // ];

        // for (const [key, value] of defaultSettings) {
        //     const existing = await settingsTable.get(key);

        //     if (existing === null) {
        //         await settingsTable.set(key, value);
        //     }
        // }

        // console.log('Database initialized successfully');
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
            // DB.settings.clear()
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
    DFile,
    Window,
    usersTable,
    // settingsTable,
    initDatabase,
    clearDatabase
};
