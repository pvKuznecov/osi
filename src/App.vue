<template>
    <AutorizationArea v-if="!isAutorized" @selectUser="selectUser" />
    <div v-if="isAutorized" class="webos">
        <DesktopArea :USERID="USERID">
            <SimpleWindow 
                v-for="window in sortedWindows"
                :key="window.id"
                :windowId="window.id"
                :title="window.label"
                :appName="window.name"
                :contentApp="window.contentApp"
                :icon="window.icon"
                :iconclass="window.iconclass"
                :defWidth="window.defWidth"
                :defHeight="window.defHeight"
                :isMinimized="window.isMinimized"
                :isActive="isActiveElem(window.id)"
                :isMaximized="window.isMaximized"
                :zIndex="window.zIndex"
                :resizable="window.resizable"
                :canMinimize="window.canMinimize"
                :USERID="USERID"
                @close="closeWindow"
                @minimize="minimizeWindow"
                @toggleMaximize="toggleMaximizeWindow"
                @focus="activateWindow"
            />
        </DesktopArea>
        <TaskBar :USERID="USERID" />
    </div>
</template>
<style src="./styles/global.css"></style>
<script>
import AutorizationArea from './components/os/AutorizationArea/AutorizationArea.vue';
import DesktopArea from './components/os/DesktopArea/DesktopArea.vue';
import TaskBar from './components/os/TaskBar/TaskBar.vue';
import SimpleWindow from './components/os/SimpleWindow/SimpleWindow.vue';
import { useAppsStore } from './stores/apps.store';
import { usersTable, IDBWindows, activeWindowId } from './idb/db';

export default {
    name: 'App',

    components: {
        AutorizationArea,
        DesktopArea,
        TaskBar,
        SimpleWindow
    },

    data() {
        return {
            isAutorized: false,
            USERID: null,
            USER: {},
        }
    },

    computed: {
        IDBWindows() { return IDBWindows.value; },
        appsStore() { return useAppsStore(); },
        // Сортируем окна по zIndex для правильного отображения
        sortedWindows() {
            if (!this.IDBWindows) {
                return [];
            } else {
                // Фильтруем свернутые окна - они не отображаются на рабочем столе
                const visibleWindows = this.IDBWindows.filter(w => !w.isMinimized);
            
                // Сортируем по zIndex (от меньшего к большему)
                return [...visibleWindows].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            }
        },
    },

    methods: {
        // проверка на "это активный элемент"
        isActiveElem(windowId) { return windowId === activeWindowId.value; },

        async closeWindow(windowId) {            
            if (this.USERID && usersTable) {
                try {
                    await usersTable.windows.close(this.USERID, windowId);
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('Error closing window:', error);
                }
            }

            if (this.appsStore) this.appsStore.deleteWindowState(windowId);
        },
    
        async minimizeWindow(windowId) {            
            if (this.USERID && usersTable) {
                try {
                    await usersTable.windows.minimize(this.USERID, windowId);
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('Error minimizing window:', error);
                }
            }
        },
    
        async toggleMaximizeWindow(windowId) {            
            if (this.USERID && usersTable) {
                try {
                    // Получаем текущее состояние окна
                    const windows = IDBWindows.value || [];
                    const window = windows.find(w => w.id === windowId);
                    
                    if (window) {
                        // Переключаем состояние максимизации
                        window.isMaximized = !window.isMaximized;
                        
                        // Обновляем в БД
                        const user = await usersTable.getbyId(this.USERID);
                        const updatedWindows = windows.map(w => 
                            w.id === windowId ? window : w
                        );
                        
                        await usersTable.save({
                            ...user,
                            systemconfig: {
                                ...user.systemconfig,
                                windows: updatedWindows
                            }
                        });
                        
                        await usersTable.windows.reupdate(this.USERID);
                    }
                } catch (error) {
                    console.error('Error toggling maximize window:', error);
                }
            }
        },
    
        async activateWindow(windowId) {            
            if (this.USERID && usersTable) { 
                try {
                    // Активируем окно (обновляет zIndex и снимает свернутость)
                    await usersTable.windows.activate(this.USERID, windowId);
                    // Обновляем список окон
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('Error activating window:', error);
                }
            } else {
                console.log('Cannot activate: USERID or usersTable missing');
            }
        },

        async selectUser(userId) {
            this.USERID = userId;

            if (usersTable) {
                try {
                    // Загружаем пользователя
                    this.USER = await usersTable.getbyId(userId);
                    // Обновляем список окон
                    await usersTable.windows.reupdate(userId);
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            }
            
            this.isAutorized = true;
        },

        // Метод для восстановления окна из свернутого состояния
        async restoreWindow(windowId) {            
            if (this.USERID && usersTable) {
                try {
                    // Если у вас есть метод restore в usersTable.windows
                    if (usersTable.windows.restore) {
                        await usersTable.windows.restore(this.USERID, windowId);
                    } else {
                        // Или используем activate для восстановления
                        await usersTable.windows.activate(this.USERID, windowId);
                    }
                    await usersTable.windows.reupdate(this.USERID);
                } catch (error) {
                    console.error('Error restoring window:', error);
                }
            }
        }
    },
}
</script>

<style>
.webos {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
    background: #1a1a1a;
}
</style>