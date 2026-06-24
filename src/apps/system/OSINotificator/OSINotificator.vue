<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { LangPack } from './lang';
    import { notificationService } from '@/services/notificationService';

    export default {
        name: 'OSINotificator',

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0},
        },
        
        data() {
            return {
                lang_data: {},

                allNotifs: [],
                SelectNotif: true,
            }
        },

        computed: {
            SortedNotifs() {
                const allArr = this.allNotifs;
                return allArr.sort((a, b) => b.id - a.id);
            }
        },

        methods: {
            LangData(key) { return this.lang_data[key] || ''; },

            // создать уведомление
            async addNotif_success(title = false, content = false) {
                if (!title) return;
                if (!content) return;

                await notificationService.add_system(title, content);
            },

            // Получить массив всех уведомлений
            async getNotif_all() {
                const res = await notificationService.get_all();
                this.allNotifs = res;
            },

            formatTime(date) {
                if (!date) return '';
                const d = new Date(date);
                const now = new Date();
                const diff = Math.floor((now - d) / 1000);
                
                if (diff < 60) return 'только что';
                if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
                if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
                if (diff < 604800) return `${Math.floor(diff / 86400)} дн. назад`;
                return d.toLocaleString('ru-RU');
            },
        },

        mounted() {
            console.log('OSINotificator app mounted with windowId:', this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            this.getNotif_all();
        }
    }
</script>