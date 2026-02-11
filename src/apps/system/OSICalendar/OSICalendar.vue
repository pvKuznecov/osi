<template src="./template.html"></template>
<style src="./styles.css"></style>
<script>
    import { LangPack } from './lang';
    import { mapStores } from 'pinia';
    import { useAppsStore } from '@/stores/apps.store';
    import { usersTable } from '@/idb/db';

    export default {
        name: 'OSICalendar',

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0},
            selectedYear: { type: Number, default: null},
            selectedMonth: { type: Number, default: null},
            selectedDay: { type: Number, default: null},
        },

        data() {
            return {
                USER: null,
                lang_data: {},

                timer: null,
                
                currentDate: null,
                currentTime: null,
                
            }
        },

        computed: {
            ...mapStores(useAppsStore),            
        },

        methods: {
            async reloadTime() {
                this.updateTime();
                this.timer = setInterval(this.updateTime, 1000);
            },

            updateTime() {
                const now = new Date();

                this.currentDate = now.toLocaleDateString();
                this.currentTime = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            },

            async findUser() {
                try {
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

            // Сохраняем текущее состояние в store
            saveState() {
                if (!this.windowId || !this.appsStore || !this.isInitialized) return;
                
                const state = {
                    appType: 'calendar',
                    timestamp: Date.now()
                };
                
                console.log('OSICalculator saving state:', state);
                this.appsStore.saveWindowState(this.windowId, state);
            },
        },

        mounted() {
            console.log('OSICalendar app mounted with windowId:', this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем начальное состояние после небольшой задержки
            setTimeout(() => {
                this.saveState();
            }, 100);

            this.reloadTime();
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>