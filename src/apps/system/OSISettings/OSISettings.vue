<template>
    <div class="osisettings-app">
        <div class="osisettings-elem-info">
            <h2>{{LangData.description}}</h2>
            <ul>
                <li>{{LangData.name}}: <i>"{{ OSIData.name }}"</i></li>
                <li>{{LangData.version}}: <i>"{{ OSIData.versionName }}"</i></li>
                <li>№: <i>{{ OSIData.version }}</i></li>
                <li>Дата: <i>{{ OSIData.date }}</i></li>
            </ul>
        </div>
        <div class="osisettings-elem-info">
            <h2>{{LangData.accounts}}</h2>
        </div>
        <div class="osisettings-elem-info">
            <h2>{{LangData.design}}</h2>
            <ul>
                <li>
                    <h3>{{LangData.desktopbgimg}}:</h3>
                    <button v-if="!showPanel_deskimg" class="osisettings-btn" @click="Chng_showPanel('deskimg')">{{LangData.select}}</button>
                    <div v-if="showPanel_deskimg">
                        <!-- <div v-for="kval in Object.keys(OSIConfig.assets.wallpapers)" :key="kval" class="deskimg-preview" :style="getReqImg(OSIConfig.assets.wallpapers[kval].name)"></div> -->
                    </div>
                </li>
            </ul>
        </div>
        <div class="osisettings-elem-info">
            <h2>Управление памятью</h2>
            <ul>
                <li>
                    <h3>Local Storage:</h3>
                    <ul>
                        <li>osi_windows_state: <button class="osisettings-btn-warning" @click="StoreClear('osi_windows_state')">{{LangData.clear}}</button></li>
                        <li>osi_app_store: <button class="osisettings-btn-warning" @click="StoreClear('osi_app_store')">{{LangData.clear}}</button></li>
                    </ul>
                </li>
                <li>
                    <h3>IndexedDB:</h3>
                </li>
            </ul>            
        </div>        
    </div>    
</template>
<script>
    import { useAppsStore } from '@/stores/apps.store';
    import { LangPack } from './lang';
    // import { useOsStore } from '@/stores/os.store';
    import { mapStores } from 'pinia';
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

        data() {
            return {
                UserLang: '',
                LangData: {},
                showPanel_deskimg: false,
            }
        },

        computed: {
            ...mapStores(useAppsStore),

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
            getReqImg(val) {
                console.log('!!!!!', `url("@/assets/wallpapers/${val}")`);
                return {
                    // backgroundImage: `url("@/src/assets/wallpapers/${val}")`
                    backgroundImage: require('@/assets/wallpapers/nwall.jpg')
                }
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
                let userAnsver = confirm(`${this.LangData.delquest}${key}?`);
                console.log("userAnsver", userAnsver);

                if (userAnsver) {
                    localStorage.removeItem(key);
                }
            },

            Chng_showPanel(key) {
                this[`showPanel_${key}`] = !this[`showPanel_${key}`];
            },
        },
    }
</script>
<style>
.osisettings-app {
    display: block;
    width: 100%;
    height: 100%;
    padding-top: 10px;
    /* background: linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.85)); */
    color: white;
    font-family: 'Segoe UI', Arial, sans-serif;
    overflow: auto; }

.osisettings-elem-info {
    display: block;
    width: calc(100% - 20px);
    max-width: 1200px;
    padding: 5px 5px 10px 5px;
    border: 1px solid gray;
    background: linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.85));
    border-radius: 5px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 10px;
    font-size: small;
    box-shadow: 4px 4px 20px 0px rgba(34, 60, 80, 0.2);
}

h2 {
    background: linear-gradient(to right, rgb(179, 146, 240), rgba(179, 146, 240, 0.8), rgba(179, 146, 240, 0.525), rgba(0, 0, 0, 0));
    text-shadow: 1px 1px 2px black;
    border-radius: 5px 0 0 5px;
    padding-left: 10px;
    margin-bottom: 5px; }

.osisettings-elem-info ul {
    width: 90%;
    margin-left: auto;
    margin-right: auto;
}

.osisettings-btn,
.osisettings-btn-warning {
    display: inline-block;
    min-width: 20px;
    border-radius: 5px;
    padding: 3px 5px;
    cursor: pointer;
    font-weight: 600;
    margin-left: 5px; }

.osisettings-btn-warning {    
    background: linear-gradient(rgb(165, 34, 34), rgb(197, 34, 34), rgb(126, 34, 34));
    color: white; }

.osisettings-btn-warning:hover { opacity: 0.85; }

.deskimg-preview {
    display: inline-block;
    width: 160px;
    height: 90px;
    border-radius: 5px;
    margin: 5px;
}
</style>