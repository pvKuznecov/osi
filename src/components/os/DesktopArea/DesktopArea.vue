<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    // import { useOsStore } from '@/stores/os.store';
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
            // osStore() { return useOsStore(); },

            deskApps() {
                const allApps = this.apps;
                const usersApps = this.USERApps.filter(function(val) {
                    return val.showOnDesktop;
                });
                console.log('usersApps', usersApps);
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
            
            // activateDesktop() {
            //     this.osStore.activeWindowId = null;
            // },
    
            async launchApp(appData) {
                console.log('DesktopArea launchApp called with:', appData);
                
                if (!this.USERID) {
                    console.error('USERID not set');
                    return;
                }
                
                try {
                    // Ищем существующее окно по конфигурации приложения
                    const existWindow_byConfig = await usersTable.windows.getWindow_byConfig(this.USERID, appData);
                    console.log('existWindow_byConfig', existWindow_byConfig);
                    
                    // окно есть и оно свернуто
                    if (existWindow_byConfig && existWindow_byConfig.isMinimized) {
                        console.log('point-2 - Window exists and is minimized, restoring...');
                        
                        // Вариант 1: Используем activate (рекомендуется, если activate снимает свернутость)
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                        
                        // Вариант 2: Если есть отдельный метод restore
                        // if (usersTable.windows.restore) {
                        //     await usersTable.windows.restore(this.USERID, existWindow_byConfig.id);
                        // } else {
                        //     await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                        // }
                        
                    // окно есть и оно НЕ свернуто
                    } else if (existWindow_byConfig) {
                        console.log('point-3 - Window exists and is visible, activating...');
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                        
                    // окна нет - создаем новое
                    } else {
                        console.log('point-4 - No window exists, creating new...');
                        
                        // Создаем новое окно с параметрами из appData
                        await usersTable.windows.create(this.USERID, { 
                            ...appData,
                            // Можно добавить значения по умолчанию
                            defWidth: appData.defWidth || 800,
                            defHeight: appData.defHeight || 600,
                            isMinimized: false, // Новое окно не свернуто
                            isMaximized: false
                        });
                    }
                    
                    // Обновляем список окон для синхронизации
                    await usersTable.windows.reupdate(this.USERID);
                    
                    console.log('Launch app completed');
                    
                } catch (error) {
                    console.error('Error in launchApp:', error);
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
            console.log('findUserApps', findUserApps);

            await this.findUser();

            this.apps = defAppsList;
            this.USERApps = (findUserApps) ? findUserApps : defAppsList;
        },
    }
</script>