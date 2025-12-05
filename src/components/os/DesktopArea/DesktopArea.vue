<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';

    export default {
        name: "DesktopArea",
  
        data() {
            return {
                apps: [
                    { name: 'notepad', label: 'Блокнот', icon: '📝' },
                    { name: 'explorer', label: 'Проводник', icon: '📁' },
                    { name: 'calculator', label: 'Калькулятор', icon: '🧮' },
                    { name: 'settings', label: 'Настройки', icon: '⚙️' }
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
    
            launchApp(appName) {
                const existingWindows = this.osStore.windows.filter(
                    w => w.appName === appName && !w.isMinimized
                );
      
                if (existingWindows.length > 0) {
                    this.osStore.activateWindow(existingWindows[0].id);
                } else {
                    this.osStore.openWindow(appName);
                }
            }
        }
    }
</script>