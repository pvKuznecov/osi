<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    export default {
        name: 'AppIcon',

        props: {
            iconImg: { type: [String, Object], default: '' },
            iconclass: { type: String, default: '' },
            icon: { type: String, default: '' },
            alt: { type: String, default: '' },
            size: { type: String, default: 'md' },
        },

        computed: {
            sizeClass() {
                return `app-icon--${this.size}`;
            },
        },
    };
</script>
