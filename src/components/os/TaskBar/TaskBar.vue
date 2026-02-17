<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { IDBWindows, activeWindowId } from '@/idb/db'; // Убедитесь, что activeWindowId импортирован
    import { JSH } from '@/core/helpers';
    import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications';

    export default {
        name: "TaskBar",

        props: {
            USERID: {type: Number, default: 0}
        },
  
        data() {
            return {
                currentTime: '',
                currentDate: '',
                timer: null,
                showMenu: false,
                USERApps: [],
                USER: null,
                GLangData: {},
            };
        },

        async mounted() {
            console.log('TaskBar mounted with USERID:', this.USERID);
            await this.reloadBar();
        },

        created() { this.usersTable = usersTable; },
  
        computed: {
            // Получаем все окна из IDBWindows
            windowsList() {
                return IDBWindows?.value || [];
            },

            // Активное окно - с проверкой на undefined
            currentActiveWindowId() {
                return activeWindowId?.value || null;
            },

            appManager_data() {
                let resObj = {};

                for (let i = 0; i < this.appsList.length; i++) {
                    if (this.appsList[i].id == 'osiappmanager') {
                        resObj = this.appsList[i];
                        break;
                    }
                }

                return resObj;
            },
            
            osStore() { 
                return useOsStore(); 
            },

            appsList() {
                const SMApps = appsConfig.getStartMenuApps();
                return SMApps.sort((n1, n2) => (n1.label.toLowerCase() >= n2.label.toLowerCase()) ? 1 : -1);
            },

            sortByType_appsList() {
                const resultObj = {};
                const apps = this.USERApps.filter(val => val && val.showInStartMenu);
                
                apps.forEach(element => {
                    const category = element.category;
                    
                    if (!resultObj[category]) { 
                        resultObj[category] = []; 
                    }
                    resultObj[category].push(element);
                });

                // Сортируем каждую категорию
                Object.keys(resultObj).forEach(key => {
                    resultObj[key].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
                });

                return resultObj;
            },
        },
  
        methods: {
            async reloadBar() {                
                const GlobalLangPack = JSH.lang;
                const userLang = navigator.language || navigator.userLanguage;
                const userLangS = userLang.split('-')[0];
                this.UserLang = userLangS; 
                
                this.GLangData = (userLangS && GlobalLangPack && GlobalLangPack[userLangS]) 
                    ? GlobalLangPack[userLangS] 
                    : GlobalLangPack.en;

                await this.findUser();

                const defAppsList = appsConfig.getAllApps();
                const findUserApps = await usersTable.getApps(this.USERID);                

                this.apps = defAppsList;
                this.USERApps = (findUserApps && Array.isArray(findUserApps)) ? findUserApps : defAppsList;

                this.updateTime();
                if (this.timer) clearInterval(this.timer);
                this.timer = setInterval(this.updateTime, 1000);
            },

            async findUser() {
                try {                    
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                }
            },

            getAvatarUrl(avatarName) {
                return `url(${require('@/assets/avatars/' + avatarName)})`;
            },

            avatarStyle(avatarName) {
                return {
                    backgroundImage: this.getAvatarUrl(avatarName),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                };
            },

            updateTime() {
                const now = new Date();

                this.currentDate = now.toLocaleDateString();
                this.currentTime = now.toLocaleTimeString('ru-RU', {
                    hour: '2-digit', 
                    minute: '2-digit'
                });
            },
    
            // Основной метод для обработки клика по окну в таскбаре
            async toggleWindow(windowId) {                
                if (!this.USERID || !usersTable) {
                    console.error('USERID or usersTable missing');
                    return;
                }

                try {
                    // Получаем окно из IDBWindows
                    const window = this.windowsList.find(w => w.id === windowId);
                    
                    if (!window) {
                        console.error('Window not found:', windowId);
                        return;
                    }

                    if (window.isMinimized) {                        
                        // Используем метод restore если он есть, иначе activate
                        if (usersTable.windows.restore) {
                            await usersTable.windows.restore(this.USERID, window.id);
                        } else {
                            // activate тоже снимает свернутость и поднимает zIndex
                            await usersTable.windows.activate(this.USERID, window.id);
                        }
                    } else {
                        // Если окно не свернуто - активируем его (поднимаем zIndex)
                        await usersTable.windows.activate(this.USERID, window.id);
                    }
                    
                    // Обновляем список окон
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('Error toggling window:', error);
                }
            },

            toggleStartMenu() { 
                this.showMenu = !this.showMenu; 
            },

            async launchApp(appData) {
                
                if (!this.USERID || !usersTable) {
                    console.error('USERID or usersTable missing');
                    return;
                }

                try {
                    // Ищем существующее окно по конфигурации
                    const existingWindow = await usersTable.windows.getWindow_byConfig(this.USERID, appData);
                    
                    if (existingWindow) {
                        // Если окно существует
                        if (existingWindow.isMinimized) {
                            // Если свернуто - разворачиваем
                            if (usersTable.windows.restore) {
                                await usersTable.windows.restore(this.USERID, existingWindow.id);
                            } else {
                                await usersTable.windows.activate(this.USERID, existingWindow.id);
                            }
                        } else {
                            // Если не свернуто - активируем
                            await usersTable.windows.activate(this.USERID, existingWindow.id);
                        }
                    } else {
                        // Создаем новое окно
                        await usersTable.windows.create(this.USERID, {
                            ...appData,
                            defWidth: appData.defWidth || 800,
                            defHeight: appData.defHeight || 600
                        });
                    }
                    
                    // Обновляем список окон
                    await usersTable.windows.reupdate(this.USERID);
                    
                } catch (error) {
                    console.error('Error launching app:', error);
                }
            },

            launchApp_byMenu(appData) {
                this.launchApp(appData);
                this.toggleStartMenu();
            },

            // Получить иконку для окна
            getWindowIcon(window) {
                return window?.icon || window?.iconclass || '📄';
            },

            // Проверить, активно ли окно - С ПРОВЕРКОЙ НА UNDEFINED
            isWindowActive(windowId) {
                // Проверяем, что activeWindowId и его value существуют
                if (!activeWindowId || !activeWindowId.value) {
                    return false;
                }
                return activeWindowId.value === windowId;
            },

            // Получить класс для окна в таскбаре - С ПРОВЕРКОЙ НА UNDEFINED
            getWindowClass(window) {
                if (!window) return {};
                
                return {
                    'active': this.isWindowActive(window.id),
                    'minimized': window.isMinimized === true
                };
            }
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>