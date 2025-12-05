<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';

    export default {
        name: "TaskBar",
  
        data() {
            return {
                currentTime: '',
                timer: null
            };
        },
  
        computed: {
            osStore() {
                return useOsStore();
            }
        },
  
        methods: {
            updateTime() {
                const now = new Date();
                this.currentTime = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            },
    
            getAppIcon(appName) {
                const icons = {
                    notepad: '📝',
                    explorer: '📁',
                    calculator: '🧮',
                    settings: '⚙️',
                    osihelper: 'ℹ️'
                };

                return icons[appName] || '📄';
            },
    
            toggleWindow(windowId) {
                const window = this.osStore.windows.find(w => w.id === windowId);
                
                if (window) {
                    if (window.isMinimized) {
                        this.osStore.restoreWindow(windowId);
                    } else {
                        this.osStore.activateWindow(windowId);
                    }
                }
            },
    
            toggleStartMenu() {
                console.log('Меню Пуск');
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