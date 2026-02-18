<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { appsConfig } from '@/config/applications';
    import { usersTable } from '@/idb/db';

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
            // перезагрузка страницы
            reloadPage() { document.location.reload(); },

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
                        console.log('point-2 - Window exists and is minimized, restoring...');
                        
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
                        });
                    }
                    
                    // Обновляем список окон для синхронизации
                    await usersTable.windows.reupdate(this.USERID);
                    
                    console.log('Launch app completed');                    
                } catch (error) {
                    console.error('Error in launchApp:', error);
                }
            },
        },
    }
</script>