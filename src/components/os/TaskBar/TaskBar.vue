<template>
  <div class="task-bar">
    <!-- Кнопка Menu -->
    <button class="start-button" @click="toggleStartMenu">
      <span class="start-icon">🌀</span>
      <span class="start-text">Menu</span>
    </button>
    
    <!-- Открытые приложения -->
    <div class="taskbar-apps">
      <button
        v-for="window in osStore.windows"
        :key="window.id"
        class="taskbar-app"
        :class="{ 'active': osStore.activeWindowId === window.id }"
        @click="toggleWindow(window.id)"
      >
        <span class="app-icon">{{ getAppIcon(window.appName) }}</span>
        <span class="app-title">{{ window.title }}</span>
      </button>
    </div>
    
    <!-- Системный трей -->
    <div class="system-tray">
      <div class="tray-time">{{ currentTime }}</div>
    </div>
  </div>
</template>

<script>
import { useOsStore } from '@/stores/os.store';

export default {
  name: "TaskBar",
  
  data() {
    return {
      currentTime: '',
      timer: null
    }
  },
  
  computed: {
    osStore() {
      return useOsStore()
    }
  },
  
  methods: {
    updateTime() {
      const now = new Date()
      this.currentTime = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    },
    
    getAppIcon(appName) {
      const icons = {
        notepad: '📝',
        explorer: '📁',
        calculator: '🧮',
        settings: '⚙️'
      }
      return icons[appName] || '📄'
    },
    
    toggleWindow(windowId) {
      const window = this.osStore.windows.find(w => w.id === windowId)
      if (window) {
        if (window.isMinimized) {
          this.osStore.restoreWindow(windowId)
        } else {
          this.osStore.activateWindow(windowId)
        }
      }
    },
    
    toggleStartMenu() {
      console.log('Меню Пуск')
    }
  },
  
  mounted() {
    this.updateTime()
    this.timer = setInterval(this.updateTime, 1000)
  },
  
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
</script>

<style scoped>
.task-bar {
  height: 40px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 10px;
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.start-button {
  height: 30px;
  padding: 0 12px;
  background: linear-gradient(to bottom, #1e9cff, #0078d4);
  border: none;
  border-radius: 4px;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.start-button:hover {
  background: linear-gradient(to bottom, #2aa1ff, #0085e8);
  transform: translateY(-1px);
}

.start-icon {
  font-size: 16px;
}

.taskbar-apps {
  display: flex;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  padding: 0 5px;
}

.taskbar-app {
  height: 30px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  min-width: 120px;
  transition: all 0.2s;
}

.taskbar-app:hover {
  background: rgba(255, 255, 255, 0.2);
}

.taskbar-app.active {
  background: rgba(255, 255, 255, 0.25);
}

.app-icon {
  font-size: 14px;
}

.system-tray {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.tray-time {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
</style>