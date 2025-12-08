// Централизованная конфигурация всех приложений OSI
const applications = [
    {
        id: 'osihelper',   // Уникальный ID приложения
        name: 'osihelper',
        label: 'OSI помощник', // Отображаемое имя
        icon: 'ℹ️', // Иконка (можно эмодзи или путь к изображению)
        
        componentPath: '@/apps/system/OSIHelper/OSIHelper.vue', // Путь к компоненту Vue
        
        // Настройки окна по умолчанию
        window: {
            defWidth: 800,
            defHeight: 600,
            isMaximized: true,  // По умолчанию открывается развернутым
            isMinimized: false,
            resizable: true
        },

        showOnDesktop: true,
        showInStartMenu: true,
    
        description: 'Справочная система и помощь по OSI',   // Описание приложения
        category: 'system',  // Категория для группировки (опционально)     
    },
    {
        id: 'calculator',   // Уникальный ID приложения
        name: 'calculator',
        label: 'Калькулятор', // Отображаемое имя
        icon: '🧮', // Иконка (можно эмодзи или путь к изображению)
    
        componentPath: '@/apps/system/OSICalculator/OSICalculator.vue', // Путь к компоненту Vue
    
        // Настройки окна по умолчанию
        window: {
            defWidth: 400,
            defHeight: 670,
            isMaximized: false,
            isMinimized: false,
            resizable: true,
            // maximizable: true,
            // minimizable: true
        },

        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"
        
        description: 'Простой калькулятор для базовых вычислений',   // Описание приложения
        category: 'utilities',  // Категория для группировки (опционально)
    },    
    {
        id: 'wiki',   // Уникальный ID приложения
        name: 'wiki',
        label: 'Wikipedia', // Отображаемое имя
        icon: 'W', // Иконка (можно эмодзи или путь к изображению)
    
        componentPath: '@/apps/learn/AppWiki/AppWiki.vue', // Путь к компоненту Vue
        
        // Настройки окна по умолчанию
        window: {
            defWidth: 1024,
            defHeight: 768,
            isMaximized: true,
            isMinimized: false,
            resizable: true
        },

        showOnDesktop: true,    // Отображать на рабочем столе
        showInStartMenu: true,  // Отображать в меню "Пуск"

        description: 'Клиент для доступа к Wikipedia',   // Описание приложения
        category: 'learn',  // Категория для группировки (опционально)
    
        meta: { requiresInternet: true }
    },
    // Пример добавления новых приложений:
    /*
    {
        id: 'notepad',
        name: 'notepad',
        label: 'Блокнот',
        icon: '📝',
        componentPath: '@/apps/system/Notepad/Notepad.vue',
        window: {
        defWidth: 600,
        defHeight: 500,
        isMaximized: false
        },
        category: 'utilities',
        showOnDesktop: true
    }
    */
];

// Функция для создания асинхронного импорта
const createAsyncImport = (path) => {
  return () => import(/* @vite-ignore */ path);
};

// Обогащаем конфигурацию функциями импорта
const enrichedApplications = applications.map(app => ({
  ...app,
  // Автоматически создаем функцию импорта компонента
  asyncImport: createAsyncImport(app.componentPath),
  // Извлекаем имя компонента из пути (для отладки)
  componentName: app.componentPath.split('/').pop().replace('.vue', '')
}));

// Вспомогательные функции
export const appConfig = {
  // Получить все приложения
  getAllApps() {
    return enrichedApplications;
  },
  
  // Получить приложения для рабочего стола
  getDesktopApps() {
    return enrichedApplications.filter(app => app.showOnDesktop !== false);
  },
  
  // Получить приложения для меню "Пуск"
  getStartMenuApps() {
    return enrichedApplications.filter(app => app.showInStartMenu !== false);
  },
  
  // Получить приложение по ID
  getAppById(id) {
    return enrichedApplications.find(app => app.id === id);
  },
  
  // Получить приложение по имени
  getAppByName(name) {
    return enrichedApplications.find(app => app.name === name);
  },
  
  // Получить приложения по категории
  getAppsByCategory(category) {
    return enrichedApplications.filter(app => app.category === category);
  },
  
  // Получить иконку приложения
  getAppIcon(appId) {
    const app = this.getAppById(appId);
    return app?.icon || '📄';
  },
  
  // Получить настройки окна для приложения
  getWindowConfig(appId) {
    const app = this.getAppById(appId);
    return app?.window || {
      defWidth: 400,
      defHeight: 400,
      isMaximized: false
    };
  },
  
  // Получить функцию импорта компонента
  getAppImportFunction(appName) {
    const app = this.getAppByName(appName);
    return app?.asyncImport || null;
  }
};

export default enrichedApplications;