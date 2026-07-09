// Централизованная конфигурация всех приложений OSI

// "базовый" класс для приложения
class OSIApp {
    constructor(data = {}) {
        this.id = data.id || ('newApp_' + Date.now());
        this.name = data.name || 'NewApp';
        this.label = data.label || 'Новое приложение';
        this.category = data.category || 'other';
        this.icon = data.icon || '';                            // Эмодзи-иконка (самый элементарный вариант)
        this.iconImg = data.iconImg || '';                      // PNG-иконка приложения
        // this.iconclass = data.iconclass || 'text-ico-tech';  // Старый подход: Bootstrap Icons + CSS-градиент
        this.iconclass = data.iconclass || '';
        this.description = data.description || '';              // Описание приложения
        this.defWidth = data.defWidth || 800;                   // Ширина по-умолчанию
        this.defHeight = data.defHeight || 450;                 // Высота по-умолчанию
        this.isMaximized = data.isMaximized || false;           // По умолчанию открывать развернутым
        this.resizable = data.resizable || false;               // Возможность изменять размеры окна
        this.canMinimize = data.canMinimize || false;           // Возможность сворачивать окно
        this.showOnDesktop = data.showOnDesktop || false;       // Отображать на рабочем столе
        this.showInStartMenu = data.showInStartMenu || false;   // Отображать в меню "Пуск"
        this.deskContextMenu = data.deskContextMenu || false;   // Отображать в контекстном меню рабочего стола
        this.suppFormats = data.suppFormats || [];              // Перечень поддерживаемых приложением форматов
        this.loader = data.loader || null;                      // Функция lazy-load Vue-компонента
    }
}

