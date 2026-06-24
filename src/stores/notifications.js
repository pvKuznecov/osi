// src/stores/notifications.js
import { defineStore } from 'pinia';
import { usersTable } from '@/idb/db';

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({
        notifications: [],
        currentUserId: null,
        isInitialized: false,
        loading: false,
        autoCloseTimers: new Map()
    }),

    getters: {
        // Все уведомления
        all: (state) => state.notifications,

        // Непрочитанные
        unread: (state) => state.notifications.filter(n => !n.read),
    
        // Количество непрочитанных
        unreadCount: (state) => state.notifications.filter(n => !n.read).length,

        // Закрепленные
        pinned: (state) => state.notifications.filter(n => n.pinned),

        // По приложению
        getForApp: (state) => (appId) => state.notifications.filter(n => n.app === appId),

        // По типу
        getByType: (state) => (type) => state.notifications.filter(n => n.type === type),

        // Последние N
        getRecent: (state) => (count = 5) => state.notifications.slice(0, count)
    },

    actions: {
        // Инициализация для пользователя
        async init(userId) {
            if (!userId) {
                console.warn('NotificationsStore: No userId provided');
                return;
            }

            this.currentUserId = userId;
            this.loading = true;
        
            try {
                const notifs = await usersTable.notifs.getAll(userId);
                this.notifications = notifs;
                this.isInitialized = true;
            } catch (error) {
                console.error('Failed to initialize notifications store:', error);
            } finally {
                this.loading = false;
            }
        },

        // Добавление уведомления
        async add(notificationData) {
            if (!this.currentUserId) {
                throw new Error('No user selected');
            }

            try {
                const notification = await usersTable.notifs.add(this.currentUserId, notificationData);

                // Добавляем в начало списка
                this.notifications = [notification, ...this.notifications];
        
                // Автозакрытие
                if (notification.autoclose && notification.autoclose > 0) this.setAutoClose(notification.id, notification.autoclose);

                return notification;
            } catch (error) {
                console.error('Failed to add notification:', error);
                throw error;
            }
        },

        // Отметить как прочитанное
        async markAsRead(notificationId) {
            if (!this.currentUserId) return;

            try {
                await usersTable.notifs.markAsRead(this.currentUserId, notificationId);
        
                const notif = this.notifications.find(n => n.id === notificationId);
                if (notif) notif.read = true;
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        },

        // Отметить все как прочитанные
        async markAllAsRead() {
            if (!this.currentUserId) return;

            try {
                await usersTable.notifs.markAllAsRead(this.currentUserId);
                this.notifications.forEach(n => n.read = true);
            } catch (error) {
                console.error('Failed to mark all as read:', error);
            }
        },

        // Удалить уведомление
        async remove(notificationId) {
            if (!this.currentUserId) return;

            try {
                await usersTable.notifs.delete(this.currentUserId, notificationId);
        
                this.notifications = this.notifications.filter(n => n.id !== notificationId);
        
                // Очищаем таймер
                if (this.autoCloseTimers.has(notificationId)) {
                    clearTimeout(this.autoCloseTimers.get(notificationId));
                    this.autoCloseTimers.delete(notificationId);
                }
            } catch (error) {
                console.error('Failed to remove notification:', error);
            }
        },

        // Очистить все (кроме закрепленных)
        async clearAll() {
            if (!this.currentUserId) return;

            try {
                await usersTable.notifs.clearAll(this.currentUserId);
                this.notifications = this.notifications.filter(n => n.pinned);
            } catch (error) {
                console.error('Failed to clear all:', error);
            }
        },

        // Закрепить/открепить
        async togglePinned(notificationId) {
            if (!this.currentUserId) return;

            try {
                const newState = await usersTable.notifs.togglePinned(this.currentUserId, notificationId);
                const notif = this.notifications.find(n => n.id === notificationId);
                
                if (notif) notif.pinned = newState;
        
                return newState;
            } catch (error) {
                console.error('Failed to toggle pinned:', error);
                return false;
            }
        },

        // Автозакрытие
        setAutoClose(notificationId, seconds) {
            if (this.autoCloseTimers.has(notificationId)) clearTimeout(this.autoCloseTimers.get(notificationId));

            const timer = setTimeout(() => {
                this.remove(notificationId);
            }, seconds * 1000);

            this.autoCloseTimers.set(notificationId, timer);
        },

        // Очистка старых
        async cleanupOld(daysOld = 30) {
            if (!this.currentUserId) return 0;

            try {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - daysOld);
        
                const toRemove = this.notifications.filter(n => {
                    if (n.pinned) return false;
                    const createdAt = new Date(n.createdAt);
                    return createdAt < cutoff;
                });

                for (const notif of toRemove) {
                    await this.remove(notif.id);
                }

                return toRemove.length;
            } catch (error) {
                console.error('Failed to cleanup old notifications:', error);
                return 0;
            }
        },

        // Сброс при выходе
        reset() {
            this.notifications = [];
            this.currentUserId = null;
            this.isInitialized = false;
            this.loading = false;
      
            for (const [, timer] of this.autoCloseTimers) {
                clearTimeout(timer);
            }
            this.autoCloseTimers.clear();
        }
    }
});