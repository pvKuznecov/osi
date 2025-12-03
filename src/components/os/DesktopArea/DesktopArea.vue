<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useOsStore } from '@/stores/os.store';

    export default {
        name: "DesktopArea",
        data() {
            return {
                apps: [
                    { name: 'notepad', label: 'Блокнот', icon: '📝' },
                    { name: 'explorer', label: 'Проводник', icon: '📁' },
                    { name: 'calculator', label: 'Калькулятор', icon: '🧮' },
                    { name: 'settings', label: 'Настройки', icon: '⚙️' }
                ]
            }
        },
    
        computed: {
            desktopStyle() {
                return {
                    backgroundColor: '#0078d4',
                    backgroundImage: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)'
                }
            }
        },
    
        methods: {
            launchApp(appName) {
                const osStore = useOsStore();
                osStore.openWindow(appName);
            }
        }
    }
</script>

