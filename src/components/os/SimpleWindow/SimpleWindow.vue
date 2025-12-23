<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { defineAsyncComponent } from 'vue';

    export default {
        name: "SimpleWindow",

        props: {
            windowId: String,
            title: { type: String, default: 'Окно' },
            appName: { type: String, default: 'app' },
            isMinimized: { type: Boolean, default: false },
            isMaximized: { type: Boolean, default: false },
            isActive: { type: Boolean, default: false },
            resizable: { type: Boolean, default: true },
            zIndex: { type: Number, default: 100 },
            defWidth: { type: Number, default: 400 },
            defHeight: { type: Number, default: 400 },
            icon: {type: String, default: '📄' },
            canMinimize: {type: Boolean, default: true},
        },
  
        emits: ['close', 'minimize', 'focus', 'toggleMaximize'],
  
        data() {
            return {
                posX: this.getRandomIntInclusive(),
                posY: this.getRandomIntInclusive(),
                windowWidth: this.defWidth,
                windowHeight: this.defHeight,
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
                },
            }
        },
  
        computed: {
            dynamicComponent() {
                // маппинг имен компонентов (пока это никак не победить, ПОДУМАТЬ НАД ЭТИМ)
                const componentMap = {
                    'OSIHelper': () => import('@/apps/system/OSIHelper/OSIHelper.vue'),
                    'OSICalculator': () => import('@/apps/system/OSICalculator/OSICalculator.vue'),
                    'OSISettings': () => import('@/apps/system/OSISettings/OSISettings.vue'),
                    'OSIMPlayer': () => import('@/apps/system/OSIMPlayer/OSIMPlayer.vue')
                };

                if (this.appName && componentMap[this.appName]) {
                    return defineAsyncComponent(componentMap[this.appName]);                    
                } else {
                    return null;
                }
            },
            windowStyles() {
                const baseStyles = {zIndex: this.zIndex };
      
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
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleMouseUp);
        },
  
        beforeUnmount() {
            document.removeEventListener('mousemove', this.handleMouseMove);
            document.removeEventListener('mouseup', this.handleMouseUp);
        },
  
        methods: {
            getRandomIntInclusive() {
                let min = Math.ceil(90); // Округляем минимум вверх
                let max = Math.floor(130); // Округляем максимум вниз
                
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            activateWindow() {
                this.$emit('focus', this.windowId);
            },
    
            startDrag(e) {
                this.$emit('focus', this.windowId);
      
                if (this.isMaximized) return;
      
                this.isDragging = true;
                this.dragOffset = {
                    x: e.clientX - this.posX,
                    y: e.clientY - this.posY
                };
      
                e.stopPropagation();
            },
    
            startResize(direction) {
                if (this.isMaximized) return;
      
                this.$emit('focus', this.windowId);
      
                this.isResizing = true;
                this.resizeDirection = direction;
      
                this.resizeStart.x = this.posX;
                this.resizeStart.y = this.posY;
                this.resizeStart.width = this.windowWidth;
                this.resizeStart.height = this.windowHeight;
                this.resizeStart.mouseX = event.clientX;
                this.resizeStart.mouseY = event.clientY;
            },
    
            handleMouseMove(e) {
                if (this.isDragging && !this.isMaximized) {
                    let newX = e.clientX - this.dragOffset.x;
                    let newY = e.clientY - this.dragOffset.y;
        
                    const maxX = window.innerWidth - this.windowWidth;
                    const maxY = window.innerHeight - this.windowHeight;
        
                    this.posX = Math.max(0, Math.min(newX, maxX));
                    this.posY = Math.max(0, Math.min(newY, maxY));
                } else if (this.isResizing && !this.isMaximized) {
                    this.handleResize(e);
                }
            },
    
            handleResize(e) {
                const minWidth = 200;
                const minHeight = 150;
                const deltaX = e.clientX - this.resizeStart.mouseX;
                const deltaY = e.clientY - this.resizeStart.mouseY;                
      
                let newX = this.resizeStart.x;
                let newY = this.resizeStart.y;
                let newWidth = this.resizeStart.width;
                let newHeight = this.resizeStart.height;
      
                if (this.resizeDirection.includes('e')) {
                    newWidth = Math.max(minWidth, this.resizeStart.width + deltaX);
                }
      
                if (this.resizeDirection.includes('w')) {
                    newWidth = Math.max(minWidth, this.resizeStart.width - deltaX);
                    newX = this.resizeStart.x + (this.resizeStart.width - newWidth);
                }
      
                if (this.resizeDirection.includes('s')) {
                    newHeight = Math.max(minHeight, this.resizeStart.height + deltaY);
                }
      
                if (this.resizeDirection.includes('n')) {
                    newHeight = Math.max(minHeight, this.resizeStart.height - deltaY);
                    newY = this.resizeStart.y + (this.resizeStart.height - newHeight);
                }
      
                this.posX = newX;
                this.posY = newY;
                this.windowWidth = newWidth;
                this.windowHeight = newHeight;
      
                this.keepWindowInBounds();
            },
    
            keepWindowInBounds() {
                const minWidth = 200;
                const minHeight = 150;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
      
                this.windowWidth = Math.max(minWidth, this.windowWidth);
                this.windowHeight = Math.max(minHeight, this.windowHeight);
      
                if (this.posX + this.windowWidth > screenWidth) {
                    this.windowWidth = screenWidth - this.posX;
                }
      
                if (this.posY + this.windowHeight > screenHeight) {
                    this.windowHeight = screenHeight - this.posY;
                }
      
                this.posX = Math.max(0, this.posX);
                this.posY = Math.max(0, this.posY);
      
                this.windowWidth = Math.max(minWidth, this.windowWidth);
                this.windowHeight = Math.max(minHeight, this.windowHeight);
            },
    
            handleMouseUp() {
                if (this.isDragging || this.isResizing) {
                    this.keepWindowInBounds();
                }
      
                this.isDragging = false;
                this.isResizing = false;
            },
    
            minimize() {
                this.$emit('minimize', this.windowId);
            },
    
            toggleMaximize() {
                this.$emit('toggleMaximize', this.windowId);
            },
    
            close() {
                this.$emit('close', this.windowId);
            }
        }
    }
</script>