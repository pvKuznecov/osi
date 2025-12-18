import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';
// import { reactive, watch, toRefs } from 'vue';

export const useAppsStore = defineStore('apps', () => {
    const state = reactive({
        windowStates: {}
    });
    // // Храним состояния окон по их ID
    // const windowStates = ref({});
    
    // Сохраняем timeout ID в отдельной переменной
    let saveTimeout = null;

    const LOCALSTORAGE_KEY = "osi_app_store";
    
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(LOCALSTORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                state.windowStates = parsed || {};
                console.log('Loaded app states from localStorage:', Object.keys(state.windowStates).length, 'windows');
            }
        } catch (error) {
            console.error('Failed to load app states from localStorage:', error);
            localStorage.removeItem(LOCALSTORAGE_KEY);
        }
    };

    const saveToStorage = () => {
        console.log("|| saveToStorage");
        console.log("windowStates", state.windowStates);
        try {
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state.windowStates));
        } catch (error) {
            console.error('Failed to save app states to localStorage:', error);
        }
    };

    // Watch на реактивный объект
    watch(
        () => state.windowStates,
        () => {
            clearTimeout(saveTimeout);
            
            saveTimeout = setTimeout(() => {
                saveToStorage();
            }, 500);
        },
        { deep: true }
    );

    // инициализация local store
    loadFromStorage();
    
    // Сохранить состояние окна
    const saveWindowState = (windowId, stateData) => {
        if (!windowId) {
            console.warn('Cannot save window state: windowId is required');
            return;
        }
        
        state.windowStates[windowId] = {
            ...state.windowStates[windowId],
            ...stateData,
            lastUpdated: Date.now(),
            windowId: windowId
        };
        
        console.log('State saved for window:', windowId, state.windowStates[windowId]);
    };
    
    // Получить состояние окна
    const getWindowState = (windowId) => {
        if (!windowId) {
            console.warn('Cannot get window state: windowId is required');
            return null;
        }
        return state.windowStates[windowId] || null;
    };
    
    // Удалить состояние окна
    const deleteWindowState = (windowId) => {        
        if (!windowId) {
            console.warn('Cannot delete window state: windowId is required');
            return;
        }

        // 1. Удаляем из текущего состояния
        if (state.windowStates[windowId]) {
            delete state.windowStates[windowId];
            
            // 2. Создаем новый объект для триггера реактивности
            state.windowStates = { ...state.windowStates };
            
            // 3. Немедленно сохраняем в localStorage
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state.windowStates));
            
            console.log('State deleted for window:', windowId);
            console.log('LocalStorage updated');
        } else {
            console.warn('Window state not found:', windowId);
        }
    };
    
    // Очистить все состояния
    const clearAllStates = () => {
        state.windowStates = {};
        localStorage.removeItem(LOCALSTORAGE_KEY);
        console.log('All app states cleared');
    };
    
    // Получить состояние конкретного приложения по типу
    const getAppState = (appType, windowId) => {
        if (!windowId) return null;
        const stateData = state.windowStates[windowId];
        return stateData && stateData.appType === appType ? stateData : null;
    };

    // Получить все состояния определенного типа приложения
    const getAllAppStates = (appType) => {
        return Object.entries(state.windowStates)
            .filter(([, stateData]) => stateData.appType === appType)
            .map(([windowId, stateData]) => ({ windowId, ...stateData }));
    };
    
    // Получить статистику по состояниям
    const getStats = () => {
        const windows = Object.keys(state.windowStates);
        const byAppType = {};
        
        windows.forEach(windowId => {
            const stateData = state.windowStates[windowId];
            const type = stateData?.appType || 'unknown';
            byAppType[type] = (byAppType[type] || 0) + 1;
        });
        
        return {
            totalWindows: windows.length,
            byAppType,
            lastUpdate: Math.max(...windows.map(id => state.windowStates[id]?.lastUpdated || 0))
        };
    };
    
    // Экспортируем также функцию для ручного сохранения
    const forceSave = () => {
        saveToStorage();
    };

    return {
        // Экспортируем как computed свойство для реактивности
        windowStates: () => state.windowStates,
        saveWindowState,
        getWindowState,
        deleteWindowState,
        clearAllStates,
        getAppState,
        getAllAppStates,
        getStats,
        forceSave
    };
});