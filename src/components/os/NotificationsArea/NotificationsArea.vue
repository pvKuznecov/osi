<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { appsConfig } from '@/config/applications';

    export default {
        name: 'NotificationsArea',

        props: {
            notifs: {
                type: Array,
                default: () => []
            }
        },
  
        data() {
            return {
            }
        },

        methods: {
            Get_appIcon(appId) {
                const appConfig = appsConfig.getAppById(appId);
                console.log('(Get_appIcon)appConfig', appConfig);

                return '🌀';
            },
            Get_appLabel(appId) {
                const appConfig = appsConfig.getAppById(appId);
                console.log('(Get_appLabel)appConfig', appConfig);

                return 'OSI';
            },
        },
    }
</script>