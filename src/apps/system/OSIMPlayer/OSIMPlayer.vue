<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { LangPack } from './lang';

    export default {
        name: 'OSIMPlayer',

        props: {
            windowId: {
                type: String,
                required: true
            },
        },

        data() {
            return {
                LangData: {},
                PlayLists: [],
                isPlaying: false,
                durationAll: 0,
                TargetTrack: null,
                ShowConfig: {
                    playlist: {
                        artist: true,
                        album: true,
                        genre: true,
                        duration: true,
                    }
                }
            }
        },

        mounted() {
            console.log('MPlayer app mounted with windowId:', this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        },
    }
</script>