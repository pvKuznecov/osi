<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications'

    export default {
        name: "DesktopArea",
  
        data() {
            return {
                apps: [],
                bgWallpapper: null,
            }
        },

        provide() {
            return {
                changeWallpaper: this.changeWallpaper
            };
        },
  
        computed: {
            desktopStyle() {
                const defaultImg = `url(${this.getWallpaperUrl()})`;
                return {
                    backgroundImage: this.bgWallpapper || defaultImg,
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
                return require('@/assets/wallpapers/abacus.jpg');
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
            },

            changeWallpaper(inpName) {
                try {
                    // require() возвращает модуль, нужно использовать .default
                    const imageModule = require(`@/assets/wallpapers/${inpName}.jpg`);
                    const imagePath = imageModule.default || imageModule;
                    console.log('imagePath', imagePath);
                
                    const block = document.getElementById('desktop-area');
                    
                    if (block) {
                        // block.style.backgroundImage = `url("${imagePath}")`;
                        this.bgWallpapper = `url("${imagePath}")`;
                        console.log('Фон обновлён:', imagePath);
                    } else {
                        console.error('Элемент desktop-area не найден');
                    }
                } catch (error) {
                    console.error('Ошибка загрузки изображения:', error);
                }
            },
        },

        mounted() {
            this.apps = appsConfig.getDesktopApps();
        }
    }
</script>