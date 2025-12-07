<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';

    export default {
        name: "DesktopArea",
  
        data() {
            return {
                apps: [
                    { name: 'notepad', label: 'Блокнот', icon: '📝', contentapp: 'Notepad' },
                    { name: 'explorer', label: 'Проводник', icon: '📁', contentapp: 'Explorer' },
                    { name: 'calculator', label: 'Калькулятор', icon: '🧮', contentapp: 'OSICalculator', defWidth: 400, defHeight: 660 },
                    { name: 'settings', label: 'Настройки', icon: '⚙️', contentapp: 'Settings' },
                    { name: 'osihelper', label: 'OSI помощник', icon: 'ℹ️', contentapp: 'OSIHelper', isMaximized: true }
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
                return useOsStore();
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
                // const contentApp = appData.contentapp;

                const existingWindows = this.osStore.windows.filter(
                    w => w.appName === appName && !w.isMinimized
                );
      
                if (existingWindows.length > 0) {
                    this.osStore.activateWindow(existingWindows[0].id);
                } else {
                    this.osStore.openWindow(appData);
                    // this.osStore.openWindow(appName, contentApp);
                }
            }
        }
    }
</script>