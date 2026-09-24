<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { LangPack } from './lang';
    import { notificationService } from '@/services/notificationService';
    import { appsConfig } from '@/config/applications'
    import AppIcon from '@/components/os/AppIcon/AppIcon.vue';
    import OSIICO from './osi.png';

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

        components: { AppIcon },
        
        data() {
            return {
                UserLang: 'en',
                lang_data: {},

                Lang_data_type: {},

                appsData: {},

                osiIco: OSIICO,

                allNotifs: [],
                SelectNotif: true,
                SelectMMenuArea: 'actions',
                SelectedNotifId: null,
                SelectedTypeFilters: [],
                SelectedStatusFilter: "all",
                SelectedDateFilter_from: null,
                SelectedDateFilter_to: null,
                SelectedManNotifs: [],

                CreatorMode: false,
                NewData: {},
                NewData_error: null,
                AddResult: null,

                curHeader: 'Менеджер уведомлений',
            }
        },

        computed: {
            SortedNotifs() {
                const allArr = this.allNotifs;
                if (!allArr) return [];

                const FilterType = this.SelectedTypeFilters ?? [];
                const FilterStatus = this.SelectedStatusFilter ?? "all";
                const FilterDateFrom = this.SelectedDateFilter_from ?? null;
                const FilterDateTo = this.SelectedDateFilter_to ?? null;

                let res = allArr.filter(a => FilterType.includes(a.type));

                // Фильтр по статусу
                if (FilterStatus && FilterStatus === "read") {
                    res = res.filter(a => a.read);
                } else if (FilterStatus && FilterStatus === "unread") {
                    res = res.filter(a => !a.read);
                }

                // Фильтр по дате
                if (FilterDateFrom || FilterDateTo) {
                    // Начало периода (00:00:00)
                    const fromTs = FilterDateFrom
                        ? new Date(FilterDateFrom + 'T00:00:00').getTime()
                        : -Infinity;
                    // Конец периода (23:59:59.999)
                    const toTs = FilterDateTo
                        ? new Date(FilterDateTo + 'T23:59:59.999').getTime()
                        : Infinity;

                    res = res.filter(a => {
                        if (!a.createdAt && !a.date && !a.created_at) return false;
                        const raw = a.createdAt ?? a.date ?? a.created_at;
                        const ts = new Date(raw).getTime();
                        if (Number.isNaN(ts)) return false;
                        return ts >= fromTs && ts <= toTs;
                    });
                }

                return res.sort((a, b) => b.id - a.id);
            },

            SelectedNotif() {
                const notifId = this.SelectedNotifId;
                const allArr = this.allNotifs;
                let resObj = (!notifId) ? {} : allArr.find(item => item.id === notifId);

                return resObj;
            },
        },

        methods: {
            // Работа с конфигом app: iconImg
            Get_app_iconImg(appVal) {
                const appsData = this.appsData;
                if (!appsData) return this.osiIco;

                return (appsData[appVal]) ? appsData[appVal].iconImg : this.osiIco;
            },
            // Работа с конфигом app: iconClass
            Get_app_iconClass(appVal) {
                const appsData = this.appsData;
                if (!appsData) return '';

                return (appsData[appVal]) ? appsData[appVal].iconclass : "";
            },
            // Работа с конфигом app: icon
            Get_app_icon(appVal) {
                const appsData = this.appsData;
                if (!appsData) return '';

                return (appsData[appVal]) ? appsData[appVal].icon : "";
            },
            // Работа с конфигом app: name
            Get_app_name(appVal) {
                const appsData = this.appsData;
                if (!appsData) return 'OSI';

                return (appsData[appVal]) ? appsData[appVal].name : "OSI";
            },

            // Выбрать все / Снять выделение
            SelectAllNotifs() {
                const SelectedManNotifs = this.SelectedManNotifs;
                const allNotifs = this.allNotifs;

                this.SelectedManNotifs = (SelectedManNotifs.length === allNotifs.length) ? [] : allNotifs.map((elem) => elem.id);
            },

            // Создание нового напоминания (на основе данных из формочки)
            async AddNewNotif() {
                const NewData = this.NewData;
                const newTitle = NewData?.title?.trim();
                const newContent = NewData?.content?.trim();

                if (!newTitle || !newContent) {
                    this.NewData_error = 'undefined';
                    return;
                }

                this.NewData_error = null;

                try {
                    await this.addNotif_success(newTitle, newContent);
                    
                    const res = await notificationService.get_all();
                    
                    this.allNotifs = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
                    this.AddResult = 'ok';
                    this.NewData = {};

                    setTimeout(() => {
                        this.AddResult = null;
                        this.CreatorMode = false;
                    }, 2000);                    
                } catch (e) {
                    this.NewData_error = 'error';
                }
            },

            // Отмена создания нового напоминания, с выходом из режима "создание" и зачисткой лишнего
            AbortNewNotif() {
                this.AddResult = null;
                this.CreatorMode = false;
                this.NewData_error = null;
            },

            // Включить/выключить форму создания своего напоминания
            toCreatorMode() {
                const curMode = this.CreatorMode;

                if (!curMode) {
                    this.NewData = {};
                    this.NewData_error = null;
                }

                this.CreatorMode = !curMode;
                this.SelectedNotifId = null;
            },

            // Удалить один выбранный фильтр (Тип)
            Del_selectedFilterVal(inpVal) {
                const SelectedTypeFilters = this.SelectedTypeFilters;
                const newSelectedTypeFilters = SelectedTypeFilters.filter(item => item !== inpVal);
                
                this.SelectedTypeFilters = newSelectedTypeFilters;
            },

            LangData(key) { return this.lang_data[key] || ''; },

            Get_sliceTextLimit(txtVal, limitVal = 25) {
                if (!txtVal) return '';              
                let textResult = (txtVal.length > limitVal) ? txtVal.slice(0, limitVal) + "..." : txtVal;

                return textResult;
            },

            // выбор целевого уведомления
            async Upd_SelectedNotifId(newId) {
                if (!newId) return;

                await notificationService.setReadMany([newId], true);
                this.SelectedNotifId = (this.SelectedNotifId !== newId) ? newId : null;
            },

            // создать уведомление
            async addNotif_success(title = false, content = false, closeTime = 0) {
                if (!title) return;
                if (!content) return;

                return await notificationService.add_info(title, content, closeTime);
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

            // Закрепить уведомление
            async TogglePinned(inpId) {
                await notificationService.togglePinned(inpId);
            },

            // Закрепить/открепить ВСЕ уведомления (по умолч. открепить)
            async markAll_asPinned(inpVal = false) {
                if (!this.allNotifs?.length) return;
                await notificationService.setPinnedAll(inpVal);
                await this.getNotif_all();
            },

            // Пометить все как прочитанные/не прочитанные (по умолч. "не прочитанные")
            async markAll_asRead(selectVal = false) {
                const FullList = this.allNotifs;
                if (!FullList || FullList.length === 0) return;

                if (selectVal) {
                    await notificationService.markAll_asRead();
                } else {
                    await notificationService.markAll_asUnread();
                }

                this.getNotif_all();
            },

            // Удалить все
            async markAll_deleted() {
                const FullList = this.allNotifs;
                if (!FullList || FullList.length === 0) return;

                const FullListIds = FullList.map((elem) => elem.id);
                await notificationService.removeMany(FullListIds);
                this.getNotif_all();
            },

            // Пометить выбранные как прочитанные/не прочитанные (по умолч. "не прочитанные")
            async markSelected_asRead(selectVal = false) {
                const SelectedManNotifs = this.SelectedManNotifs;
                if (!SelectedManNotifs || SelectedManNotifs.length === 0) return;

                await notificationService.setReadMany(SelectedManNotifs, selectVal);
                this.getNotif_all();
            },

            // Пометить выбранные как закрепленные /не закрепленные (по умолч. "не закрепленные")
            async markSelected_asPinned(selectVal = false) {
                const SelectedManNotifs = this.SelectedManNotifs;
                if (!SelectedManNotifs || SelectedManNotifs.length === 0) return;

                await notificationService.setPinnedMany(SelectedManNotifs, selectVal);
                this.getNotif_all();
            },            

            // Удалить выбранные
            async markSelected_deleted() {
                const SelectedManNotifs = this.SelectedManNotifs;
                if (!SelectedManNotifs || SelectedManNotifs.length === 0) return;

                await notificationService.removeMany(SelectedManNotifs);
                this.getNotif_all();
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
            const LangDataStatus = notificationService.get_langData_status();

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
            this.Lang_data_type = (userLangS && LangDataType && LangDataType[userLangS]) ? LangDataType[userLangS] : LangDataType.en;
            this.Lang_data_status = (userLangS && LangDataStatus && LangDataStatus[userLangS]) ? LangDataStatus[userLangS] : LangDataStatus.en;
            
            if (this.Lang_data_type) this.SelectedTypeFilters = Object.keys(this.Lang_data_type);
            if (this.Lang_data_status) this.SelectedStatusFilters = Object.keys(this.Lang_data_status);

            const AllApps = appsConfig.getAllApps();
            if(AllApps) AllApps.forEach((elem) => {
                this.appsData[elem.id] = elem;
            });

            this.getNotif_all();
        }
    }
</script>