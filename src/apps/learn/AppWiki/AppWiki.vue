<template src="./template.html"></template>

<script>
    export default {
        name: 'AppWiki',
  
        // props: {
        //     initialUrl: {
        //         type: String,
        //         default: 'https://ru.wikipedia.org/wiki/%D0%97%D0%B0%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0'
        //     }
        // },
  
  data() {
    return {
        currentUrl: 'https://ru.wikipedia.org/wiki/%D0%97%D0%B0%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0',
        iframeSrc: 'https://ru.wikipedia.org/wiki/%D0%97%D0%B0%D0%B3%D0%BB%D0%B0%D0%B2%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D1%80%D0%B0%D0%BD%D0%B8%D1%86%D0%B0',
        //   currentUrl: this.initialUrl,
        // iframeSrc: this.initialUrl,
        loading: false,
        error: false,
      
      // История для навигации ВНУТРИ нашего компонента
      history: [this.initialUrl],
      currentHistoryIndex: 0,
      
      // Ключ для принудительного пересоздания iframe
      iframeKey: 0
    };
  },
  
  computed: {
    canGoBack() {
      return this.currentHistoryIndex > 0;
    },
    
    canGoForward() {
      return this.currentHistoryIndex < this.history.length - 1;
    }
  },
  
  methods: {
    // Корректный метод навигации
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
        
        // Принудительно обновляем iframe
        this.iframeKey++;
        
      } catch (e) {
        console.error('Invalid URL:', url);
        this.error = true;
      }
    },
    
    // Назад/вперёд по НАШЕЙ истории (не iframe!)
    goBack() {
      if (this.canGoBack) {
        this.currentHistoryIndex--;
        this.currentUrl = this.history[this.currentHistoryIndex];
        this.iframeSrc = this.currentUrl;
        this.loading = true;
        this.iframeKey++;
      }
    },
    
    goForward() {
      if (this.canGoForward) {
        this.currentHistoryIndex++;
        this.currentUrl = this.history[this.currentHistoryIndex];
        this.iframeSrc = this.currentUrl;
        this.loading = true;
        this.iframeKey++;
      }
    },
    
    // Обновление через пересоздание iframe
    reload() {
      this.loading = true;
      this.error = false;
      // Просто меняем ключ, чтобы Vue пересоздал iframe
      this.iframeKey++;
    },
    
    // Загрузка завершена
    onIframeLoad() {
      this.loading = false;
      this.error = false;
      
      // НЕ пытаемся получить URL из iframe - это вызовет CORS ошибку!
      // Вместо этого используем наш сохранённый URL
      
      // Можно попробовать безопасно получить заголовок
      this.safeGetTitle();
    },
    
    // Ошибка загрузки
    onIframeError() {
      this.loading = false;
      this.error = true;
    },
    
    // Безопасное получение заголовка (если разрешено)
    safeGetTitle() {
      try {
        const iframe = this.$refs.iframeRef;
        if (iframe && iframe.contentDocument) {
          const title = iframe.contentDocument.title;
          if (title) {
            console.log('Page title:', title);
            // Можно обновить заголовок окна если нужно
          }
        }
      } catch (e) {
        // CORS - игнорируем
        console.log('Cannot access iframe content due to CORS');
      }
    },
    
    // Открыть в новой вкладке
    openInNewTab() {
      window.open(this.currentUrl, '_blank', 'noopener,noreferrer');
    },
    
    // Безопасная навигация внутри iframe (если это наш домен)
    safeNavigate(url) {
      try {
        const iframe = this.$refs.iframeRef;
        if (iframe && iframe.contentWindow) {
          // Только если это тот же origin
          if (this.isSameOrigin(iframe.contentWindow.location.href)) {
            iframe.contentWindow.location.href = url;
          }
        }
      } catch (e) {
        // Используем обычную навигацию
        this.currentUrl = url;
        this.navigate();
      }
    },
    
    // Проверка same-origin (упрощённо)
    isSameOrigin(url) {
      try {
        const currentOrigin = window.location.origin;
        const targetOrigin = new URL(url).origin;
        return currentOrigin === targetOrigin;
      } catch {
        return false;
      }
    }
  },
  
  mounted() {
    this.loading = true;
  }
};
</script>

<style scoped>
.browser-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
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
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.go-btn:hover {
  background: #0056b3;
}

.external-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.external-btn:hover {
  background: #1e7e34;
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