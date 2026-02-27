<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { dFiles, DFile } from '@/idb/db';
    import { LangPack } from './lang';

    export default {
        name: 'OSIDirDigger',

        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0}
        },

        data() {
            return {
                LangData: {},
                currentFolder: null,
                currentPath: [],
                contents: [],
                selectedItem: null,
                fileInput: null,
                filterType: null, // для фильтрации по типу
            }
        },

        computed: {
            // Отфильтрованное содержимое
            filteredContents() {
                if (!this.filterType) return this.contents;
                return this.contents.filter(item => item.type === this.filterType);
            },
        },

        methods: {
            // Загрузка корневой папки
            async loadRootFolder() {
                try {
                    const Root = await dFiles.getRoot(this.USERID);
                    this.currentFolder = Root;
                    this.filterType = null;
                    
                    await this.loadFolderContents(Root.id);
                    this.currentPath = [Root];
                    this.selectedItem = null;
                } catch (error) {
                    console.error('Error loading root:', error);
                    alert('Ошибка загрузки корневой папки');
                }
            },

            // Загрузка содержимого папки
            // async loadFolderContents(folderId) {
            //     try {
            //         const items = await dFiles.getFolderContents(this.USERID, folderId);
            //         // Оборачиваем в DFile для доступа к методам
            //         this.contents = items.map(item => new DFile(item));
            //     } catch (error) {
            //         console.error('Error loading contents:', error);
            //     }
            // },
            // async loadFolderContents(folderId) {
            //     const items = await dFiles.getFolderContents(this.USERID, folderId);
            //     // Оборачиваем в DFile для доступа к геттерам
            //     this.contents = items.map(item => new DFile(item));
            // },

            // Навигация по папкам
            async navigateTo(folder) {
                if (folder.type !== 'folder') return;
                
                this.currentFolder = folder;
                await this.loadFolderContents(folder.id);
                
                // Обновляем путь
                const pathIndex = this.currentPath.findIndex(p => p.id === folder.id);
                if (pathIndex !== -1) {
                    this.currentPath = this.currentPath.slice(0, pathIndex + 1);
                } else {
                    this.currentPath.push(folder);
                }
            },

            // Создание новой папки
            async createNewFolder() {
                const folderName = prompt(this.LangData.enter_folder_name || 'Введите имя папки:');
                if (!folderName) return;
                
                try {
                    await dFiles.createFolder(
                        this.USERID,
                        this.currentFolder.id,
                        folderName
                    );
                    
                    await this.loadFolderContents(this.currentFolder.id);
                } catch (error) {
                    console.error('Error creating folder:', error);
                    alert(error.message);
                }
            },

            // Загрузка файлов
            uploadFiles() {
                if (this.fileInput) {
                    this.fileInput.click();
                }
            },

            async handleFileUpload(event) {
                const files = Array.from(event.target.files);
                
                try {
                    for (const file of files) {
                        const fileData = {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            metadata: await this.extractMetadata(file)
                        };
                        
                        await dFiles.addFile(
                            this.USERID,
                            this.currentFolder.id,
                            fileData,
                            file
                        );
                    }
                    
                    await this.loadFolderContents(this.currentFolder.id);
                } catch (error) {
                    console.error('Error uploading files:', error);
                    alert('Ошибка при загрузке файлов');
                }
                
                event.target.value = '' // Сбрасываем input
            },

            // Извлечение метаданных из файла
            async extractMetadata(file) {
                // Для изображений
                if (file.type.startsWith('image/')) {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                width: img.width,
                                height: img.height
                            });
                        };
                        img.onerror = () => resolve({});
                        img.src = URL.createObjectURL(file);
                    });
                }
                
                // Для аудио (можно добавить позже)
                return {};
            },

            // Выбор элемента
            selectItem(item) {
                this.selectedItem = item;
            },

            // Открытие элемента (папки или файла)
            async openItem(item) {
                if (item.type === 'folder') {
                    await this.navigateTo(item);
                } else {
                    // Здесь можно открыть файл в соответствующем приложении
                    console.log('Open file:', item);
                    this.openFileInApp(item);
                }
            },

            // Открытие файла в приложении
            openFileInApp(file) {
                // Эмитим событие для открытия файла в соответствующем приложении
                this.$emit('open-file', {
                    file: file,
                    app: this.getAppForFile(file)
                });
            },

            // Определение приложения для файла
            getAppForFile(file) {
                const appMap = {
                    'audio': 'osimplayer',
                    'text': 'ositexteditor',
                    'image': 'osipicta'
                };
                return appMap[file.type] || null;
            },

            // // Получение иконки для файла
            // getFileIcon(item) {
            //     if (item.type === 'folder') return '📁';
            //     if (item.type === 'audio') return '🎵';
            //     if (item.type === 'image') return '🖼️';
            //     if (item.type === 'video') return '🎬';
            //     if (item.type === 'text') return '📝';
            //     if (item.type === 'app') return '⚙️';
            //     if (item.type === 'archive') return '📦';
            //     return '📄';
            // },

            // Обрезка длинных имен
            truncateName(name, maxLength = 15) {
                if (name.length <= maxLength) return name;
                return name.substr(0, maxLength - 3) + '...';
            },

            // Форматирование размера
            formatSize(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            },

            // Навигация в домашнюю папку
            async navigateToHome() {
                // Можно создать папку "Документы" если её нет
                const docsFolder = this.contents.find(c => 
                    c.type === 'folder' && c.name === 'Documents'
                );
                
                if (docsFolder) {
                    await this.navigateTo(docsFolder);
                }
            },

            // Для отображения изображения
             getImageUrl(item) {
                if (item.blob) {
                    // Создаем URL из Blob
                    return URL.createObjectURL(item.blob);
                }
                return null;
            },
            
            // Освобождаем URL когда они больше не нужны
            revokeImageUrl(item) {
                if (item._objectUrl) {
                    URL.revokeObjectURL(item._objectUrl);
                    item._objectUrl = null;
                }
            },
            
            // Загрузка содержимого папки с обработкой URL
            async loadFolderContents(folderId) {
                const items = await dFiles.getFolderContents(this.USERID, folderId);
                
                // Освобождаем старые URL
                if (this.contents) {
                    this.contents.forEach(item => this.revokeImageUrl(item));
                }
                
                // Оборачиваем в DFile и создаем URL для изображений
                this.contents = items.map(item => {
                    const dFile = new DFile(item);
                    if (dFile.type === 'image' && dFile.blob) {
                        // Сохраняем URL для превью
                        dFile._objectUrl = URL.createObjectURL(dFile.blob);
                    }
                    return dFile;
                });
            },
            
            // Получение иконки в зависимости от типа
            getFileIcon(item) {
                const iconMap = {
                    folder: '📁',
                    audio: '🎵',
                    text: '📝',
                    image: '🖼️',
                    video: '🎬',
                    app: '⚙️',
                    archive: '📦',
                    file: '📄'
                };
                return iconMap[item.type] || '📄';
            },
            
            // Фильтрация содержимого (для левого меню)
            showImagesOnly() {
                this.filterType = 'image';
            },
            
            showTextOnly() {
                this.filterType = 'text';
            },

            showAudioOnly() {
                this.filterType = 'audio';
            },
            
            // Очистка перед уничтожением компонента
            beforeDestroy() {
                if (this.contents) {
                    this.contents.forEach(item => this.revokeImageUrl(item));
                }
            }
        },

        async mounted() {
            console.log(`OSIDirDigger mounted with windowId:`, this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем ссылку на fileInput
            this.fileInput = this.$refs.fileInput;
            
            await this.loadRootFolder();
        },
    }
</script>