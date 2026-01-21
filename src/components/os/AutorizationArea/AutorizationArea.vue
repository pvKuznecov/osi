<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { LangPack } from './lang';
    
    export default {
        name: 'AutorizationArea',
  
        data() {
            return {
                users: [],
                LangData: {},
                creating: false,
            }            
        },

        emits: ['selectUser'],

        methods: {
            selectUser(userId) {
                this.$emit('selectUser', userId);
            },

            async loadUsers() {
                try {
                    this.users = await usersTable.getAll();
                } catch (error) {
                    console.error('Ошибка загрузки пользователей:', error);
                    this.$toast.error('Не удалось загрузить пользователей');
                }
            },

            showForm_addUser() { this.creating = !this.creating; },
        },

        async mounted() {
            await this.loadUsers();

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        },
    }
</script>