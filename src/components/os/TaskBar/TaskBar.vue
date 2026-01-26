<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { JSH } from '@/core/helpers';
    // import { useOSIAppsStore } from '@/stores/os.apps.store';
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
                USER: null,
                GLangData: {},
            };
        },

        async mounted() {
            const GlobalLangPack = JSH.lang;
            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            this.GLangData = (userLangS && GlobalLangPack && GlobalLangPack[userLangS]) ? GlobalLangPack[userLangS] : GlobalLangPack.en;

            this.findUser();
            this.updateTime();
            this.timer = setInterval(this.updateTime, 1000);
        },
  
        computed: {
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
                const apps = this.appsList;
                
                apps.forEach(element => {
                    const category = element.category;
                    
                    if (!resultObj[category]) { resultObj[category] = []; }
                    resultObj[category].push(element);
                });

                Object.keys(resultObj).forEach(key => {
                    resultObj[key].sort((a, b) => a.label - b.label);
                });

                return resultObj;
            },
        },
  
        methods: {
            async findUser() {
                try {                    
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

            getAvatarUrl(avatarName) {
                const res = `url(${require('@/assets/avatars/' + avatarName)})`;
                return res;
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
    
            toggleStartMenu() { this.showMenu = !this.showMenu; },

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

            launchApp_byMenu(appData) {
                this.launchApp(appData);
                this.toggleStartMenu();
            },
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>