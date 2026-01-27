<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications'

    export default {
        name: "DesktopArea",

        props: { USERID: {type: Number, default: 0} },
  
        data() {
            return {
                apps: [],
                bgWallpapper: null,
                USERApps: [],
                USER: null,
                desktopStyle: {},
            }
        },

        provide() {
            return {
                changeWallpaper: this.changeWallpaper,
                reloadDesk: this.reloadDesk,
            };
        },
  
        computed: {    
            osStore() { return useOsStore(); },

            deskApps() {
                const allApps = this.apps;
                const usersApps = this.USERApps.filter(function(val) {
                    return val.showOnDesktop;
                });
                const usersAppsId = usersApps.map(app => app.id);

                return allApps.filter(function(elem) {
                    return usersAppsId.includes(elem.id);
                });
            },
        },
  
        methods: {
            async reloadDesk() {
                this.reReqUserConfig();
                
                const defAppsList = appsConfig.getAllApps();
                const findUserApps = await usersTable.getApps(this.USERID);

                await this.findUser();

                this.apps = defAppsList;
                this.USERApps = (findUserApps) ? findUserApps : defAppsList;
            },

            async findUser() {
                try {
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

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

            async changeWallpaper(inpName) {
                try {
                    const nUser = this.USER;

                    nUser.systemconfig.desktopWallpaper = inpName;

                    this.USER = await usersTable.save(nUser);
                    this.reReqUserConfig();

                    return this.USER;
                } catch(error) {
                    console.error('Ошибка изменения изображения:', error);

                    return {};
                }
            },

            reReqUserConfig() {
                this.findUser();
                
                setTimeout(() => {
                    const userImg = (this.USER) ? `url(${require('@/assets/wallpapers/' + this.USER.systemconfig.desktopWallpaper)})` : false;
                    const defaultImg = `url(${require('@/assets/wallpapers/abacus.jpg')})`;
                        
                    this.desktopStyle = {
                        backgroundImage: userImg || defaultImg,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    };
                }, 300);            
            },
        },

        // mounted() {            
        //     this.apps = appsConfig.getDesktopApps();

        //     this.reReqUserConfig();
        // }

        async mounted() {
            this.reReqUserConfig();
            
            const defAppsList = appsConfig.getAllApps();
            const findUserApps = await usersTable.getApps(this.USERID);

            await this.findUser();

            this.apps = defAppsList;
            this.USERApps = (findUserApps) ? findUserApps : defAppsList;
        },
    }
</script>