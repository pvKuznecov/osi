<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { appsConfig } from '@/config/applications';

    export default {
        name: 'OSIAppManager',

        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0},
        },

        data() {
            return {
                appsList: appsConfig.getAllApps(),
                searchInputTxt: '',
            }
        },

        computed: {
            // Отфильтрованные приложения по поисковому запросу
            filteredApps() {
                if (!this.searchInputTxt.trim()) {
                    return this.appsList;
                } else {
                    const query = this.searchInputTxt.toLowerCase().trim();

                    return this.appsList.filter(app => {
                        // Ищем по label и description для лучшего поиска
                        return app.label.toLowerCase().includes(query) || 
                            (app.description && app.description.toLowerCase().includes(query));
                    });
                }
            },

            // Группировка по категориям для обычного отображения
            sortedAppsByCategory() {
                const resultObj = {};
                
                this.appsList.forEach(element => {
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
        }
    }
</script>