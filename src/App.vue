<template>
    <AutorizationArea v-if="!isAutorized" @selectUser="selectUser" />
    <div v-if="isAutorized" class="webos">
        <DesktopArea :USERID="USERID">
            <SimpleWindow v-for="window in osStore.windows"
                :key="window.id"
                :windowId="window.id"
                :title="window.title"
                :appName="window.appName"
        
                :contentApp="window.contentApp"
                :icon="window.icon"
                :iconclass="window.iconclass"
                :defWidth="window.defWidth"
                :defHeight="window.defHeight"
                :isMinimized="window.isMinimized"
                :isActive="osStore.activeWindowId === window.id"
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
<!-- <style scoped>
    .webos { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
</style> -->
<style src="./styles/global.css"></style>
<script>
    import AutorizationArea from './components/os/AutorizationArea/AutorizationArea.vue';
    import DesktopArea from './components/os/DesktopArea/DesktopArea.vue';
    import TaskBar from './components/os/TaskBar/TaskBar.vue';
    import SimpleWindow from './components/os/SimpleWindow/SimpleWindow.vue';
    import { useOsStore } from './stores/os.store';
    import { useAppsStore } from './stores/apps.store';

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
                osStore: null,
                appsStore: null,
                USERID: null,
                USER: {},
                // useAppsStore: null
            }
        },

        created() {
            this.osStore = useOsStore();
            this.appsStore = useAppsStore();
            // this.useAppsStore = useAppsStore();
        },
  
        methods: {
            closeWindow(windowId) {
                console.log("closeWindow IT!");
                if (this.osStore) {
                    this.osStore.closeWindow(windowId);
                }

                if (this.appsStore) {
                    this.appsStore.deleteWindowState(windowId);
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
            },

            selectUser(userId) {
                console.log('userId', userId);
                this.USERID = userId;
                this.isAutorized = true;
            }
        },
  
        // mounted() {
        // }
    }
</script>