<template>
  <div class="desktop-area" @click="activateDesktop" :style="desktopStyle">
    <!-- Иконки на рабочем столе -->
    <div class="desktop-icons">
      <div 
        v-for="app in apps" 
        :key="app.name"
        class="desktop-icon"
        @dblclick="launchApp(app.name)"
      >
        <div class="icon">{{ app.icon }}</div>
        <span class="label">{{ app.label }}</span>
      </div>
    </div>
    
    <!-- Слот для окон -->
    <slot></slot>
  </div>
</template>

<script>
import { useOsStore } from '@/stores/os.store';

export default {
  name: "DesktopArea",
  
  data() {
    return {
      apps: [
        { name: 'notepad', label: 'Блокнот', icon: '📝' },
        { name: 'explorer', label: 'Проводник', icon: '📁' },
        { name: 'calculator', label: 'Калькулятор', icon: '🧮' },
        { name: 'settings', label: 'Настройки', icon: '⚙️' }
      ]
    }
  },
  
  computed: {
            // desktopStyle() {
            //     return {
            //         backgroundColor: '#0078d4',
            //         backgroundImage: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)'
            //     };
            // },
            desktopStyle() {
                return {
                    backgroundImage: `url(${this.getWallpaperUrl()})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }
            },
    
    osStore() {
      return useOsStore()
    }
  },
  
  methods: {
            getWallpaperUrl() {
                return require('@/assets/wallpapers/nwall.jpg');
            },
    activateDesktop() {
      this.osStore.activeWindowId = null
    },
    
    launchApp(appName) {
      const existingWindows = this.osStore.windows.filter(
        w => w.appName === appName && !w.isMinimized
      )
      
      if (existingWindows.length > 0) {
        this.osStore.activateWindow(existingWindows[0].id)
      } else {
        this.osStore.openWindow(appName)
      }
    }
  }
}
</script>

<style scoped>
.desktop-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: default;
  min-height: 0;
}

.desktop-icons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  align-items: flex-start;
}

.desktop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  cursor: pointer;
  padding: 10px;
  border-radius: 8px;
  transition: all 0.2s;
  user-select: none;
}

.desktop-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.desktop-icon .icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.desktop-icon .label {
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  font-size: 12px;
  text-align: center;
}
</style>