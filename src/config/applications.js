// Централизованная конфигурация всех приложений OSI
const applications = [
    {
        id: 'osisettings',
        name: 'OSISettings',
        label: 'Настройки',
        icon: '',
        iconclass: 'bi-gear-fill text-ico-tech',
        description: 'Настройки системы OSI.',   // Описание приложения

        defWidth: 800,
        defHeight: 450,
        isMaximized: false,  // По умолчанию НЕ открывается развернутым
        resizable: true,
        canMinimize: true,

        // componentPath: '@/apps/system/OSISettings/OSISettings.vue', // Путь к компоненту Vue
        
        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"
        
        category: 'system',  // Категория для группировки (опционально)
    },
    {
        id: 'osihelper',
        name: 'OSIHelper',
        label: 'OSI помощник',
        icon: '',
        iconclass: 'bi-info-square-fill text-ico-info',
        description: 'Справочная система и помощь по OSI.',   // Описание приложения
        
        defWidth: 600,
        defHeight: 700,
        isMaximized: false,  // По умолчанию НЕ открывается развернутым
        resizable: true,
        canMinimize: true,

        // componentPath: '@/apps/system/OSIHelper/OSIHelper.vue', // Путь к компоненту Vue
        
        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"
        
        category: 'system',  // Категория для группировки (опционально)
    },
    {
        id: 'osicalendar',
        name: 'OSICalendar',
        label: 'Календарь',
        icon: '',
        iconclass: 'bi-calendar2-date text-ico-purpure',
        description: 'Системный календарь.',
        
        isMaximized: true,  // По умолчанию НЕ открывается развернутым
        resizable: true,
        canMinimize: true,

        // componentPath: '@/apps/system/OSICalendar/OSICalendar.vue', // Путь к компоненту Vue
        
        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"

        category: 'utilities',  // Категория для группировки (опционально)

    },
    {
        id: 'osicalculator',
        name: 'OSICalculator',
        label: 'Калькулятор',
        icon: '',
        iconclass: 'bi-calculator-fill text-ico-purpure',
        description: 'Простой калькулятор для базовых вычислений.',   // Описание приложения

        defWidth: 400,
        defHeight: 670,
        isMaximized: false,  // По умолчанию НЕ открывается развернутым
        resizable: false,
        canMinimize: true,
        
        // componentPath: '@/apps/system/OSICalculator/OSICalculator.vue', // Путь к компоненту Vue
        
        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"

        category: 'utilities',  // Категория для группировки (опционально)
    },
    {
        id: 'osimplayer',
        name: 'OSIMPlayer',
        label: 'MPlayer',
        icon: '',
        iconclass: 'bi-cassette-fill text-ico-purpure',
        description: 'Простейший музыкальный плеер.',   // Описание приложения

        defWidth: 850,
        defHeight: 400,
        isMaximized: false,  // По умолчанию НЕ открывается развернутым
        resizable: false,
        canMinimize: false,

        // componentPath: '@/apps/system/OSIMPlayer/OSIMPlayer.vue', // Путь к компоненту Vue
        
        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"
        
        category: 'utilities',  // Категория для группировки (опционально)
    }
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
        console.log("app", app);
        
        return app?.asyncImport || null;
    }
};

export default enrichedApplications;