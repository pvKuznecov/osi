<template>
  <div 
    v-if="!isMinimized"
    class="simple-window"
    :class="{ 'active': isActive, 'maximized': isMaximized }"
    :style="windowStyles"
    @mousedown="activateWindow"
  >
    <div 
      class="window-header" 
      @mousedown="startDrag"
      @dblclick="toggleMaximize"
    >
      <span class="window-title">{{ title }}</span>
      <div class="window-controls">
        <button class="window-btn minimize" @click="minimize">_</button>
        <button class="window-btn maximize" @click="toggleMaximize">
          {{ isMaximized ? '❐' : '□' }}
        </button>
        <button class="window-btn close" @click="close">✕</button>
      </div>
    </div>
    
    <div class="window-content">
      <slot>
        <div class="default-content">
          <p>Содержимое приложения {{ appName }}</p>
          <p>Это окно {{ isMaximized ? 'развернуто' : 'не развернуто' }}</p>
          <p>Размер: {{ windowWidth }} × {{ windowHeight }}</p>
        </div>
      </slot>
    </div>
    
    <!-- Ручки для изменения размера -->
    <template v-if="!isMaximized">
      <div class="resize-handle resize-top" @mousedown="startResize('n')"></div>
      <div class="resize-handle resize-right" @mousedown="startResize('e')"></div>
      <div class="resize-handle resize-bottom" @mousedown="startResize('s')"></div>
      <div class="resize-handle resize-left" @mousedown="startResize('w')"></div>
      <div class="resize-handle resize-top-right" @mousedown="startResize('ne')"></div>
      <div class="resize-handle resize-bottom-right" @mousedown="startResize('se')"></div>
      <div class="resize-handle resize-bottom-left" @mousedown="startResize('sw')"></div>
      <div class="resize-handle resize-top-left" @mousedown="startResize('nw')"></div>
    </template>
  </div>
</template>

<script>
export default {
  name: "SimpleWindow",
  
  props: {
    windowId: String,
    title: {
      type: String,
      default: 'Окно'
    },
    appName: {
      type: String,
      default: 'app'
    },
    isMinimized: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: false
    },
    isMaximized: {
      type: Boolean,
      default: false
    },
    zIndex: {
      type: Number,
      default: 100
    }
  },
  
  emits: ['close', 'minimize', 'focus', 'toggleMaximize'],
  
  data() {
    return {
      posX: 100,
      posY: 100,
      windowWidth: 400,
      windowHeight: 300,
      isDragging: false,
      isResizing: false,
      dragOffset: { x: 0, y: 0 },
      resizeDirection: '',
      resizeStart: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        mouseX: 0,
        mouseY: 0
      }
    }
  },
  
  computed: {
    windowStyles() {
      const baseStyles = {
        zIndex: this.zIndex
      }
      
      if (this.isMaximized) {
        return {
          ...baseStyles,
          left: '0',
          top: '0',
          width: '100vw',
          height: '100vh',
          borderRadius: '0'
        }
      } else {
        return {
          ...baseStyles,
          left: `${this.posX}px`,
          top: `${this.posY}px`,
          width: `${this.windowWidth}px`,
          height: `${this.windowHeight}px`
        }
      }
    }
  },
  
  mounted() {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
  },
  
  beforeUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  },
  
  methods: {
    activateWindow() {
      this.$emit('focus', this.windowId)
    },
    
    startDrag(e) {
      this.$emit('focus', this.windowId)
      
      if (this.isMaximized) return
      
      this.isDragging = true
      this.dragOffset = {
        x: e.clientX - this.posX,
        y: e.clientY - this.posY
      }
      
      e.stopPropagation()
    },
    
    startResize(direction) {
      if (this.isMaximized) return
      
      this.$emit('focus', this.windowId)
      
      this.isResizing = true
      this.resizeDirection = direction
      
      this.resizeStart.x = this.posX
      this.resizeStart.y = this.posY
      this.resizeStart.width = this.windowWidth
      this.resizeStart.height = this.windowHeight
      this.resizeStart.mouseX = event.clientX
      this.resizeStart.mouseY = event.clientY
    },
    
    handleMouseMove(e) {
      if (this.isDragging && !this.isMaximized) {
        let newX = e.clientX - this.dragOffset.x
        let newY = e.clientY - this.dragOffset.y
        
        const maxX = window.innerWidth - this.windowWidth
        const maxY = window.innerHeight - this.windowHeight
        
        this.posX = Math.max(0, Math.min(newX, maxX))
        this.posY = Math.max(0, Math.min(newY, maxY))
        
      } else if (this.isResizing && !this.isMaximized) {
        this.handleResize(e)
      }
    },
    
    handleResize(e) {
      const deltaX = e.clientX - this.resizeStart.mouseX
      const deltaY = e.clientY - this.resizeStart.mouseY
      
      const minWidth = 200
      const minHeight = 150
      
      let newX = this.resizeStart.x
      let newY = this.resizeStart.y
      let newWidth = this.resizeStart.width
      let newHeight = this.resizeStart.height
      
      if (this.resizeDirection.includes('e')) {
        newWidth = Math.max(minWidth, this.resizeStart.width + deltaX)
      }
      
      if (this.resizeDirection.includes('w')) {
        newWidth = Math.max(minWidth, this.resizeStart.width - deltaX)
        newX = this.resizeStart.x + (this.resizeStart.width - newWidth)
      }
      
      if (this.resizeDirection.includes('s')) {
        newHeight = Math.max(minHeight, this.resizeStart.height + deltaY)
      }
      
      if (this.resizeDirection.includes('n')) {
        newHeight = Math.max(minHeight, this.resizeStart.height - deltaY)
        newY = this.resizeStart.y + (this.resizeStart.height - newHeight)
      }
      
      this.posX = newX
      this.posY = newY
      this.windowWidth = newWidth
      this.windowHeight = newHeight
      
      this.keepWindowInBounds()
    },
    
    keepWindowInBounds() {
      const minWidth = 200
      const minHeight = 150
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      
      this.windowWidth = Math.max(minWidth, this.windowWidth)
      this.windowHeight = Math.max(minHeight, this.windowHeight)
      
      if (this.posX + this.windowWidth > screenWidth) {
        this.windowWidth = screenWidth - this.posX
      }
      
      if (this.posY + this.windowHeight > screenHeight) {
        this.windowHeight = screenHeight - this.posY
      }
      
      this.posX = Math.max(0, this.posX)
      this.posY = Math.max(0, this.posY)
      
      this.windowWidth = Math.max(minWidth, this.windowWidth)
      this.windowHeight = Math.max(minHeight, this.windowHeight)
    },
    
    handleMouseUp() {
      if (this.isDragging || this.isResizing) {
        this.keepWindowInBounds()
      }
      
      this.isDragging = false
      this.isResizing = false
    },
    
    minimize() {
      this.$emit('minimize', this.windowId)
    },
    
    toggleMaximize() {
      this.$emit('toggleMaximize', this.windowId)
    },
    
    close() {
      this.$emit('close', this.windowId)
    }
  }
}
</script>

