<template>
    <img
        v-if="iconImg"
        :src="iconImg"
        :alt="alt"
        class="app-icon-img"
        :class="sizeClass"
    />
    <!-- Старый подход: Bootstrap Icons + CSS-градиент (iconclass) -->
    <div
        v-else-if="iconclass"
        class="app-icon-css"
        :class="[sizeClass, iconclass]"
        :style="{ color: 'white' }"
    ></div>
    <span v-else-if="icon" class="app-icon-emoji" :class="sizeClass">{{ icon }}</span>
</template>

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
