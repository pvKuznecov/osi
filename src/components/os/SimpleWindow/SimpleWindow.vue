<template src="./template.html"></template>
<style src="./style.css"></style>
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
                const baseStyles = {zIndex: this.zIndex}; // ИСПОЛЬЗУЕМ переданный z-index
      
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
            // Активация окна при клике
            activateWindow() {
                this.$emit('focus', this.windowId); // Отправляем событие
            },
    
            // Начало перетаскивания
            startDrag(e) {
                // Сначала активируем окно
                this.$emit('focus', this.windowId);
      
                // Если окно максимизировано - не перетаскиваем
                if (this.isMaximized) {
                    return;
                } else {
                    // Начинаем перетаскивание
                    this.isDragging = true;
                    this.dragOffset = {
                        x: e.clientX - this.posX,
                        y: e.clientY - this.posY
                    };
      
                    e.stopPropagation();
                }
            },
    
            // Начало изменения размера
            startResize(direction) {
                if (this.isMaximized) return
      
                // Активируем окно
                this.$emit('focus', this.windowId);
      
                this.isResizing = true;
                this.resizeDirection = direction;
      
                // Сохраняем начальные значения
                this.resizeStart.x = this.posX;
                this.resizeStart.y = this.posY;
                this.resizeStart.width = this.windowWidth;
                this.resizeStart.height = this.windowHeight;
                this.resizeStart.mouseX = event.clientX;
                this.resizeStart.mouseY = event.clientY;
            },
    
            // Обработка движения мыши
            handleMouseMove(e) {
                if (this.isDragging && !this.isMaximized) {
                    // Перетаскивание окна
                    let newX = e.clientX - this.dragOffset.x;
                    let newY = e.clientY - this.dragOffset.y;
        
                    // Ограничиваем позицию экраном
                    const maxX = window.innerWidth - this.windowWidth;
                    const maxY = window.innerHeight - this.windowHeight;
        
                    this.posX = Math.max(0, Math.min(newX, maxX));
                    this.posY = Math.max(0, Math.min(newY, maxY));
                } else if (this.isResizing && !this.isMaximized) {
                    // Изменение размера окна
                    this.handleResize(e);
                }
            },
    
            // Изменение размера окна
            handleResize(e) {
                const deltaX = e.clientX - this.resizeStart.mouseX;
                const deltaY = e.clientY - this.resizeStart.mouseY;
      
                // Минимальные размеры окна
                const minWidth = 200;
                const minHeight = 150;
      
                // Начальные значения
                let newX = this.resizeStart.x;
                let newY = this.resizeStart.y;
                let newWidth = this.resizeStart.width;
                let newHeight = this.resizeStart.height;
      
                // Обработка изменения размера в зависимости от направления
                if (this.resizeDirection.includes('e')) {
                    // Изменение правой границы
                    newWidth = Math.max(minWidth, this.resizeStart.width + deltaX);
                }
      
                if (this.resizeDirection.includes('w')) {
                    // Изменение левой границы
                    newWidth = Math.max(minWidth, this.resizeStart.width - deltaX);
                    newX = this.resizeStart.x + (this.resizeStart.width - newWidth);
                }
      
                if (this.resizeDirection.includes('s')) {
                    // Изменение нижней границы
                    newHeight = Math.max(minHeight, this.resizeStart.height + deltaY);
                }
      
                if (this.resizeDirection.includes('n')) {
                    // Изменение верхней границы
                    newHeight = Math.max(minHeight, this.resizeStart.height - deltaY);
                    newY = this.resizeStart.y + (this.resizeStart.height - newHeight);
                }
      
                // Применяем изменения
                this.posX = newX;
                this.posY = newY;
                this.windowWidth = newWidth;
                this.windowHeight = newHeight;
      
                // Ограничиваем окно в пределах экрана
                this.keepWindowInBounds();
            },
    
            // Ограничение окна в пределах экрана
            keepWindowInBounds() {
                const minWidth = 200;
                const minHeight = 150;
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
      
                // Гарантируем минимальные размеры
                this.windowWidth = Math.max(minWidth, this.windowWidth);
                this.windowHeight = Math.max(minHeight, this.windowHeight);
      
                // Не даем окну выйти за правую границу
                if (this.posX + this.windowWidth > screenWidth) {
                    this.windowWidth = screenWidth - this.posX;
                }
      
                // Не даем окну выйти за нижнюю границу
                if (this.posY + this.windowHeight > screenHeight) {
                    this.windowHeight = screenHeight - this.posY;
                }
      
                // Не даем уйти за левую и верхнюю границы
                this.posX = Math.max(0, this.posX);
                this.posY = Math.max(0, this.posY);
      
                // Проверяем минимальные размеры еще раз
                this.windowWidth = Math.max(minWidth, this.windowWidth);
                this.windowHeight = Math.max(minHeight, this.windowHeight);
            },
    
            // Окончание перетаскивания/изменения размера
            handleMouseUp() {
                if (this.isDragging || this.isResizing) {
                    // Финальная проверка границ
                    this.keepWindowInBounds();
                }
      
                this.isDragging = false;
                this.isResizing = false;
            },
    
            // Сворачивание окна
            minimize() {
                this.$emit('minimize', this.windowId);
            },
    
            // Переключение максимизации
            toggleMaximize() {
                this.$emit('toggleMaximize', this.windowId)
            },
    
            // Закрытие окна
            close() {
                this.$emit('close', this.windowId)
            }
        }
    }
</script>