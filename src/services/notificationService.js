// src/services/notificationService.js
import { useNotificationsStore } from '@/stores/notifications';

export const notificationService = {
    // -=-=-= БЛОК СОЗДАНИЯ УВЕДОМЛЕНИЙ =-=-=-
    // Системное уведомление
    add_system(title, content, type = 'info', autoclose = 5) {
        const store = useNotificationsStore();
        return store.add({
            app: 'OSI',
            title,
            content,
            type,
            autoclose
        });
    },

    // От приложения
    add_fromApp(appId, appName, title, content, type = 'info', actions = [], autoclose = 5) {
        const store = useNotificationsStore();
        return store.add({
            app: appId,
            title: `[${appName}] ${title}`,
            content,
            type,
            actions,
            autoclose
        });
    },

    // -=-=-= КОРОТКИЕ МЕТОДЫ =-=-=-
    add_success(title, content, autoclose = 5) {
        return this.add_system(title, content, 'success', autoclose);
    },

    // Создать уведомление об ошибке
    add_error(title, content, autoclose = 10) {
        return this.add_system(title, content, 'error', autoclose);
    },

    add_warning(title, content, autoclose = 5) {
        return this.add_system(title, content, 'warning', autoclose);
    },

    add_info(title, content, autoclose = 5) {
        return this.add_system(title, content, 'info', autoclose);
    },

    // Закрепить/открепить уведомление
    togglePinned(notifId) {
        const store = useNotificationsStore();
        return store.togglePinned(notifId);
    },

    // Закрепить/открепить ВСЕ уведомления
    setPinnedAll(pinned) {
        const store = useNotificationsStore();
        return store.setPinnedAll(pinned);
    },

    // Пометить все - "Прочитанные"
    markAll_asRead() {
        const store = useNotificationsStore();
        return store.markAllAsRead();
    },

    // Пометить все - "Не прочитанные"
    markAll_asUnread() {
        const store = useNotificationsStore();
        return store.markAllAsUnread();
    },

    // Закрепить/открепить выбранные
    setPinnedMany(ids, pinned) {
        const store = useNotificationsStore();
        return store.setPinnedMany(ids, pinned);
    },

    // Метка "Прочитано"/"Не прочитанно" для выбранного (массив)
    setReadMany(ids, read) {
        const store = useNotificationsStore();
        return store.setReadMany(ids, read);
    },

    removeMany(ids) {
        const store = useNotificationsStore();
        return store.removeMany(ids);
    },
    
    // -=-=-= БЛОК ПОЛУЧЕНИЯ УВЕДОМЛЕНИЙ =-=-=-
    get_all() {
        const store = useNotificationsStore();
        return store.notifications;
    },

    // -=-=-= БЛОК ПОЛУЧЕНИЯ ВСПОМОГАТЕЛЬНЫХ ДАННЫХ =-=-=-
    // Получить расшифровку типов (языковой пакет)
    get_langData_type() {
        const LangData = {
            "en": {
                "info": "Notification",
                "success": "Confirmation request",
                "warning": "Important notice",
                "error": "Error"
            },
            "ru": {
                "info": "Уведомление",
                "success": "Запрос подтверждения",
                "warning": "Важное уведомление",
                "error": "Ошибка"
            },
        };

        return LangData;
    },
    // Получить расшифровку статусов (языковой пакет)
    get_langData_status() {
        const LangData = {
            "en": {
                "all": "All",
                "read": "Read",
                "unread": "Unread"
            },
            "ru": {
                "all": "Все",
                "read": "Прочитанные",
                "unread": "Непрочитанные"
            }
        };

        return LangData;
    }
};