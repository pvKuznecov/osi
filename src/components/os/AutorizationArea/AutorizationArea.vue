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
                deletion: false,
                avatarsList: JSH.system.getAvatarsList(),
                defaultUser: {
                    login: '',
                    password: '',
                    avatar: 'cat.jpg',
                },
                deletingUser: null,
                operationNewUserResult: null,
                operationDelUserResult: null,
                inpPass: '',
                introPass: '',
                addIntro: false,
                selectedUser: null,
                introErrorTxt: false,
            }            
        },

        emits: ['selectUser'],

        computed: {
            isNeedPass() {
                const sUser = this.selectedUser;
                console.log('sUser', sUser);

                return (sUser && sUser.password !== '') ? true : false;
            },

            needInpPassword() {
                const delUser = this.deletingUser;

                return (delUser && delUser.password === '') ? false : true;
            },

            isInpPassword() {
                const inPass = this.inpPass;
                return (inPass && inPass.length > 0) ? true : false;
            },
        },

        methods: {
            reloadPage() {
                // Перезагрузить текущую страницу
                document.location.reload();
            },

            pre_selectUser(userData) {
                this.selectedUser = userData;
                this.addIntro = true;
                this.introErrorTxt = false;

                if (this.isNeedPass) {
                    return true;
                } else {
                    this.selectUser(userData);
                }
            },

            selectUser(userData) {
                // todo: придумать адекватную схему защиты учетной записи, пока это скорее затычка
                if (userData && this.isNeedPass && this.introPass === userData.password) {
                    // this.introErrorTxt = null;
                    this.$emit('selectUser', userData.id);
                } else if (!this.isNeedPass) {
                    // this.introErrorTxt = null;
                    this.$emit('selectUser', userData.id);
                } else {
                    this.introErrorTxt = 'Ошибка! Указан не корректный пароль!';
                }
                
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
                        // this.operationNewUserResult = 'ok'
                        this.loadUsers();
                        this.showForm_addUser();
                        this.defaultUser = {login: '', password: '', avatar: 'cat.jpg'};
                    } catch (error) {
                        console.error('Ошибка создания пользователя:', error);
                        this.operationNewUserResult = 'Ошибка при создании учетной записи.'
                    }
                } else {
                    this.operationNewUserResult = 'Ошибка при создании учетной записи: обязательные поля не заполнены!'
                }
            },

            async deleteUser(userId) {
                const needPass = this.needInpPassword;
                const iPass = this.inpPass;
                const targetUser = this.deletingUser;

                let isValidOper = false;
                
                // todo: придумать адекватную схему защиты учетной записи, пока это скорее затычка
                if (targetUser && targetUser.id == userId && needPass && iPass && iPass === targetUser.password) {
                    isValidOper = true;
                } else if (targetUser && targetUser.id == userId && !needPass) {
                    isValidOper = true;
                } else {
                    isValidOper = false;
                }

                if (isValidOper) {
                    try {
                        const operResult = await usersTable.delete(userId);
                        console.log('operResult', operResult);

                        this.loadUsers();
                        this.defaultUser = {login: '', password: '', avatar: 'cat.jpg'};
                        this.deletion = false;
                        this.deletingUser = null;
                        this.inpPass = '';
                    } catch (error) {
                        console.error('Ошибка удаления пользователя:', error);
                        this.operationDelUserResult = 'Ошибка при удалении учетной записи.'
                    }
                } else if (!isValidOper && needPass) {
                    this.operationDelUserResult = 'Ошибка при удалении учетной записи: указан некорректный пароль.'
                } else {
                    this.operationDelUserResult = 'Неизвестная ошибка при удалении учетной записи.'
                }
                
                             
            },

            showForm_addUser() {
                this.deletingUser = null;
                this.deletion = false;
                this.creating = !this.creating;
            },

            showForm_delUser(userData = false) {
                this.operationDelUserResult = null;
                
                if (userData) {
                    this.deletingUser = userData;
                    this.creating = false;
                } else {
                    this.deletingUser = null;
                }

                this.deletion = !this.deletion;                
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