const applications = [
    new OSIApp({
        id: 'osisettings', name: 'OSISettings',
        label: 'Настройки', category: 'system', description: 'Настройки системы OSI.',
        // iconclass: 'bi-gear-fill text-ico-tech',
        iconImg: require('@/apps/system/OSISettings/icon.png'),
        resizable: true, canMinimize: true, showOnDesktop: true, showInStartMenu: true, deskContextMenu: true,
        loader: () => import('@/apps/system/OSISettings/OSISettings.vue'),
    }),
    // new OSIApp({
    //     id: 'osihelper', name: 'OSIHelper',
    //     label: 'OSI помощник', category: 'system', description: 'Справочная система и помощь по OSI.',
    //     // iconclass: 'bi-info-square-fill text-ico-info',
    //     iconImg: require('@/apps/system/OSIHelper/icon.png'),
    //     defWidth: 600, defHeight: 700,
    //     resizable: true, canMinimize: true, showOnDesktop: true, showInStartMenu: true,
    // }),
    // new OSIApp({
    //     id: 'osicalendar', name: 'OSICalendar',
    //     label: 'Календарь', category: 'utilities', description: 'Системный календарь.',
    //     // iconclass: 'bi-calendar2-date text-ico-purpure',
    //     iconImg: require('@/apps/system/OSICalendar/icon.png'),
    //     isMaximized: true, resizable: true, canMinimize: true,
    // }),
    new OSIApp({
        id: 'osicalculator', name: 'OSICalculator',
        label: 'Калькулятор', category: 'utilities', description: 'Простой калькулятор для базовых вычислений.',
        // iconclass: 'bi-calculator-fill text-ico-purpure',
        iconImg: require('@/apps/system/OSICalculator/icon.png'),
        defWidth: 400, defHeight: 670,
        canMinimize: true, showOnDesktop: true, showInStartMenu: true,
        loader: () => import('@/apps/system/OSICalculator/OSICalculator.vue'),
    }),
    new OSIApp({
        id: 'osimplayer', name: 'OSIMPlayer',
        label: 'MPlayer', category: 'utilities', description: 'Простейший музыкальный плеер.',
        // iconclass: 'bi-cassette-fill text-ico-purpure',
        iconImg: require('@/apps/system/OSIMPlayer/icon.png'),
        defWidth: 850, defHeight: 400,
        showOnDesktop: true, showInStartMenu: true,
        suppFormats: ["audio"],
        loader: () => import('@/apps/system/OSIMPlayer/OSIMPlayer.vue'),
    }),
    new OSIApp({
        id: 'osiappmanager', name: 'OSIAppManager',
        label: 'AppManager', category: 'system', description: 'Менеджер приложений OSI.',
        // iconclass: 'bi-grid-3x3-gap-fill text-ico-tech',
        iconImg: require('@/apps/system/OSIAppManager/icon.png'),
        isMaximized: true, showInStartMenu: true, deskContextMenu: true,
        loader: () => import('@/apps/system/OSIAppManager/OSIAppManager.vue'),
    }),
    new OSIApp({
        id: 'osipicta', name: 'OSIPicta',
        label: 'Picta', category: 'utilities', description: 'Просмотр изображений.',
        // iconclass: 'bi-easel-fill text-ico-purpure',
        iconImg: require('@/apps/system/OSIPicta/icon.png'),
        isMaximized: true, canMinimize: true, showInStartMenu: true, showOnDesktop: true,
        suppFormats: ["image"],
        loader: () => import('@/apps/system/OSIPicta/OSIPicta.vue'),
    }),
    new OSIApp({
        id: 'osidirdigger', name: 'OSIDirDigger',
        label: 'DirDigger', category: 'utilities', description: 'Файловый менеджер.',
        // iconclass: 'bi-hdd-fill text-ico-purpure',
        iconImg: require('@/apps/system/OSIDirDigger/icon.png'),
        defWidth: 850, defHeight: 600,
        resizable: true, isMaximized: true, canMinimize: true, showInStartMenu: true, showOnDesktop: true,
        loader: () => import('@/apps/system/OSIDirDigger/OSIDirDigger.vue'),
    }),
    new OSIApp({
        id: 'ositetris', name: 'OSITetris',
        label: 'Тетрис', category: 'games', description: 'Классическая игра Тетрис.',
        // iconclass: 'bi-puzzle-fill text-ico-game',
        iconImg: require('@/apps/system/OSITetris/icon.png'),
        defWidth: 600, defHeight: 770,
        canMinimize: true, showOnDesktop: true, showInStartMenu: true,
        loader: () => import('@/apps/system/OSITetris/OSITetris.vue'),
    }),
    new OSIApp({
        id: 'osinotificator', name: 'OSINotificator',
        label: 'Менеджер уведомлений', category: 'utilities', description: 'Системный менеджер для работы с уведомлениями.',
        // iconclass: 'bi-bell-fill text-ico-purpure',
        iconImg: require('@/apps/system/OSINotificator/icon.png'),
        defWidth: 850, defHeight: 600,
        resizable: true, isMaximized: true, canMinimize: true, showInStartMenu: true,
        loader: () => import('@/apps/system/OSINotificator/OSINotificator.vue'),
    }),
    new OSIApp({
        id: 'osijustread', name: 'OSIJustRead',
        label: 'JustRead', category: 'utilities', description: 'Простое приложение для просмотра текстовых файлов.',
        iconImg: require('@/apps/system/OSIJustRead/icon.png'),
        defWidth: 850, defHeight: 600,
        resizable: true, canMinimize: true, showInStartMenu: true, showOnDesktop: true,
        suppFormats: ['text'],
        loader: () => import('@/apps/system/OSIJustRead/OSIJustRead.vue'),
    }),
];

export const appsConfig = {
    getAllApps() { return applications; },
    getDesktopApps() { return applications.filter(app => app.showOnDesktop !== false); },
    getStartMenuApps() { return applications.filter(app => app.showInStartMenu !== false); },
    getAppById(id) { return applications.find(app => app.id === id); },
    getAppByName(name) { return applications.find(app => app.name === name); },
    getAppsByCategory(category) { return applications.filter(app => app.category === category); },
  
    // Получить иконку приложения
    getAppIcon(appId) {
        const app = this.getAppById(appId);

        return app?.icon || '📄';
    },
  
    // Получить настройки окна для приложения
    getWindowConfig(appId) {
        const app = this.getAppById(appId);
        
        return app?.window || { defWidth: 400, defHeight: 400, isMaximized: false };
    },
  
    getAppLoader(appName) {
        const app = this.getAppByName(appName);

        return app?.loader || null;
    },

    /** Дополняет запись приложения из IDB полями из конфига (iconImg и т.д.). */
    enrichApp(userApp) {
        if (!userApp) return userApp;

        const configApp = this.getAppById(userApp.id);
        if (!configApp) return userApp;

        return {
            ...configApp,
            ...userApp,
            iconImg: userApp.iconImg || configApp.iconImg,
            suppFormats: (userApp.suppFormats && userApp.suppFormats.length)
                ? userApp.suppFormats
                : (configApp.suppFormats || []),
        };
    },

    enrichApps(userApps) {
        if (!Array.isArray(userApps)) return [];

        return userApps.map(app => this.enrichApp(app));
    },
};

export default applications;
