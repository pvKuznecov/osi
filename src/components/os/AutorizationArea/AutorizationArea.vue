<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { JSH } from '@/core/helpers';
    import { LangPack } from './lang';
    
    export default {
        name: 'AutorizationArea',
  
        data() {
            return {
                users: [],
                LangData: {},
                creating: false,
                avatarsList: JSH.system.getAvatarsList(),
                defaultUser: {
                    login: '',
                    password: '',
                    avatar: 'cat.jpg',
                },
                operationNewUserResult: null,
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

            async saveUser() {
                if (this.defaultUser.login && this.defaultUser.login !== '') {
                    const NUserData = {
                        login: this.defaultUser.login,
                        password: this.defaultUser.password || '',
                        config: {
                            avatar: this.defaultUser.avatar
                        }
                    };
                    console.log('NUserData', NUserData);

                    try {
                        const operResult = await usersTable.save(NUserData);
                        console.log('operResult', operResult);
                        this.operationNewUserResult = 'ok'
                    } catch (error) {
                        console.error('Ошибка создания пользователя:', error);
                        this.operationNewUserResult = 'Ошибка при создании учетной записи.'
                    }
                } else {
                    this.operationNewUserResult = 'Ошибка при создании учетной записи: обязательные поля не заполнены!'
                }
            },

            showForm_addUser() { this.creating = !this.creating; },

            getAvatarUrl(avatarName) {
                // return new URL(`@/assets/avatars/${avatarName}`, import.meta.url).href;
                const res = `url(${require('@/assets/avatars/' + avatarName)})`;
                return res;
            },

            avatarStyle(avatarName) {
                return {
                    backgroundImage: this.getAvatarUrl(avatarName),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    // width: '50px',
                    // height: '50px',
                    // borderRadius: '50%' // для круглых аватарок
                };
            },

            selectedNewAvatar(avatarName) {
                this.defaultUser.avatar = avatarName;
            },
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