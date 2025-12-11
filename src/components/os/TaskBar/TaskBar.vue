<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';
    import { appsConfig } from '@/config/applications';

    export default {
        name: "TaskBar",
  
        data() {
            return {
                currentTime: '',
                timer: null,
                showMenu: false,
            };
        },
  
        computed: {
            osStore() {
                return useOsStore();
            },

            appsList() {
                return appsConfig.getStartMenuApps();
            }
        },
  
        methods: {
            updateTime() {
                const now = new Date();
                this.currentTime = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            },
    
            toggleWindow(windowId) {
                const window = this.osStore.windows.find(w => w.id === windowId);
                
                if (window) {
                    console.log('window', window);
                    if (window.isMinimized) {
                        this.osStore.restoreWindow(windowId);
                    } else {
                        this.osStore.activateWindow(windowId);
                    }
                }
            },
    
            toggleStartMenu() {
                this.showMenu = !this.showMenu;
            }
        },
  
        mounted() {
            this.updateTime();
            this.timer = setInterval(this.updateTime, 1000);
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>