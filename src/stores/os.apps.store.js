import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useOSIAppsStore = defineStore('osiapps', () => {
    const LOCALSTORAGE_KEY = "osiapps_store";

    let windows = ref([]);
    const activeWindowId = ref(null);

    let saveTimeout = null; // Сохраняем timeout ID в отдельной переменной
    let nextZIndex = 100;

    // Загружаем сохраненные окна из localStorage + id активного окна + определяем zindex
    const loadWindowsFromLS = () => {
        try {
            const saved = localStorage.getItem(LOCALSTORAGE_KEY);
            
            if (saved) {
                const parseData = JSON.parse(saved);

                if (parseData) {
                    // получаем + фиксируем массив элементов окон
                    windows.value = parseData.windows || [];
                    // получаем + фиксируем значение id активного окна
                    activeWindowId.value = parseData.activeWindowId || null;
                    // вычисляем текущий максимальный zindex
                    const maxZIndex = windows.value.reduce((max, w) => 
                        Math.max(max, w.zIndex || 100), 100
                    );
                    // фиксируем "следующий" zindex
                    nextZIndex = maxZIndex + 1;
                    
                    console.log('Loaded windows from storage:', windows.value.length);
                }
            }
        } catch (error) {
            // В случае ошибки: информируем в консоль и очищаем localStorage
            console.error('Failed to load OSI apps store:', error);
            localStorage.removeItem(LOCALSTORAGE_KEY);
        }
    };

    // Сохраняем окна в localStorage + id активного окна
    const saveWindowsFromLS = () => {
        try {
            const LSState = {
                windows: windows.value.map(w => ({
                    id: w.id,
                    appName: w.appName,
                    contentApp: w.contentApp,
                    title: w.title,
                    isMinimized: w.isMinimized,
                    isMaximized: w.isMaximized,
                    zIndex: w.zIndex,
                    defWidth: w.defWidth,
                    defHeight: w.defHeight,
                    wdata: w.wdata
                })),
                activeWindowId: activeWindowId.value
            };

            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(LSState));
        } catch (error) {
            console.error("Failed to save windows to localstorage:", error);
        }
    };

    // следим за изменениями окон ("сразу")
    watch(
        windows,
        (newWindows) => {
            console.log(newWindows);
            
            clearTimeout(saveTimeout);
            
            saveTimeout = setTimeout(() => {
                saveWindowsFromLS();
            }, 500);
        },
        { deep: true }
    );

    // инициализация local store
    loadWindowsFromLS();
  
    // активация окна
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
            saveWindowsFromLS();
        }
    };

    // Сохранить состояние окна
    const saveWindowState = (windowId, state) => {
        if (!windowId) {
            console.warn('Cannot save window state: windowId is required');
            return;
        }
        
        let newWindows = [];
        windows.value.forEach(w => {
            if (w.id === windowId) {
                w.wdata = {
                    ...state,
                    lastUpdated: Date.now(),
                };
            }

            newWindows.push(w);
        });

        windows = newWindows;
        
        console.log('State saved for window:', windowId);
    };

    // Получить состояние окна
    const getWindowState = (windowId) => {
        if (!windowId) {
            console.warn('Cannot get window state: windowId is required');
            return null;
        }
        
        // let resultValue;
        // windows.value.forEach(w => {
        //     if (w.id === windowId) {
        //         resultValue = w.wdata;
        //         return true;
        //     }
        // });
        // return resultValue || null;

        const existingWindow = windows.value.find(w => w.id === windowId );

        if (existingWindow && existingWindow.wdata) {
            return existingWindow.wdata;
        } else {
            return null;
        }        
    };

    // Удалить состояние окна
    const deleteWindowState = (windowId) => {
        if (!windowId) {
            console.warn('Cannot delete window state: windowId is required');
            return;
        }

        let newWindows = [];

        windows.value.forEach(w => {
            if (w.id === windowId) {
                w.wdata = {};
            }

            newWindows.push(w);
        });

        windows = newWindows;
        console.log('State deleted for window:', windowId);
    };

    // Получить статистику по состояниям
    const getStats = () => {
        const byAppType = {};

        windows.value.forEach(w => {
            const state = w;
            const type = state.wdata.appType || 'unknown';
            byAppType[type] = (byAppType[type] || 0) + 1;
        });

        return {
            totalWindows: windows.value.length,
            byAppType,
            // lastUpdate: Math.max(...windows.map(id => windowStates.value[id]?.lastUpdated || 0))
        };
        // const windows = Object.keys(windowStates.value);
        // const byAppType = {};
        
        // windows.forEach(windowId => {
        //     const state = windowStates.value[windowId];
        //     const type = state?.appType || 'unknown';
        //     byAppType[type] = (byAppType[type] || 0) + 1;
        // });
        
        // return {
        //     totalWindows: windows.length,
        //     byAppType,
        //     lastUpdate: Math.max(...windows.map(id => windowStates.value[id]?.lastUpdated || 0))
        // };
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
            defHeight: appData.defHeight || 400,
            wdata: {}
        };
    
        windows.value.push(newWindow);
        activateWindow(newWindow.id);
        
        // Сохраняем при создании окна
        saveWindowsFromLS();
    
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
            saveWindowsFromLS();
        }
    };

    const minimizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
        
        if (window) {
            window.isMinimized = true;
            saveWindowsFromLS();
        }
    };
    
    const restoreWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);
    
        if (window) {
            window.isMinimized = false;
            activateWindow(windowId);
            saveWindowsFromLS();
        }
    };

    const toggleMaximizeWindow = (windowId) => {
        const window = windows.value.find(w => w.id === windowId);

        if (window) {
            window.isMaximized = !window.isMaximized;
            activateWindow(windowId);
            saveWindowsFromLS();
        }
    };

    // Метод для очистки всех окон
    const clearAllWindows = () => {
        windows.value = [];
        activeWindowId.value = null;
        localStorage.removeItem(LOCALSTORAGE_KEY);
    };

    const detectBrowser = () => {
        const ua = navigator.userAgent;
        let tem;
        let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        
        if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            return { name: 'IE', version: (tem[1] || '') };
        }
        
        if (M[1] === 'Chrome') {
            tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
            if (tem != null) {
                return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] };
            }
        }
        
        M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
        
        if ((tem = ua.match(/version\/(\d+)/i)) != null) {
            M.splice(1, 1, tem[1]);
        }
        
        return {
            name: M[0],
            version: M[1]
        };
    };

    const getLocalStorageUsage = () => {
        try {
            let totalBytes = 0;
            let entries = [];
            
            for(let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                const keySize = key.length * 2; // UTF-16: 2 байта на символ
                const valueSize = value.length * 2;
                const entrySize = keySize + valueSize;
                
                totalBytes += entrySize;
                
                entries.push({
                    key,
                    keySize: `${key.length} симв (${keySize} байт)`,
                    valueSize: `${value.length} симв (${valueSize} байт)`,
                    totalSize: `${(entrySize / 1024).toFixed(2)} KB`,
                    valuePreview: value.length > 100 ? value.substring(0, 100) + '...' : value
                });
            }
            
            return {
                total: {
                    bytes: totalBytes,
                    kilobytes: (totalBytes / 1024).toFixed(2),
                    megabytes: (totalBytes / (1024 * 1024)).toFixed(4),
                    entries: localStorage.length
                },
                entries,
                limit: {
                    // Обычный лимит для большинства браузеров
                    standard: '5 MB',
                    // Текущее использование в процентах (примерно)
                    usedPercent: ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1)
                }
            };
        } catch (error) {
            console.error('Error calculating localStorage usage:', error);
            return null;
        }
    };

    return {
        windows,
        activateWindow,
        saveWindowState,
        getWindowState,
        deleteWindowState,
        openWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        toggleMaximizeWindow,
        clearAllWindows,
        getStats,
        getLocalStorageUsage,
        detectBrowser
    };
});