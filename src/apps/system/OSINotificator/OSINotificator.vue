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
            fileData: { type: Object, default: null },
            fileId: { type: [String, Number], default: null },
            fileName: { type: String, default: '' },
            fileType: { type: String, default: '' },
        },

        emits: ['startapp', 'error', 'notification'],
        
        data() {
            return {
                lang_data: {},

                Lang_data_type: {},

                allNotifs: [],
                SelectNotif: true,
                SelectMMenuArea: 'filters',
                SelectedNotifId: null,
                SelectedFilters: [],

                curHeader: 'Менеджер уведомлений',
            }
        },

        computed: {
            SortedNotifs() {
                const allArr = this.allNotifs;
                return allArr.sort((a, b) => b.id - a.id);
            },

            SelectedNotif() {
                const notifId = this.SelectedNotifId;
                const allArr = this.allNotifs;
                let resObj = (!notifId) ? {} : allArr.find(item => item.id === notifId);

                return resObj;
            },
        },

        methods: {
            LangData(key) { return this.lang_data[key] || ''; },

            Get_sliceTextLimit(txtVal, limitVal = 25) {
                if (!txtVal) return '';              
                let textResult = (txtVal.length > limitVal) ? txtVal.slice(0, limitVal) + "..." : txtVal;

                return textResult;
            },

            // выбор целевого уведомления
            Upd_SelectedNotifId(newId) {
                console.log('newId', newId);
                if (!newId) return;
                if (this.SelectedNotifId !== newId) {
                    this.SelectedNotifId = newId;
                } else {
                    this.SelectedNotifId = null;
                }
            },

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

            Chng_SelectMMenuArea(inpVal) {
                if (!inpVal) return;

                this.SelectMMenuArea = inpVal;
            },

            // Вывод даты-времени в человеко-читабельном формате
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
            const LangDataType = notificationService.get_langData_type();

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
            this.Lang_data_type = (userLangS && LangDataType && LangDataType[userLangS]) ? LangDataType[userLangS] : LangDataType.en;

            this.getNotif_all();
        }
    }
</script>