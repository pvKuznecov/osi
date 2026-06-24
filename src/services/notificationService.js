// src/services/notificationService.js
import { useNotificationsStore } from '@/stores/notifications';

export const notificationService = {
    // -=-=-= БЛОК СОЗДАНИЯ УВЕДОМЛЕНИЙ =-=-=-
    // Системное уведомление
    add_system(title, content, type = 'info', autoclose = 5) {
        const store = useNotificationsStore();
        return store.add({
            app: 'system',
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

    // Короткие методы
    add_success(title, content, autoclose = 5) {
        return this.system(title, content, 'success', autoclose);
    },

    add_error(title, content, autoclose = 10) {
        return this.system(title, content, 'error', autoclose);
    },

    add_warning(title, content, autoclose = 5) {
        return this.system(title, content, 'warning', autoclose);
    },

    add_info(title, content, autoclose = 5) {
        return this.system(title, content, 'info', autoclose);
    },

    // -=-=-= БЛОК ПОЛУЧЕНИЯ УВЕДОМЛЕНИЙ =-=-=-
    get_all() {
        const store = useNotificationsStore();
        return store.notifications;
    }
};