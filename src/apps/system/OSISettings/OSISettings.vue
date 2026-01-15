<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { JSH } from '@/core/helpers';
    // import { useOSIAppsStore } from '@/stores/os.apps.store';
    import { LangPack } from './lang';
    // import { mapStores } from 'pinia';
    import { OSIDATA } from '@/config/os';
    import { OSICONFIG } from '@/config/config';

    const ComponentName = 'OSISettings';

    export default {
        name: ComponentName,

        props: {
            windowId: {
                type: String,
                required: true
            },
        },

        inject: ['changeWallpaper'],

        data() {
            return {
                SelectArea: 'description',
                UserLang: '',
                LangData: {},
                showPanel_deskimg: false,
                wpList: JSH.system.getImageList(),
            }
        },

        computed: {
            // ...mapStores(useOSIAppsStore),

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

        mounted() {
            console.log(`${ComponentName} mounted with windowId:`, this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        },
        beforeUnmount() {

        },

        methods: {
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
        },
    }
</script>