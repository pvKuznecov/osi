<template>
    <div class="browser-app">    
        <!-- Панель управления браузером -->
        <div class="browser-controls" v-if="showControls">
            <div class="url-bar">
                <button @click="goBack" :disabled="!canGoBack" title="Назад">←</button>
                <button @click="goForward" :disabled="!canGoForward" title="Вперёд">→</button>
                <button @click="reload" title="Обновить">↻</button>
                
                <input 
                    v-model="currentUrl" 
                    @keyup.enter="navigate" 
                    class="url-input" 
                    placeholder="Введите URL..."
                />
                
                <button @click="navigate" class="go-btn">Перейти</button>
            </div>
        </div>
        
        <div class="iframe-wrapper">
            <iframe 
                ref="iframeRef" 
                :src="iframeSrc" 
                @load="onIframeLoad" 
                @error="onIframeError" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups" 
                referrerpolicy="no-referrer" 
            ></iframe>
        </div>    
        
        <div v-if="loading" class="loading-indicator">
            <div class="spinner"></div>
            <span>Загрузка...</span>
        </div>
        
        <div v-if="error" class="error-message">
            <p>⚠️ Не удалось загрузить страницу</p>
            <button @click="reload">Повторить</button>
        </div>
    </div>
</template>

<script>
import { useAppsStore } from '@/stores/apps.store';
import { mapStores } from 'pinia';

export default {
    name: 'AppWiki',

    props: {
        windowId: {
            type: String,
            required: true
        },
        showControls: {
            type: Boolean,
            default: true
        }
    },
    
    data() {
        const defLink = 'https://ru.wikipedia.org/wiki/%D0%97%D0%B0%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0';

        // В data() мы НЕ можем использовать this.appsStore
        // Возвращаем только базовые данные
        return {
            currentUrl: defLink,
            iframeSrc: defLink,
            loading: true,
            error: false,
            history: [defLink],
            currentHistoryIndex: 0
        };
    },
    
    computed: {
        // Подключаем store через mapStores
        ...mapStores(useAppsStore),
        
        canGoBack() {
            return this.currentHistoryIndex > 0;
        },
        
        canGoForward() {
            return this.currentHistoryIndex < this.history.length - 1;
        }
    },

    watch: {
        currentUrl(newUrl) {
            console.log("URL changed to:", newUrl);
            this.saveState();
        },
        currentHistoryIndex() {
            this.saveState();
        },
        history: {
            handler() {
                this.saveState();
            },
            deep: true
        }
    },

    methods: {
        // Инициализация из store (вызывается в mounted)
        initFromStore() {
            if (!this.windowId) return;
            
            const savedState = this.appsStore.getWindowState(this.windowId);
            console.log('Loaded state from store:', savedState);
            
            if (savedState) {
                this.currentUrl = savedState.currentUrl || this.currentUrl;
                this.iframeSrc = savedState.currentUrl || this.iframeSrc;
                this.history = savedState.history || this.history;
                this.currentHistoryIndex = savedState.currentHistoryIndex || this.currentHistoryIndex;
            }
        },

        // Сохраняем текущее состояние в store
        saveState() {
            if (!this.windowId || !this.appsStore) return;
            
            const state = {
                appType: 'wiki',
                currentUrl: this.currentUrl,
                history: [...this.history],
                currentHistoryIndex: this.currentHistoryIndex,
                timestamp: Date.now()
            };
            
            this.appsStore.saveWindowState(this.windowId, state);
        },

        // Навигация по URL
        navigate() {
            let url = this.currentUrl.trim();
            
            // Добавляем протокол если нужно
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            try {
                // Валидация URL
                new URL(url);
                this.iframeSrc = url;
                this.loading = true;
                this.error = false;
                
                // Добавляем в историю
                if (url !== this.history[this.currentHistoryIndex]) {
                    // Отрезаем будущее если мы не на конце истории
                    this.history = this.history.slice(0, this.currentHistoryIndex + 1);
                    this.history.push(url);
                    this.currentHistoryIndex = this.history.length - 1;
                }
                
            } catch (e) {
                console.error('Invalid URL:', url);
                this.error = true;
                this.loading = false;
            }
        },
        
        // Назад по истории
        goBack() {
            if (this.canGoBack) {
                this.currentHistoryIndex--;
                this.currentUrl = this.history[this.currentHistoryIndex];
                this.iframeSrc = this.currentUrl;
                this.loading = true;
            }
        },
        
        // Вперёд по истории
        goForward() {
            if (this.canGoForward) {
                this.currentHistoryIndex++;
                this.currentUrl = this.history[this.currentHistoryIndex];
                this.iframeSrc = this.currentUrl;
                this.loading = true;
            }
        },

        // Обновление страницы
        reload() {
            this.loading = true;
            this.error = false;
            
            // Форсируем перезагрузку iframe
            const tempSrc = this.iframeSrc;
            this.iframeSrc = '';
            
            // Небольшая задержка для гарантии перезагрузки
            setTimeout(() => {
                this.iframeSrc = tempSrc;
            }, 50);
        },

        // Загрузка завершена
        onIframeLoad() {
            console.log('Wiki iframe loaded successfully');
            this.loading = false;
            this.error = false;
            this.safeGetTitle();
        },

        // Ошибка загрузки
        onIframeError() {
            console.error('Wiki iframe failed to load');
            this.loading = false;
            this.error = true;
        },

        // Безопасное получение заголовка
        safeGetTitle() {
            try {
                const iframe = this.$refs.iframeRef;
                if (iframe && iframe.contentDocument) {
                    const title = iframe.contentDocument.title;
                    if (title) {
                        console.log('Wiki page title:', title);
                        // Можно обновить заголовок окна, если нужно
                        this.$emit('title-change', title);
                    }
                }
            } catch (e) {
                console.log('Cannot access iframe content due to CORS');
            }
        },
        
        // Открыть в новой вкладке
        openInNewTab() {
            window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
        }
    },

    mounted() {
        console.log('AppWiki mounted with windowId:', this.windowId);
        
        // Инициализируем данные из store после монтирования
        this.initFromStore();
        
        // Сохраняем начальное состояние
        this.saveState();
    },

    beforeUnmount() {
        console.log('AppWiki unmounting, windowId:', this.windowId);
        // Решите, нужно ли удалять состояние при закрытии окна
        // this.appsStore.deleteWindowState(this.windowId);
    }
};
</script>

<style scoped>
/* Стили остаются без изменений */
.browser-app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    position: relative;
}

.browser-controls {
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    padding: 10px;
    flex-shrink: 0;
}

.url-bar {
    display: flex;
    gap: 8px;
    align-items: center;
}

.url-bar button {
    padding: 6px 12px;
    border: 1px solid #ced4da;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    min-width: 36px;
    transition: all 0.2s;
}

.url-bar button:hover:not(:disabled) {
    background: #e9ecef;
}

.url-bar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.url-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.go-btn {
    background: #007bff !important;
    color: white !important;
    border-color: #007bff !important;
}

.go-btn:hover {
    background: #0056b3;
}

.iframe-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.iframe-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
}

.loading-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 10;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    padding: 20px;
    border-radius: 8px;
    color: #721c24;
    z-index: 10;
}

.error-message button {
    margin-top: 10px;
    padding: 8px 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>