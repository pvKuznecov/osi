<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { appsConfig } from '@/config/applications';
    import { usersTable } from '@/idb/db';
    import { useOsStore } from '@/stores/os.store';

    export default {
        name: 'OSIAppManager',

        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0},
        },

        inject: [ 'reloadDesk' ],

        data() {
            return {
                appsList: [],
                searchInputTxt: '',
                USERApps: [],
                USER: null,
                isNeedReload: false,
            }
        },

        computed: {
            osStore() {
                return useOsStore();
            },
            // Отфильтрованные приложения по поисковому запросу
            filteredApps() {
                if (!this.searchInputTxt.trim()) {
                    return this.USERApps;
                } else {
                    const query = this.searchInputTxt.toLowerCase().trim();

                    return this.USERApps.filter(app => {
                        // Ищем по label и description для лучшего поиска
                        return app.label.toLowerCase().includes(query) || 
                            (app.description && app.description.toLowerCase().includes(query));
                    });
                }
            },

            // Группировка по категориям для обычного отображения
            sortedAppsByCategory() {
                const resultObj = {};
                
                this.USERApps.forEach(element => {
                    const category = element.category;
                    
                    if (!resultObj[category]) { 
                        resultObj[category] = []; 
                    }
                    resultObj[category].push(element);
                });

                // Сортировка внутри категорий по названию (label)
                Object.keys(resultObj).forEach(key => {
                    resultObj[key].sort((a, b) => {
                        return a.label.localeCompare(b.label);
                    });
                });

                return resultObj;
            },

            // Проверка есть ли результаты поиска
            hasSearchResults() { return this.filteredApps.length > 0; },

            // Есть ли поисковый запрос
            isSearching() { return this.searchInputTxt.trim().length > 0; },
        },

        async mounted() {
            const defAppsList = appsConfig.getAllApps();
            const findUserApps = await usersTable.getApps(this.USERID);

            await this.findUser();

            this.appsList = defAppsList;
            this.USERApps = (findUserApps) ? findUserApps : defAppsList;
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

            async Chng_showOnDesktop(app) {
                try {
                    const appId = app.id;

                    await usersTable.updateAppSetting(this.USERID, appId, 'showOnDesktop', app.showOnDesktop);
                    this.reloadDesk();
                } catch (error) {
                    console.error('Ошибка обновления данных:', error);
                }
            },
            async Chng_showInStartMenu(app) {
                try {
                    const appId = app.id;
                    
                    await usersTable.updateAppSetting(this.USERID, appId, 'showInStartMenu', app.showInStartMenu);
                    // TODO: пока это перезапишет в indexeddb конфиг в учетке, но не приведет к динамическому перестроению меню "пуск", надо подумать
                    this.isNeedReload = true;
                } catch (error) {
                    console.error('Ошибка обновления данных:', error);
                }
            },

            launchApp(_appData) {
                console.log('_appData', _appData);
                const appData = {..._appData};
                console.log('appData', appData);
                const appName = appData.name;
                const contentApp = appData.contentapp;

                console.log('appName', appName);
                console.log('contentApp', contentApp);

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
        },
    }
</script>