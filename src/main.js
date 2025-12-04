// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/global.css' // ← ЭТА СТРОЧКА ДОЛЖНА БЫТЬ
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')