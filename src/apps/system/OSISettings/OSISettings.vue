<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { JSH } from '@/core/helpers';
    import { usersTable } from '@/idb/db';
    // import { useOSIAppsStore } from '@/stores/os.apps.store';
    import { LangPack } from './lang';
    // import { mapStores } from 'pinia';
    import { OSIDATA } from '@/config/os';
    import { OSICONFIG } from '@/config/config';

    const ComponentName = 'OSISettings';

    export default {
        name: ComponentName,

        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0}
        },

        inject: ['changeWallpaper'],

        data() {
            return {
                users: [],
                usersCount: 0,
                SelectArea: 'description',
                UserLang: '',
                LangData: {},
                showPanel_deskimg: false,
                wpList: JSH.system.getImageList(),
                USER: null,
            }
        },

        computed: {
            // ...mapStores(useOSIAppsStore),
            // USER() {
            //     return this.findUser();
            // },

            OSIData() {
                return {
                    ...OSIDATA[this.UserLang],
                    name: OSIDATA.name,
                    version: OSIDATA.version,
                    date: OSIDATA.date
                };
            },

            OSIConfig() {
                return {
                    ...OSICONFIG,
                }
            },

            // osStore() {
            //     // return useOsStore();
            //     return useOSIAppsStore();
            // },

            storeStatistic() {
                // let result = this.osStore.getLocalStorageUsage();
                let result = JSH.browser.getLocalStorageUsage();
                console.log("navigator", navigator);

                return result;
            }
        },

        async mounted() {
            console.log(`${ComponentName} mounted with windowId:`, this.windowId);
            await this.loadUsers();

            this.findUser();

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        },
        beforeUnmount() {

        },

        methods: {
            async loadUsers() {
                try {
                    this.users = await usersTable.getAll();
                    this.usersCount = await usersTable.count();
                } catch (error) {
                    console.error('Ошибка загрузки пользователей:', error);
                    this.$toast.error('Не удалось загрузить пользователей');
                }
            },

            async findUser() {
                try {
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

            GetBrowserData() {
                return JSH.browser.detectBrowser();
            },

            Chk_selectedArea(inpVal) {
                return (this.SelectArea === inpVal) ? true : false;
            },
            // Инициализация из store
            initFromStore() {
                if (!this.windowId || !this.appsStore) {
                    console.error(`${ComponentName}: windowId or appsStore is missing`);
                    return;
                }
            
                const savedState = this.appsStore.getWindowState(this.windowId);
                console.log(`${ComponentName} loaded state:`, savedState);
                
                this.isInitialized = true;
                console.log(`${ComponentName} initialized`);
            },

            StoreClear(key) {
                console.log("StoreClear(key)", key);
                let userAnsver = confirm(`${this.LangData.delquest}${key}?`);
                // console.log("userAnsver", userAnsver);

                if (userAnsver) {
                    localStorage.removeItem(key);
                }
            },

            ChngArea(areaVal) {                
                this.SelectArea = areaVal;
            },

            Chng_showPanel(key) {
                this[`showPanel_${key}`] = !this[`showPanel_${key}`];
            },

            ChangeWPImage(inpName) {
               this.changeWallpaper(inpName);
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
        },
    }
</script>