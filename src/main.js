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
import { BootstrapVue3 } from 'bootstrap-vue-3'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/global.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(BootstrapVue3)

// Принудительно загружаем все состояния перед монтированием
const { useAppsStore } = require('./stores/apps.store');
const appsStore = useAppsStore();

// appsStore.getStats()
console.log('App starting, loaded states:', appsStore.getStats());

app.mount('#app')