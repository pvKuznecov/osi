// import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import './styles/global.css'
// import App from './App.vue'

// const app = createApp(App)
// const pinia = createPinia()

// app.use(pinia)
// app.mount('#app')
// ------
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/global.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Принудительно загружаем все состояния перед монтированием
const { useAppsStore } = require('./stores/apps.store');
const appsStore = useAppsStore();

// appsStore.getStats()
console.log('App starting, loaded states:', appsStore.getStats());

app.mount('#app')