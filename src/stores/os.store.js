import { defineStore } from 'pinia'
import { ref } from 'vue'

// import { OSIHelper } from '@/apps/system/OSIHelper/OSIHelper.vue';

export const useOsStore = defineStore('os', () => {
    const windows = ref([]);
    const activeWindowId = ref(null);
    
    let nextZIndex = 100;
  
    const activateWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        
        if (window) {
            activeWindowId.value = windowId;
            windows.value.forEach(w => {
                if (w.id === windowId) {
                    w.zIndex = nextZIndex++;
                }
            });
        }
    };
  
    const openWindow = (appData) => {
        const appName = appData.name;
        const appTitle = appData.label;
        const contentApp = appData.contentapp;

        const newWindow = {
            ...appData,
            id: Date.now().toString(),
            appName: appName,
            contentApp: contentApp,
            title: appTitle,
            isMinimized: (appData.isMinimized) ? appData.isMinimized : false,
            isMaximized: (appData.isMaximized) ? appData.isMaximized : false,            
            zIndex: nextZIndex++            
        };
    
        windows.value.push(newWindow);
        activateWindow(newWindow.id);
    
        return newWindow.id;
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
        activateWindow
    }
})