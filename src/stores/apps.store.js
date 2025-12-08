import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppsStore = defineStore('apps', () => {
    // Храним состояния окон по их ID
    const windowStates = ref({});
    
    // Сохранить состояние окна
    const saveWindowState = (windowId, state) => {
        if (!windowId) return;
        
        windowStates.value[windowId] = {
            ...windowStates.value[windowId],
            ...state,
            lastUpdated: Date.now()
        };
        
        console.log('State saved for window:', windowId, windowStates.value[windowId]);
    };
    
    // Получить состояние окна
    const getWindowState = (windowId) => {
        if (!windowId) return null;
        return windowStates.value[windowId] || null;
    };
    
    // Удалить состояние окна
    const deleteWindowState = (windowId) => {
        if (!windowId) return;
        delete windowStates.value[windowId];
    };
    
    // Очистить все состояния
    const clearAllStates = () => {
        windowStates.value = {};
    };
    
    // Получить состояние конкретного приложения по типу
    const getAppState = (appType, windowId) => {
        if (!windowId) return null;
        const state = windowStates.value[windowId];
        return state && state.appType === appType ? state : null;
    };
    
    return {
        windowStates,
        saveWindowState,
        getWindowState,
        deleteWindowState,
        clearAllStates,
        getAppState
    };
});