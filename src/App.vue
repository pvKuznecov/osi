<template>
  <div class="webos">
    <DesktopArea>
      <SimpleWindow
        v-for="window in osStore.windows"
        :key="window.id"
        :windowId="window.id"
        :title="window.title"
        :appName="window.appName"
        @close="closeWindow"
        @focus="focusWindow"
      />
    </DesktopArea>
    <TaskBar />
  </div>
</template>

<script>
import DesktopArea from './components/os/DesktopArea/DesktopArea.vue'
import TaskBar from './components/os/TaskBar.vue'
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
    
    focusWindow(windowId) {
      if (this.osStore) {
        this.osStore.activeWindowId = windowId
      }
    }
  },
  
  created() {
    // Инициализируем хранилище
    this.osStore = useOsStore()
  },
  
  mounted() {
    // Открываем демо-окно при запуске
    setTimeout(() => {
      if (this.osStore) {
        this.osStore.openWindow('notepad')
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