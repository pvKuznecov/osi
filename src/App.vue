<template>
  <div class="webos">
    <DesktopArea>
      <SimpleWindow
        v-for="window in osStore.windows"
        :key="window.id"
        :windowId="window.id"
        :title="window.title"
        :appName="window.appName"
        :contentApp="window.contentApp"
        :defWidth="window.defWidth"
        :defHeight="window.defHeight"
        :isMinimized="window.isMinimized"
        :isActive="osStore.activeWindowId === window.id"
        :isMaximized="window.isMaximized"
        :zIndex="window.zIndex"
        @close="closeWindow"
        @minimize="minimizeWindow"
        @toggleMaximize="toggleMaximizeWindow"
        @focus="activateWindow"
      />
    </DesktopArea>
    <TaskBar />
  </div>
</template>

<script>
import DesktopArea from './components/os/DesktopArea/DesktopArea.vue'
import TaskBar from './components/os/TaskBar/TaskBar.vue'
import SimpleWindow from './components/os/SimpleWindow/SimpleWindow.vue'
import { useOsStore } from './stores/os.store'

export default {
  name: 'App',
  
  components: {
    DesktopArea,
    TaskBar,
    SimpleWindow
  },
  
  data() {
    return {
      osStore: null
    }
  },
  
  methods: {
    closeWindow(windowId) {
      if (this.osStore) {
        this.osStore.closeWindow(windowId)
      }
    },
    
    minimizeWindow(windowId) {
      if (this.osStore) {
        this.osStore.minimizeWindow(windowId)
      }
    },
    
    toggleMaximizeWindow(windowId) {
      if (this.osStore) {
        this.osStore.toggleMaximizeWindow(windowId)
      }
    },
    
    activateWindow(windowId) {
      if (this.osStore) {
        this.osStore.activateWindow(windowId)
      }
    }
  },
  
  created() {
    this.osStore = useOsStore()
  },
  
  mounted() {
    setTimeout(() => {
      if (this.osStore) {
        // this.osStore.openWindow('notepad');
        this.osStore.openWindow({ name: 'notepad', label: 'Блокнот', icon: '📝', contentapp: 'Notepad' });
      }
    }, 500)
  }
}
</script>

<style scoped>
.webos {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>