<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
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
            deskApps() {
                const usersAppsId = this.USERApps
                    .filter(app => app.showOnDesktop)
                    .map(app => app.id);

                return this.apps
                    .filter(app => usersAppsId.includes(app.id))
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
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
    
            async launchApp(appData) {          
                console.log('appData', appData);
                if (!this.USERID) {
                    console.error('USERID not set');
                    return;
                }
                
                try {
                    // Ищем существующее окно по конфигурации приложения
                    const existWindow_byConfig = await usersTable.windows.getWindow_byConfig(this.USERID, appData);
                    
                    // окно есть и оно свернуто
                    if (existWindow_byConfig && existWindow_byConfig.isMinimized) {                        
                        // Вариант 1: Используем activate (рекомендуется, если activate снимает свернутость)
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                        
                        // Вариант 2: Если есть отдельный метод restore
                        // if (usersTable.windows.restore) {
                        //     await usersTable.windows.restore(this.USERID, existWindow_byConfig.id);
                        // } else {
                        //     await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                        // }
                    } else if (existWindow_byConfig) {  // окно есть и оно НЕ свернуто
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                    } else {    // окна нет - создаем новое                        
                        // Создаем новое окно с параметрами из appData
                        await usersTable.windows.create(this.USERID, { 
                            ...appData,
                            isMinimized: false, // Новое окно не свернуто
                            // isMaximized: appData.isMaximized,
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