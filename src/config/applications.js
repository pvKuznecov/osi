// Централизованная конфигурация всех приложений OSI

// "базовый" класс для приложения
class OSIApp {
    constructor(data = {}) {
        this.id = data.id || ('newApp_' + Date.now());
        this.name = data.name || 'NewApp';
        this.label = data.label || 'Новое приложение';
        this.category = data.category || 'other';
        this.icon = data.icon || '';                            // Эмодзи-иконка (самый элементарный вариант; TODO: сделать адекватный вариант с картинкой)
        this.iconclass = data.iconclass || 'text-ico-tech';     // Список классов bootstrap для отрисовки иконки
        this.description = data.description || '';              // Описание приложения
        this.defWidth = data.defWidth || 800;                   // Ширина по-умолчанию
        this.defHeight = data.defHeight || 450;                 // Высота по-умолчанию
        this.isMaximized = data.isMaximized || false;           // По умолчанию открывать развернутым
        this.resizable = data.resizable || false;               // Возможность изменять размеры окна
        this.canMinimize = data.canMinimize || false;           // Возможность сворачивать окно
        this.showOnDesktop = data.showOnDesktop || false;       // Отображать на рабочем столе
        this.showInStartMenu = data.showInStartMenu || false;   // Отображать в меню "Пуск"
    }
}

const applications = [
    new OSIApp({
        id: 'osisettings', name: 'OSISettings',
        label: 'Настройки', category: 'system', description: 'Настройки системы OSI.',
        iconclass: 'bi-gear-fill text-ico-tech',
        resizable: true, canMinimize: true, showOnDesktop: true, showInStartMenu: true,
    }),
    // new OSIApp({
    //     id: 'osihelper', name: 'OSIHelper',
    //     label: 'OSI помощник', category: 'system', description: 'Справочная система и помощь по OSI.',
    //     iconclass: 'bi-info-square-fill text-ico-info',        
    //     defWidth: 600, defHeight: 700,
    //     resizable: true, canMinimize: true, showOnDesktop: true, showInStartMenu: true,
    // }),
    // new OSIApp({
    //     id: 'osicalendar', name: 'OSICalendar',
    //     label: 'Календарь', category: 'utilities', description: 'Системный календарь.',
    //     iconclass: 'bi-calendar2-date text-ico-purpure',
    //     isMaximized: true, resizable: true, canMinimize: true,
    // }),
    new OSIApp({
        id: 'osicalculator', name: 'OSICalculator',
        label: 'Калькулятор', category: 'utilities', description: 'Простой калькулятор для базовых вычислений.',
        iconclass: 'bi-calculator-fill text-ico-purpure',        
        defWidth: 400, defHeight: 670,
        canMinimize: true, showOnDesktop: true, showInStartMenu: true,
    }),
    new OSIApp({
        id: 'osimplayer', name: 'OSIMPlayer',
        label: 'MPlayer', category: 'utilities', description: 'Простейший музыкальный плеер.',
        iconclass: 'bi-cassette-fill text-ico-purpure',
        defWidth: 850, defHeight: 400,
        showOnDesktop: true, showInStartMenu: true,
    }),
    new OSIApp({
        id: 'osiappmanager', name: 'OSIAppManager',
        label: 'AppManager', category: 'system', description: 'Менеджер приложений OSI.',
        iconclass: 'bi-grid-3x3-gap-fill text-ico-tech',
        isMaximized: true, showInStartMenu: true,
    }),
    new OSIApp({
        id: 'osipicta', name: 'OSIPicta',
        label: 'Picta', category: 'utilities', description: 'Просмотр изображений.',
        iconclass: 'bi-easel-fill text-ico-purpure',
        isMaximized: true, canMinimize: true, showInStartMenu: true, showOnDesktop: true,
    }),
    new OSIApp({
        id: 'osidirdigger', name: 'OSIDirDigger',
        label: 'DirDigger', category: 'utilities', description: 'Файловый менеджер.',
        iconclass: 'bi-hdd-fill text-ico-purpure',
        defWidth: 850, defHeight: 600,
        resizable: true, isMaximized: true, canMinimize: true, showInStartMenu: true, showOnDesktop: true,
    }),
];

// const enrichedApplications = applications;

// Функция для создания асинхронного импорта
const createAsyncImport = (path) => {
    return () => import(/* @vite-ignore */ path);
};
// Обогащаем конфигурацию функциями импорта (ОСТАВИЛ КАК ЗАГОТОВКУ ДЛЯ БУДУЩИХ НАРАБОТОК)
const enrichedApplications = applications.map(app => ({
    ...app,
    // Автоматически создаем функцию импорта компонента
    asyncImport: createAsyncImport(app.componentPath),
    // Извлекаем имя компонента из пути (для отладки)
    // componentName: app.componentPath.split('/').pop().replace('.vue', '')
}));

// Вспомогательные функции
export const appsConfig = {
    // Получить все приложения
    getAllApps() { return enrichedApplications; },
  
    // Получить приложения для рабочего стола
    getDesktopApps() { return enrichedApplications.filter(app => app.showOnDesktop !== false); },
  
    // Получить приложения для меню "Пуск"
    getStartMenuApps() { return enrichedApplications.filter(app => app.showInStartMenu !== false); },
  
    // Получить приложение по ID
    getAppById(id) { return enrichedApplications.find(app => app.id === id); },
  
    // Получить приложение по имени
    getAppByName(name) { return enrichedApplications.find(app => app.name === name); },
  
    // Получить приложения по категории
    getAppsByCategory(category) { return enrichedApplications.filter(app => app.category === category); },
  
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
  
    // Получить функцию импорта компонента
    getAppImportFunction(appName) {
        const app = this.getAppByName(appName);
        
        return app?.asyncImport || null;
    }
};

export default enrichedApplications;