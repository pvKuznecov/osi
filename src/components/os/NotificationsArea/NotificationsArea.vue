<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useNotificationsStore } from '@/stores/notifications';
    import { LangPack } from './lang';

    const BaseIcon = '/src/assets/icons/favicons/icon_big.png';

    export default {
        name: 'NotificationsArea',

        props: {
            USERID: {
                type: [Number, String],
                required: true
            }
        },

        data() {
            return {
                USER: null,
                UserLang: null,
                osiIcon: BaseIcon,
                LangData: {},

                // Состояние компонента
                fullModeNotif: null,
                isPanelOpen: false,
                floatingNotifs: [],
                floatingTimers: new Map(),
                MAX_FLOATING: 5
            }
        },

        computed: {
            // Данные из Pinia store
            AllNotifs() {
                const store = useNotificationsStore();
                return store.notifications;
            },
        
            unreadCount() {
                const store = useNotificationsStore();
                return store.unreadCount;
            },

            loading() {
                const store = useNotificationsStore();
                return store.loading;
            }
        },

        methods: {
            // Инициализация пользователя
            async findUser() {
                try {
                    const store = useNotificationsStore();
                    await store.init(this.USERID);
                } catch (error) {
                    console.error('Ошибка инициализации уведомлений:', error);
                    if (this.$toast) this.$toast.error('Не удалось загрузить уведомления');
                }
            },

            // Переключение панели
            togglePanel() {
                this.isPanelOpen = !this.isPanelOpen;
                if (this.isPanelOpen) {
                    // Обновляем данные при открытии
                    this.findUser();
                }
            },

            // Выбор уведомления для просмотра
            selectedNotif(notif) {
                this.fullModeNotif = (this.fullModeNotif === notif) ? null : notif;
                if (!notif.read) this.markRead(notif.id);
            },

            // Отметить как прочитанное
            async markRead(notificationId) {
                try {
                    const store = useNotificationsStore();
                    await store.markAsRead(notificationId);
                } catch (error) {
                    console.error('Ошибка отметки прочитанного:', error);
                }
            },

            // Удалить уведомление
            async removeNotif(notificationId) {
                try {
                    const store = useNotificationsStore();
                    await store.remove(notificationId);
                    if (this.fullModeNotif && this.fullModeNotif.id === notificationId) this.fullModeNotif = null;
                } catch (error) {
                    console.error('Ошибка удаления уведомления:', error);
                }
            },

            // Обработка действия
            handleAction(notification, action) {
                console.log(`Нажали на действие: ${action}, NOTIF: ${notification}`);
            },

            // Открыть уведомление из всплывающего
            openNotification(notification) {
                if (!notification.read) this.markRead(notification.id);
                
                this.isPanelOpen = true;
                this.fullModeNotif = notification;
            },

            // Показать всплывающее уведомление
            showFloatingNotification(notification) {
                // Проверяем, не показано ли уже
                if (this.floatingNotifs.some(n => n.id === notification.id)) return;

                this.floatingNotifs.push(notification);
            
                // Ограничиваем количество
                if (this.floatingNotifs.length > this.MAX_FLOATING) {
                    const oldest = this.floatingNotifs.shift();
                    
                    if (oldest && this.floatingTimers.has(oldest.id)) {
                        clearTimeout(this.floatingTimers.get(oldest.id));
                        this.floatingTimers.delete(oldest.id);
                    }
                }
            
                // Автозакрытие через 6 секунд
                const timer = setTimeout(() => {
                    this.dismissFloating(notification.id);
                }, 6000);
            
                this.floatingTimers.set(notification.id, timer);
            },

            // Закрыть всплывающее уведомление
            dismissFloating(notificationId) {
                const index = this.floatingNotifs.findIndex(n => n.id === notificationId);
                
                if (index !== -1) this.floatingNotifs.splice(index, 1);
                if (this.floatingTimers.has(notificationId)) {
                    clearTimeout(this.floatingTimers.get(notificationId));
                    this.floatingTimers.delete(notificationId);
                }
            },

            // Форматирование времени
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

            // Очистка HTML для всплывающих уведомлений
            stripHtml(html) {
                if (!html) return '';
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.textContent || tmp.innerText || '';
            }
        },

        watch: {
            // Следим за новыми уведомлениями
            AllNotifs: {
                handler(newNotifs, oldNotifs) {
                    if (newNotifs.length > oldNotifs.length) {
                        const newNotif = newNotifs[0];
                        
                        if (newNotif && !newNotif.read) this.showFloatingNotification(newNotif);
                    }
                },
                deep: true
            },

            // Обновляем при смене пользователя
            USERID: {
                immediate: true,
                handler(newVal) {
                    if (newVal) this.findUser();
                }
            }
        },

        mounted() {
            // Определяем язык пользователя
            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
        
            this.UserLang = userLangS;
        
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        
            // Инициализация
            this.findUser();
        },

        beforeUnmount() {
            // Очищаем все таймеры всплывающих уведомлений
            // Используем [, timer] чтобы игнорировать ключ (исправляет ESLint)
            for (const [, timer] of this.floatingTimers) {
                clearTimeout(timer);
            }
            this.floatingTimers.clear();
        }
    }
</script>