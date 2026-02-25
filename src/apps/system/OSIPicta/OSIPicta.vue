<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    export default {
        name: 'OSIPicta',

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0}
        },

        data() {
            return {
                images: [],
                isLoading: false,
                currentIndex: -1,
                scale: 1,
                infoPanelVisible: false,
                currentImageInfo: {},
                canScrollLeft: false,
                canScrollRight: false,
                selectedThumbnailRef: null,
                saveTimeout: null,
                imageNaturalWidth: 0,
                imageNaturalHeight: 0,
                isZoomed: false
            }
        },

        computed: {
            currentImage() {
                return this.images[this.currentIndex] || null;                
            },
    
            imageStyle() {
                if (!this.currentImage) return {};
                
                // Применяем transform только если масштаб изменен
                const style = {
                    opacity: this.isLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    maxWidth: this.isZoomed ? 'none' : '100%',
                    maxHeight: this.isZoomed ? 'none' : '100%',
                    width: this.isZoomed ? 'auto' : 'auto',
                    height: this.isZoomed ? 'auto' : 'auto'
                };
                
                // Добавляем transform только если масштаб не 1
                if (this.scale !== 1) {
                    style.transform = `scale(${this.scale})`;
                    style.transformOrigin = 'center center';
                }
                
                return style;
            }
        },

        methods: {
            throttledSaveState() {
                if (this.saveTimeout) clearTimeout(this.saveTimeout);
      
                this.saveTimeout = setTimeout(() => {
                    this.saveTimeout = null;
                }, 2000);
            },

            openFilePicker() { 
                this.$refs.fileInput.click(); 
            },

            fileToDataUrl(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsDataURL(file);
                });
            },

            async handleFileSelect(event) {
                const files = Array.from(event.target.files);
                
                await this.loadImages(files);
                event.target.value = '';
            },

            async loadImages(files) {
                this.isLoading = true;
                
                try {
                    const newImages = [];
                    
                    for (const file of files) {
                        const dataUrl = await this.fileToDataUrl(file);
                        
                        newImages.push({
                            file,
                            dataUrl,
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            lastModified: file.lastModified
                        });
                    }
                    
                    this.images = [
                        ...this.images,
                        ...newImages
                    ];
                    
                    if (this.images.length > 0 && this.currentIndex === -1) {
                        this.currentIndex = 0;
                        this.$nextTick(() => {
                            this.onImageLoad();
                        });
                    }
                    
                } catch (error) {
                    console.error('Ошибка загрузки изображений:', error);
                    alert('Не удалось загрузить изображения');
                } finally {
                    this.isLoading = false;
                }
            },

            onImageLoad() {
                const img = this.$refs.image;
                if (img) {
                    this.imageNaturalWidth = img.naturalWidth;
                    this.imageNaturalHeight = img.naturalHeight;
                }
                this.Prepare_fileInfo();
                this.$nextTick(() => {
                    this.scrollToSelectedThumbnail();
                    this.fitToWindow(); // Вместо resetView
                });
            },

            resetView() {
                // Сбрасываем масштаб и режим зума
                this.scale = 1;
                this.isZoomed = false;
                
                // Подгоняем изображение под окно, если оно большое
                this.$nextTick(() => {
                    this.fitToWindow();
                });
            },

            zoomIn() {
                this.scale = Math.min(this.scale * 1.2, 3);
                this.isZoomed = this.scale !== 1;
            },

            zoomOut() {
                this.scale = Math.max(this.scale * 0.8, 0.1);
                this.isZoomed = this.scale !== 1;
            },

            fitToWindow() {
                if (!this.currentImage || !this.$refs.image || !this.$refs.viewport) return;
                
                const viewport = this.$refs.viewport;
                const img = this.$refs.image;
                
                if (img.complete) {
                    const scaleX = viewport.clientWidth / img.naturalWidth;
                    const scaleY = viewport.clientHeight / img.naturalHeight;
                    
                    // Если изображение меньше окна по обоим измерениям - показываем в оригинальном размере
                    if (img.naturalWidth <= viewport.clientWidth && img.naturalHeight <= viewport.clientHeight) {
                        this.scale = 1; // Оригинальный размер для маленьких картинок
                    } else {
                        // Для больших картинок - подгоняем под окно
                        this.scale = Math.min(scaleX, scaleY, 1);
                    }
                    
                    this.isZoomed = this.scale !== 1;
                    this.throttledSaveState();
                }
            },

            Chng_currentIndex(operVal) {
                let newVal = this.currentIndex;

                if (operVal === 'min' && this.currentIndex > 0) {
                    newVal = this.currentIndex - 1;
                } else if (operVal === 'min') {
                    newVal = 0;
                } else if (operVal === 'plus' && this.currentIndex < (this.images.length - 1)) {
                    newVal = this.currentIndex + 1;
                } else if (operVal === 'plus') {
                    newVal = this.images.length - 1;
                } else {
                    newVal = this.currentIndex;
                }
                
                this.currentIndex = newVal;
                this.$nextTick(() => {
                    this.scrollToSelectedThumbnail();
                    this.Prepare_fileInfo();
                    this.fitToWindow(); // Вместо resetView
                });
            },

            onImageError() { 
                alert('Не удалось загрузить изображение'); 
            },

            formatFileSize(bytes) {
                if (bytes === 0) return '0 Б';
                const k = 1024;
                const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },

            formatDate(timestamp) {
                return new Date(timestamp).toLocaleString();
            },

            MakeHandSelectImg(p) {
                let targetIndex = this.images.findIndex(elem => elem.dataUrl === p.dataUrl);
                if (targetIndex !== -1) {
                    this.currentIndex = targetIndex;
                    this.Prepare_fileInfo();
                    this.$nextTick(() => {
                        this.scrollToSelectedThumbnail();
                        this.fitToWindow(); // Вместо resetView
                    });
                }
            },

            Prepare_fileInfo() {
                if (!this.currentImage) return;
                
                const img = this.$refs.image;
                this.currentImageInfo = {
                    ...this.currentImage,
                    width: img ? img.naturalWidth : 0,
                    height: img ? img.naturalHeight : 0
                };
            },

            setSelectedThumbnailRef(el) {
                this.selectedThumbnailRef = el;
            },

            scrollToSelectedThumbnail() {
                if (this.selectedThumbnailRef && this.$refs.thumbnailList) {
                    const container = this.$refs.thumbnailList;
                    const thumbnail = this.selectedThumbnailRef;
                    
                    const containerWidth = container.clientWidth;
                    const thumbnailLeft = thumbnail.offsetLeft;
                    const thumbnailWidth = thumbnail.clientWidth;
                    
                    const scrollPosition = thumbnailLeft - (containerWidth / 2) + (thumbnailWidth / 2);
                    
                    container.scrollTo({
                        left: scrollPosition,
                        behavior: 'smooth'
                    });
                    
                    this.updateScrollButtons();
                }
            },

            onThumbnailScroll() {
                this.updateScrollButtons();
            },

            updateScrollButtons() {
                if (this.$refs.thumbnailList) {
                    const container = this.$refs.thumbnailList;
                    this.canScrollLeft = container.scrollLeft > 0;
                    this.canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 5);
                }
            },

            // очистка списка
            clearImageList() {
                this.images = [];
                this.isLoading = false;
                this.currentIndex = -1;
                this.scale = 1;
            },

            DelElemImg(image) {
                // Находим индекс удаляемого изображения
                const index = this.images.findIndex(img => img.dataUrl === image.dataUrl);
                
                if (index === -1) return;
                
                // Удаляем изображение из массива
                this.images.splice(index, 1);
                
                // Корректируем текущий индекс
                if (this.images.length === 0) {
                    // Если изображений не осталось
                    this.currentIndex = -1;
                    this.currentImageInfo = {};
                    this.isZoomed = false;
                    this.scale = 1;
                    this.translateX = 0;
                    this.translateY = 0;
                } else {
                    // Если удалили текущее изображение
                    if (this.currentIndex === index) {
                        // Переходим на предыдущее изображение, если оно есть, иначе на следующее
                        if (index > 0) {
                            this.currentIndex = index - 1;
                        } else {
                            this.currentIndex = 0;
                        }
                    } else if (this.currentIndex > index) {
                        // Если удалили изображение до текущего, сдвигаем индекс
                        this.currentIndex = this.currentIndex - 1;
                    }
                    
                    // Обновляем информацию о текущем изображении
                    this.$nextTick(() => {
                        this.Prepare_fileInfo();
                        this.scrollToSelectedThumbnail();
                        this.fitToWindow();
                    });
                }
            },
        },

        mounted() {
            window.addEventListener('resize', this.updateScrollButtons);
        },

        beforeUnmount() {
            window.removeEventListener('resize', this.updateScrollButtons);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
        }
    }
</script>