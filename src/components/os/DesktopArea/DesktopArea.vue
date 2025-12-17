<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOSIAppsStore } from '@/stores/os.apps.store';
    // import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications'

    export default {
        name: "DesktopArea",
  
        data() {
            return {
                apps: [
                    // { name: 'osihelper', label: 'OSI помощник', icon: 'ℹ️', contentapp: 'OSIHelper', defWidth: 600, defHeight: 700 },
                    // { name: 'calculator', label: 'Калькулятор', icon: '🧮', contentapp: 'OSICalculator', defWidth: 400, defHeight: 670 },
                    // { name: 'osisettings', label: 'Настройки', icon: '⚙️', contentapp: 'OSISettings', defWidth: 800, defHeight: 400 },

                    // { name: 'wiki', label: 'Wikipedia', icon: 'W', contentapp: 'AppWiki', isMaximized: true },
                    // { name: 'notepad', label: 'Блокнот', icon: '📝', contentapp: 'Notepad' },
                    // { name: 'explorer', label: 'Проводник', icon: '📁', contentapp: 'Explorer' },
                    // { name: 'settings', label: 'Настройки', icon: '⚙️', contentapp: 'Settings' },
                ]
            }
        },
  
        computed: {
            // desktopStyle() {
            //     return {
            //         backgroundColor: '#0078d4',
            //         backgroundImage: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)'
            //     };
            // },
            desktopStyle() {
                return {
                    backgroundImage: `url(${this.getWallpaperUrl()})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }
            },
    
            osStore() {
                // return useOsStore();
                return useOSIAppsStore();
            }
        },
  
        methods: {
            getWallpaperUrl() {
                return require('@/assets/wallpapers/nwall.jpg');
            },
            
            activateDesktop() {
                this.osStore.activeWindowId = null;
            },
    
            // launchApp(appName, contentApp) {
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
            }
        },

        mounted() {
            this.apps = appsConfig.getDesktopApps();
        }
    }
</script>