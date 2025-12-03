<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    export default {
        name: "SimpleWindow",
        props: {
            windowId: String,
            title: { type: String, default: 'Окно' },
            appName: { type: String, default: 'app' },
            isMinimized: { type: Boolean, default: false }
        },
        emits: ['close', 'minimize', 'focus', 'restore'],
        data() {
            return {
                posX: 100,
                posY: 100,
                isDragging: false,
                dragOffset: { x: 0, y: 0 }
            }
        },
        computed: {
            isVisible() { return !this.isMinimized; },
            
            windowStyle() {
                return {
                    left: `${this.posX}px`,
                    top: `${this.posY}px`
                }
            }
        },
        mounted() {
            // Добавляем глобальные обработчики для перетаскивания
            document.addEventListener('mousemove', this.onDrag);
            document.addEventListener('mouseup', this.stopDrag);
        },
        beforeUnmount() {
            // Убираем глобальные обработчики при уничтожении компонента
            document.removeEventListener('mousemove', this.onDrag);
            document.removeEventListener('mouseup', this.stopDrag);
        },
        methods: {
            focusWindow(e) {
                this.$emit('focus', this.windowId);
      
                // Начинаем перетаскивание, если кликнули на заголовок
                if (e.target.closest('.window-header')) {
                    this.startDrag(e);
                }
            },
            
            startDrag(e) {
                this.isDragging = true
                this.dragOffset = {
                    x: e.clientX - this.posX,
                    y: e.clientY - this.posY
                }
            },
            
            onDrag(e) {
                if (!this.isDragging) return;
      
                this.posX = e.clientX - this.dragOffset.x;
                this.posY = e.clientY - this.dragOffset.y;
      
                // Ограничиваем перемещение в пределах экрана
                const maxX = window.innerWidth - 300;
                const maxY = window.innerHeight - 200;
      
                this.posX = Math.max(0, Math.min(this.posX, maxX));
                this.posY = Math.max(0, Math.min(this.posY, maxY));
            },
    
            stopDrag() { this.isDragging = false; },
    
            minimize() { this.$emit('minimize', this.windowId); },
    
            maximize() { console.log('Максимизировать окно', this.windowId); },
    
            close() { this.$emit('close', this.windowId); },
        }
    }
</script>