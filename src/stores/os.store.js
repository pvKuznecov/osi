// os.store.js - обновленная версия
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOsStore = defineStore('os', () => {
    const windows = ref([]);
    const activeWindowId = ref(null);
    
    let nextZIndex = 100;
    
    // Загружаем сохраненные окна из localStorage при инициализации
    const loadWindowsFromStorage = () => {
        try {
            const saved = localStorage.getItem('os_windows_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.windows)) {
                    windows.value = parsed.windows;
                    activeWindowId.value = parsed.activeWindowId || null;
                    
                    // Находим максимальный zIndex
                    const maxZIndex = windows.value.reduce((max, w) => 
                        Math.max(max, w.zIndex || 100), 100
                    );
                    nextZIndex = maxZIndex + 1;
                    
                    console.log('Loaded windows from storage:', windows.value.length);
                }
            }
        } catch (error) {
            console.error('Failed to load windows from storage:', error);
        }
    };
    
    // Сохраняем окна в localStorage
    const saveWindowsToStorage = () => {
        try {
            const state = {
                windows: windows.value.map(w => ({
                    id: w.id,
                    appName: w.appName,
                    contentApp: w.contentApp,
                    title: w.title,
                    isMinimized: w.isMinimized,
                    isMaximized: w.isMaximized,
                    zIndex: w.zIndex,
                    defWidth: w.defWidth,
                    defHeight: w.defHeight
                })),
                activeWindowId: activeWindowId.value
            };
            localStorage.setItem('os_windows_state', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save windows to storage:', error);
        }
    };
    
    // Инициализация
    loadWindowsFromStorage();
  
    const activateWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        
        if (window) {
            activeWindowId.value = windowId;
            windows.value.forEach(w => {
                if (w.id === windowId) {
                    w.zIndex = nextZIndex++;
                }
            });
            
            // Сохраняем при активации окна
            saveWindowsToStorage();
        }
    };
  
    const openWindow = (appData) => {
        const appName = appData.name;
        const appTitle = appData.label;
        const contentApp = appData.contentapp;

        // Проверяем, есть ли уже такое окно
        const existingWindow = windows.value.find(w => 
            w.appName === appName && w.contentApp === contentApp
        );
        
        if (existingWindow) {
            // Если окно уже есть, активируем его
            if (existingWindow.isMinimized) {
                restoreWindow(existingWindow.id);
            } else {
                activateWindow(existingWindow.id);
            }
            return existingWindow.id;
        }
        
        // Создаем новое окно
        const newWindow = {
            ...appData,
            id: 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            appName: appName,
            contentApp: contentApp,
            title: appTitle,
            isMinimized: false,
            isMaximized: appData.isMaximized || false,            
            zIndex: nextZIndex++,
            defWidth: appData.defWidth || 400,
            defHeight: appData.defHeight || 400
        };
    
        windows.value.push(newWindow);
        activateWindow(newWindow.id);
        
        // Сохраняем при создании окна
        saveWindowsToStorage();
    
        return newWindow.id;
    };
  
    const closeWindow = (windowId) => {
        const index = windows.value.findIndex(w => w.id === windowId);
        
        if (index !== -1) {
            windows.value.splice(index, 1);
            
            // Если закрыли активное окно, активируем другое
            if (activeWindowId.value === windowId) {
                activeWindowId.value = windows.value.length > 0 
                    ? windows.value[windows.value.length - 1].id 
                    : null;
            }
            
            // Сохраняем при закрытии окна
            saveWindowsToStorage();
        }
    };
  
    const minimizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        
        if (window) {
            window.isMinimized = true;
            saveWindowsToStorage();
        }
    };
  
    const restoreWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
    
        if (window) {
            window.isMinimized = false;
            activateWindow(windowId);
            saveWindowsToStorage();
        }
    };
  
    const toggleMaximizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);

        if (window) {
            window.isMaximized = !window.isMaximized;
            activateWindow(windowId);
            saveWindowsToStorage();
        }
    };
    
    // Метод для очистки всех окон
    const clearAllWindows = () => {
        windows.value = [];
        activeWindowId.value = null;
        localStorage.removeItem('os_windows_state');
    };
  
    return {
        windows,
        activeWindowId,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        toggleMaximizeWindow,
        activateWindow,
        clearAllWindows,
        saveWindowsToStorage // Экспортируем для ручного сохранения
    };
});