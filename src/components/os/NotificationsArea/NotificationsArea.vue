<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';

    export default {
        name: 'NotificationsArea',

        props: {
            USERID: {type: Number, default: 0}
        },
  
        data() {
            return {
                USER: null,
                UserLang: null,

                AllNotifs: [],

                fullMode: false,
            }
        },

        methods: {
            async findUser() {
                try {                    
                    this.USER = await usersTable.getbyId(this.USERID);

                    if (this.USER) this.getAllNotifs();
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

            async getAllNotifs() {
                try {
                    const resArr = await usersTable.notifs.getAll(this.USERID);
                    this.AllNotifs = resArr;

                    if (this.AllNotifs && this.AllNotifs.length > 0) this.fullMode = true;
                } catch (err) {
                    console.error('[FUNC ERR] getAllNotifs::', err);
                }                
            },
        },
        
        async mounted() {
            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS;

            this.findUser();
        },
    }
</script>