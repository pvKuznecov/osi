import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOsStore = defineStore('os', () => {
    const windows = ref([]);
    const activeWindowId = ref(null);
  
    const openWindow = (appName) => {
        const newWindow = {
            id: Date.now().toString(),
            appName: appName,
            title: `${appName} - Приложение`,
            isMinimized: false
        };
    
        windows.value.push(newWindow);
        activeWindowId.value = newWindow.id;
    
        return newWindow.id;
    }
  
    const closeWindow = (windowId) => {
        const index = windows.value.findIndex(w => w.id === windowId);
    
        if (index !== -1) {
            windows.value.splice(index, 1);
        }
    }
  
    return {
        windows,
        activeWindowId,
        openWindow,
        closeWindow
    }
})