import Dexie from "dexie";

// конфигураторы БД
const db_name = 'OSIDB';
const db_version = 1;

// инициализация БД
const DB = new Dexie(db_name);

// описание схемы БД
DB.version(db_version).stores({
    users: '++id, login, password, apps, data, config, systemСonfig, createdAt, updatedAt',
    settings: '++id, key, value, updatedAt',
});

// -=-=-=-=-=-=-Описание классов моделей-=-=-=-=-=-=-
export class User {
    constructor(data = {}) {
        this.login = data.login || '';
        this.password = data.password || '';    //ПРОДУМАТЬ РЕАЛЬНУЮ СХЕМУ ЗАЩИТЫ
        this.apps = data.apps || [];
        this.data = data.data || {};
        this.config = data.config || {};
        this.systemconfig = data.systemconfig || {};
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

            if (NUser.id) {
                NUser.updatedAt = new Date();
                await DB.users.update(NUser.id, NUser);

                return NUser.id;
            } else {
                // зачищаем id в NUser (автоматически сгенерирует)
                delete NUser.id;

                NUser.createdAt = new Date();
                NUser.updatedAt = new Date();

                return await DB.users.add(NUser);
            }
        } catch (error) {
            console.error('Error operation (users; save):', error);            
            throw new Error(`Failed to save user: ${error.message}`);
        }
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
            // создание базового пользователя
            const defaultUser = new User({
                login: 'user',
                password: '',
                apps: [],
                data: {},
                config: {},
                systemconfig: {},
            });

            await usersTable.save(defaultUser);
            console.log('Default user created.');
        }

        // инициализация базовых настроек 
        const defaultSettings = [
            ['theme', 'dark'],
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

