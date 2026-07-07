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
                deskContextApps: [],
                dappPreventInfo: null,
                deskPreventInfo: null,
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
                if (!this.USERID) {
                    console.error('USERID not set');
                    return;
                }
                
                try {
                    // Ищем существующее окно по конфигурации приложения
                    const existWindow_byConfig = await usersTable.windows.getWindow_byConfig(this.USERID, appData);
                    
                    // окно есть и оно свернуто
                    if (existWindow_byConfig && existWindow_byConfig.isMinimized) {                        
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                    } else if (existWindow_byConfig) {  // окно есть и оно НЕ свернуто
                        await usersTable.windows.activate(this.USERID, existWindow_byConfig.id);
                    } else {
                        // окна нет - создаем новое                        
                        // Создаем "чистую" копию fileData без прокси
                        const cleanFileData = appData.fileData ? {
                            id: appData.fileData.id,
                            name: appData.fileData.name,
                            type: appData.fileData.type,
                            size: appData.fileData.size,
                            parentid: appData.fileData.parentid,
                            userid: appData.fileData.userid,
                            blob: appData.fileData.blob || null,
                        } : null;
                        
                        // Создаем новое окно с параметрами из appData
                        const newWindow = { 
                            ...appData,
                            id: `win_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                            isMinimized: false,
                            fileData: cleanFileData  // Сохраняем чистую копию
                        };
                        
                        await usersTable.windows.create(this.USERID, newWindow);
                    }
                    
                    // Обновляем список окон для синхронизации
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('[FUNC ERR] launchApp::', error);
                }
            },

            SubMenu_launchApp(appData) {
                console.log('apps', this.apps);
                this.CloseDeskPrevMenu();
                this.CloseAppInfo();
                this.launchApp(appData);
            },

            async changeWallpaper(inpName) {
                try {
                    if (!this.USERID) return null;

                    this.USER = await usersTable.setDesktopWallpaper(this.USERID, inpName);
                    this.reReqUserConfig();

                    return this.USER;
                } catch(error) {
                    console.error('Ошибка изменения изображения:', error);

                    return null;
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

            CloseDeskPrevMenu() { this.deskPreventInfo = null; },
            CloseAppInfo() { this.dappPreventInfo = null; },

            ShowDeskPrevMenu(event) {
                let {clientX: cursor_x, clientY: cursor_y} = event;
                
                if (this.dappPreventInfo && event.target !== this) return;

                this.CloseDeskPrevMenu();
                this.CloseAppInfo();
                this.deskPreventInfo = {cursor_x: cursor_x, cursor_y: cursor_y};

                setTimeout(() => {
                    this.CloseDeskPrevMenu();
                }, 5000);
            },

            ShowAppInfo(event, app) {
                if (!app) return;

                let {clientX: cursor_x, clientY: cursor_y} = event;
                let {label, description} = app;

                if (cursor_x && cursor_y) {
                    this.CloseDeskPrevMenu();
                    this.dappPreventInfo = {
                        cursor_x: cursor_x,
                        cursor_y: cursor_y,
                        label: label,
                        description: description,
                    };
                }
                
                // Закрываем меню при клике вне его
                setTimeout(() => {
                    document.addEventListener('mousedown', this.CloseAppInfo, { once: true });
                }, 0);
            },

            
        },

        async mounted() {
            this.reReqUserConfig();
            
            const defAppsList = appsConfig.getAllApps();
            const findUserApps = await usersTable.getApps(this.USERID);

            await this.findUser();

            this.apps = defAppsList;
            this.USERApps = (findUserApps) ? findUserApps : defAppsList;

            let deskContextApps_res = [];
            defAppsList.forEach(element => {
                if (element.deskContextMenu) deskContextApps_res.push(element);
            });

            this.deskContextApps = deskContextApps_res;
        },
    }
</script>