<template>
    <div class="webos">
        <DesktopArea>
            <SimpleWindow v-for="window in osStore.windows"
                :key="window.id" :windowId="window.id"
                :title="window.title"
                :appName="window.appName"
                :isMinimized="window.isMinimized"
                :isActive="osStore.activeWindowId === window.id"
                :isMaximized="window.isMaximized"
                :zIndex="window.zIndex"
                @close="closeWindow"
                @minimize="minimizeWindow"
                @toggleMaximize="toggleMaximizeWindow"
                @focus="activateWindow"/>
        </DesktopArea>
        <TaskBar />
    </div>
</template>
<style scoped>
    .webos {
        height: 100vh; /* 100% высоты viewport */
        width: 100vw;  /* 100% ширины viewport */
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #f0f0f0; }/* Фон на случай если что-то не загрузится */
</style>
<script>
    import DesktopArea from './components/os/DesktopArea/DesktopArea.vue'
    import TaskBar from './components/os/TaskBar/TaskBar.vue'
    import SimpleWindow from './components/os/SimpleWindow/SimpleWindow.vue'
    import { useOsStore } from './stores/os.store'

    export default {
        name: 'App',
  
        components: {
            DesktopArea,
            TaskBar,
            SimpleWindow
        },
  
        data() {
            return {
                osStore: null
            }
        },
  
        methods: {
            closeWindow(windowId) {
                if (this.osStore) {
                    this.osStore.closeWindow(windowId);
                }
            },
    
            minimizeWindow(windowId) {
                if (this.osStore) {
                    this.osStore.minimizeWindow(windowId);
                }
            },
    
            toggleMaximizeWindow(windowId) {
                if (this.osStore) {
                    this.osStore.toggleMaximizeWindow(windowId);
                }
            },
    
            activateWindow(windowId) {
                if (this.osStore) {
                    this.osStore.activateWindow(windowId);
                }
            }
        },
  
        created() {
            this.osStore = useOsStore();
        },
  
        mounted() {
            setTimeout(() => {
                if (this.osStore) {
                    this.osStore.openWindow('notepad');
                }
            }, 500)
        }
    }
</script>