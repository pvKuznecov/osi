# osi

<h3>Предварительная настройка проекта:</h3>
<ul>
    <li>
        <h4>Установка Pinia</h4>
        <code>npm install pinia</code>
        <br>
        Базовая настройка в main.js/ts:<br>
        <code>
        import { createApp } from 'vue'<br>
        import { createPinia } from 'pinia'<br>
        import App from './App.vue';<br>
        const pinia = createPinia();<br>
        const app = createApp(App);<br>   
        app.use(pinia);<br>
        app.mount('#app');<br>
        </code>
    </li>
    <li>
        <h4>Установка BootstrapVue (для Vue 3)</h4>
        Для Vue 3 используем BootstrapVue Next:<br>
        <code>
            npm install bootstrap bootstrap-vue-3<br>
            npm install bootstrap-icons
        </code>
    </li>
    <li>
        <h4>Установка пакета music-metadata</h4>
        <i>(Нужен для компонента OSIMPlayer)</i><br>
        <code>npm install music-metadata</code>
    </li>
</ul>
<h3>Полезно:</h3>
<ul>
    <li>Убить процессы на порту:<br><code>npx kill-port *порт*</code></li>
    <li>
        Пример доработки <i>vue.config.js</i> - сборка проекта в папку для дальнейшего размещения его на gitlab webpages:<br>
        <code>publicPath: process.env.NODE_ENV === "production" ? "/osi/" : "/",<br>outputDir: "docs",</code>
    </li>
</ul>