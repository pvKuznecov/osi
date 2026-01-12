<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    // import { useOSIAppsStore } from '@/stores/os.apps.store';
    import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications';

    export default {
        name: "TaskBar",
  
        data() {
            return {
                currentTime: '',
                timer: null,
                showMenu: false,
            };
        },
  
        computed: {
            osStore() {
                return useOsStore();
            },

            appsList() {
                const SMApps = appsConfig.getStartMenuApps();
                return SMApps.sort((n1, n2) => (n1.label.toLowerCase() >= n2.label.toLowerCase()) ? 1 : -1);
            }
        },
  
        methods: {
            updateTime() {
                const now = new Date();
                this.currentTime = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            },
    
            toggleWindow(windowId) {
                const window = this.osStore.windows.find(w => w.id === windowId);
                
                if (window) {
                    console.log('window', window);
                    if (window.isMinimized) {
                        this.osStore.restoreWindow(windowId);
                    } else {
                        this.osStore.activateWindow(windowId);
                    }
                }
            },
    
            toggleStartMenu() {
                this.showMenu = !this.showMenu;
            },

            launchApp(appData) {
                const appName = appData.name;
                const contentApp = appData.contentapp;

                // Ищем окно по windowId или по типу приложения
                const existingWindow = this.osStore.windows.find(
                    w => w.appName === appName && w.contentApp === contentApp
                );
                
                if (existingWindow) {
                    // Если окно существует, активируем его
                    if (existingWindow.isMinimized) {
                        this.osStore.restoreWindow(existingWindow.id);
                    } else {
                        this.osStore.activateWindow(existingWindow.id);
                    }
                } else {
                    // Создаем новое окно
                    this.osStore.openWindow({
                        ...appData,
                        defWidth: appData.defWidth || 800,
                        defHeight: appData.defHeight || 600
                    });
                }

                this.toggleStartMenu();
            }
        },
  
        mounted() {
            this.updateTime();
            this.timer = setInterval(this.updateTime, 1000);
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>