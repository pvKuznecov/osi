import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useOsStore = defineStore('os', () => {
    const windows = ref([]);
    const activeWindowId = ref(null);
    let nextZIndex = 100;
  
    // ОБЪЯВЛЯЕМ ФУНКЦИЮ ДО ТОГО КАК ОНА ИСПОЛЬЗУЕТСЯ
    const activateWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        if (window) {
            // Устанавливаем активное окно
            activeWindowId.value = windowId;
      
            // Обновляем z-index для всех окон
            windows.value.forEach(w => {
                if (w.id === windowId) {
                    // Активному окну даем самый высокий z-index
                    w.zIndex = nextZIndex++;
                }
            });
        }
    }
  
    const openWindow = (appName) => {
        const newWindow = {
            id: Date.now().toString(),
            appName: appName,
            title: `${appName} - Приложение`,
            isMinimized: false,
            isMaximized: false,
            zIndex: nextZIndex++
        };
    
        windows.value.push(newWindow);
        activateWindow(newWindow.id);
    
        return newWindow.id
    };
  
    const closeWindow = (windowId) => {
        const index = windows.value.findIndex(w => w.id === windowId);
        if (index !== -1) {
            windows.value.splice(index, 1);
        }
    };
  
    const minimizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        if (window) {
            window.isMinimized = true;
        }
    };
  
    const restoreWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        if (window) {
            window.isMinimized = false;
            activateWindow(windowId);
        }
    };
  
    const toggleMaximizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        if (window) {
            window.isMaximized = !window.isMaximized;
            activateWindow(windowId);
        }
    }
  
    return {
        windows,
        activeWindowId,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        toggleMaximizeWindow,
        activateWindow // Экспортируем
    }
})