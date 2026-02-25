// import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import './styles/global.css'
// import App from './App.vue'

// const app = createApp(App)
// const pinia = createPinia()

// app.use(pinia)
// app.mount('#app')
// ------
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { BootstrapVue3 } from 'bootstrap-vue-3';
import { initDatabase } from './idb/db';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/global.css';
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(BootstrapVue3);

async function dbstart() {
    try {
        await initDatabase();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
}
dbstart();

app.mount('#app');