<style scoped>
.simple-window {
  position: absolute;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  border: 1px solid #ccc;
}

.simple-window.active {
  border-color: #0078d4;
  box-shadow: 0 6px 20px rgba(0, 120, 212, 0.25);
}

.simple-window.maximized {
  border-radius: 0;
  box-shadow: none;
  border: none;
}

.window-header {
  background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ccc;
  cursor: move;
  user-select: none;
}

.simple-window.maximized .window-header {
  cursor: default;
  padding-top: 12px;
}

.window-title {
  font-weight: bold;
  font-size: 14px;
}

.window-controls {
  display: flex;
  gap: 4px;
}

.window-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #aaa;
  background: #f9f9f9;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.window-btn:hover {
  background: #e9e9e9;
}

.window-btn.maximize:hover {
  background: #e0e0e0;
}

.window-btn.close:hover {
  background: #e81123;
  color: white;
  border-color: #e81123;
}

.window-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
  background: white;
  cursor: default;
}

.default-content {
  color: #666;
}

.default-content p {
  margin: 4px 0;
}

/* Ручки изменения размера */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
}

.resize-top {
  top: 0;
  left: 5px;
  right: 5px;
  height: 5px;
  cursor: n-resize;
}

.resize-right {
  top: 5px;
  right: 0;
  bottom: 5px;
  width: 5px;
  cursor: e-resize;
}

.resize-bottom {
  bottom: 0;
  left: 5px;
  right: 5px;
  height: 5px;
  cursor: s-resize;
}

.resize-left {
  top: 5px;
  left: 0;
  bottom: 5px;
  width: 5px;
  cursor: w-resize;
}

.resize-top-right {
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  cursor: ne-resize;
}

.resize-bottom-right {
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  cursor: se-resize;
}

.resize-bottom-left {
  bottom: 0;
  left: 0;
  width: 10px;
  height: 10px;
  cursor: sw-resize;
}

.resize-top-left {
  top: 0;
  left: 0;
  width: 10px;
  height: 10px;
  cursor: nw-resize;
}
</style>