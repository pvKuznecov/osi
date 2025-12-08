import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useAppsStore = defineStore('apps', () => {
    // Храним состояния окон по их ID
    const windowStates = ref({});
    
    // Сохраняем timeout ID в отдельной переменной
    let saveTimeout = null;

    const LOCALSTORAGE_KEY = "osi_app_store";
    
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(LOCALSTORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                windowStates.value = parsed || {};
                console.log('Loaded app states from localStorage:', Object.keys(windowStates.value).length, 'windows');
            }
        } catch (error) {
            console.error('Failed to load app states from localStorage:', error);
            // В случае ошибки очищаем localStorage
            localStorage.removeItem(LOCALSTORAGE_KEY);
        }
    };

    const saveToStorage = () => {
        try {
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(windowStates.value));
        } catch (error) {
            console.error('Failed to save app states to localStorage:', error);
        }
    };

    watch(
        windowStates,
        (newStates) => {
            console.log(newStates);
            
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
    const saveWindowState = (windowId, state) => {
        if (!windowId) {
            console.warn('Cannot save window state: windowId is required');
            return;
        }
        
        windowStates.value[windowId] = {
            ...windowStates.value[windowId],
            ...state,
            lastUpdated: Date.now(),
            windowId: windowId
        };
        
        console.log('State saved for window:', windowId, windowStates.value[windowId]);
    };
    
    // Получить состояние окна
    const getWindowState = (windowId) => {
        if (!windowId) {
            console.warn('Cannot get window state: windowId is required');
            return null;
        }
        return windowStates.value[windowId] || null;
    };
    
    // Удалить состояние окна
    const deleteWindowState = (windowId) => {
        if (!windowId) {
            console.warn('Cannot delete window state: windowId is required');
            return;
        }
        
        delete windowStates.value[windowId];
        console.log('State deleted for window:', windowId);
    };
    
    // Очистить все состояния
    const clearAllStates = () => {
        windowStates.value = {};
        localStorage.removeItem(LOCALSTORAGE_KEY);
        console.log('All app states cleared');
    };
    
    // Получить состояние конкретного приложения по типу
    const getAppState = (appType, windowId) => {
        if (!windowId) return null;
        const state = windowStates.value[windowId];
        return state && state.appType === appType ? state : null;
    };

    // Получить все состояния определенного типа приложения
    const getAllAppStates = (appType) => {
        return Object.entries(windowStates.value)
            .filter(([, state]) => state.appType === appType)
            .map(([windowId, state]) => ({ windowId, ...state }));
    };
    
    // Получить статистику по состояниям
    const getStats = () => {
        const windows = Object.keys(windowStates.value);
        const byAppType = {};
        
        windows.forEach(windowId => {
            const state = windowStates.value[windowId];
            const type = state?.appType || 'unknown';
            byAppType[type] = (byAppType[type] || 0) + 1;
        });
        
        return {
            totalWindows: windows.length,
            byAppType,
            lastUpdate: Math.max(...windows.map(id => windowStates.value[id]?.lastUpdated || 0))
        };
    };
    
    // Экспортируем также функцию для ручного сохранения
    const forceSave = () => {
        saveToStorage();
    };

    return {
        windowStates,
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