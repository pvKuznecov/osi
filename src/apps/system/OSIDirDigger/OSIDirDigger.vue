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
                filterType: null,       // для фильтрации по типу
                visibleMode: 'tile',    //tile || table
                contentSortMode: 'asc',    // 'asc' или 'desc' (вместо 'up'/'down')
                contentSortKey: 'name',
                sortKeys: ['name', 'type', 'extension', 'size', 'createdAt', 'updatedAt'],
                // Кэш для ObjectURL чтобы избежать утечек памяти
                objectUrls: new Map(),
                selectedRows: new Set(),
                allSelected: false,
                contextMenu: {
                    visible: false,
                    x: 0,
                    y: 0,
                    item: null
                },
                treeLoading: false,
                foldersTree: [],
                operFormRename: false,
                renameTarget: null,
                renameTarget_newName: '',
            }
        },

        computed: {
            // Отфильтрованное содержимое
            filteredContents() {
                let items = [...this.contents];
                
                // Фильтрация по типу
                if (this.filterType) items = items.filter(item => item.type === this.filterType);
                
                // Сортировка
                return this.sortItems(items);
            },
        },

        watch: {
            currentPath: {
                handler() {
                    this.$nextTick(() => {
                        this.scrollToEnd();
                    });
                },
                deep: true
            }
        },

        methods: {
            showContextMenu(event, item) {
                this.contextMenu = {
                    visible: true,
                    x: event.clientX,
                    y: event.clientY,
                    item: item
                };
                
                // Закрываем меню при клике вне его
                setTimeout(() => {
                    document.addEventListener('click', this.closeContextMenu, { once: true });
                }, 0);
            },

            // Скачивание файла
            async downloadFile(item) {
                try {
                    // Получаем полную информацию о файле из БД
                    const fileInfo = await dFiles.getInfo(item.id);
                    
                    if (!fileInfo || !fileInfo.blob) throw new Error('Файл не найден или не содержит данных');
                    
                    // Создаем URL из Blob
                    const url = window.URL.createObjectURL(fileInfo.blob);                    
                    // Создаем временную ссылку для скачивания
                    const link = document.createElement('a');
                    
                    link.href = url;
                    link.download = fileInfo.name; // Имя файла для скачивания
                    
                    // Добавляем в DOM, кликаем и удаляем
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Освобождаем URL
                    window.URL.revokeObjectURL(url);
                    
                    // Показываем уведомление об успехе
                    this.showMessage(`Файл "${fileInfo.name}" скачивается...`, 'success');
                    
                } catch (error) {
                    console.error('Error downloading file:', error);
                    this.showError(`Ошибка при скачивании: ${error.message}`);
                }
            },
    
            // Показать сообщение (можно заменить на вашу систему уведомлений)
            showMessage(message, type = 'info') {
                console.log(`[${type}] ${message}`);
                // Можно эмиттить событие для глобального уведомления
                this.$emit('notification', { message, type });
            },
            
            closeContextMenu() { this.contextMenu.visible = false; },

            sortBy(key) {
                if (this.contentSortKey === key) {
                    this.toggleSortMode();
                } else {
                    this.contentSortKey = key;
                    this.contentSortMode = 'asc';
                }
            },
    
            getSortIcon(key) {
                if (this.contentSortKey !== key) return '';

                return this.contentSortMode === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
            },
    
            toggleSelectRow(item) {
                if (this.selectedRows.has(item.id)) {
                    this.selectedRows.delete(item.id);
                } else {
                    this.selectedRows.add(item.id);
                }
            },
            
            selectAll(event) {
                if (event.target.checked) {
                    this.filteredContents.forEach(item => this.selectedRows.add(item.id));
                } else {
                    this.selectedRows.clear();
                }
            },

            // Эмиттить событие для глобального обработчика
            showError(message) { this.$emit('error', message); },
            
            // Загрузка корневой папки
            async loadRootFolder() {
                this.treeLoading = true;
                try {
                    const Root = await dFiles.getRoot(this.USERID);

                    this.currentFolder = Root;
                    this.filterType = null;
                    
                    await this.loadFolderContents(Root.id);
                    this.currentPath = [Root];
                    this.selectedItem = null;

                    // Строим дерево базовых папок
                    await this.buildFolderTree();
                    
                } catch (error) {
                    this.showError(`Ошибка загрузки: ${error.message}`);
                } finally {
                    this.treeLoading = false;
                }
            },
            
            async buildFolderTree() {
                try {
                    const Root = await dFiles.getRoot(this.USERID);
                    const RootChilds = (Root && Root.children) ? Root.children : [];
                    
                    let resArr = [];

                    for (const elementId of RootChilds) {
                        const elementData = await dFiles.getInfo(elementId);
                        
                        if (elementData.type === 'folder') resArr.push({...elementData});
                    }                    

                    this.foldersTree = resArr;
                } catch (error) {
                    this.showError(`Ошибка загрузки: ${error.message}`);
                }
            },

            // Получение информации о файле/папке
            async getFileInfo(itemId) {
                try {
                    // Если передан объект с id, используем его
                    const id = typeof itemId === 'object' ? itemId.id : itemId;
                    return await dFiles.getInfo(id);
                } catch (error) {
                    console.error('Error getting file info:', error);
                    this.showError(`Ошибка получения данных: ${error.message}`);
                    return null;
                }
            },

            Converter_dateTime(inpDate) {
                if (!inpDate) return '';
                
                const date = new Date(inpDate);
                return date.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },

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
                const folderName = prompt(this.LangData.enterfoldername);
                if (!folderName) return;
                
                try {
                    await dFiles.createFolder(
                        this.USERID,
                        this.currentFolder.id,
                        folderName
                    );
                    
                    await this.loadFolderContents(this.currentFolder.id);
                    await this.buildFolderTree();
                } catch (error) {
                    console.error('Error creating folder:', error);
                    alert(error.message);
                }
            },

            // Загрузка файлов
            uploadFiles() { if (this.fileInput) this.fileInput.click(); },

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
            selectItem(item) { this.selectedItem = item; },

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
            // Открытие папки из главного списка
            async openSubMainFolder(item) {
                if (item.type === 'folder') {
                    this.currentPath = [this.currentPath[0]];
                    await this.navigateTo(item);
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
                    // 'text': 'ositexteditor',
                    'image': 'osipicta'
                };
                return appMap[file.type] || null;
            },

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
                
                if (docsFolder) await this.navigateTo(docsFolder);
            },

            // Для отображения изображения (Используем закэшированный URL)
            getImageUrl(item) { return this.objectUrls.get(item.id) || null; },
            
            // Освобождаем URL когда они больше не нужны
            revokeImageUrl(item) {
                if (item._objectUrl) {
                    URL.revokeObjectURL(item._objectUrl);
                    item._objectUrl = null;
                }
            },
            
            // Обновленная загрузка содержимого папки
            async loadFolderContents(folderId) {
                try {
                    // Очищаем старые ObjectURL
                    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
                    this.objectUrls.clear();
                    
                    const items = await dFiles.getFolderContents(this.USERID, folderId);
                    
                    this.contents = items.map(item => {
                        const dFile = new DFile(item);
                        
                        // Создаем URL только для изображений и сохраняем в Map
                        if (dFile.type === 'image' && dFile.blob) {
                            const url = URL.createObjectURL(dFile.blob);
                            this.objectUrls.set(dFile.id, url);
                        }
                        
                        return dFile;
                    });
                    
                    this.selectedItem = null;
                } catch (error) {
                    this.showError('Ошибка загрузки содержимого папки');
                }
            },
            
            // Получение иконки в зависимости от типа
            getFileIcon(item) {
                const iconClassMap = {
                    folder: 'bi-folder-fill',
                    image: 'bi-image-fill',
                    audio: 'bi-file-music-fill',
                    archive: 'bi-file-earmark-zip-fill',
                    video: 'bi-film',
                    file: 'bi-file-earmark-fill',
                    app: 'bi-gear-wide-connected'
                };
                
                return iconClassMap[item] || '';
            },
            
            // сброс фильтра отображения
            showAll() { this.filterType = null; },
            // Фильтрация содержимого
            showImagesOnly() { this.filterType = 'image'; },            
            showTextOnly() { this.filterType = 'text'; },
            showAudioOnly() { this.filterType = 'audio'; },

            // смена режима отображения содержимого папки
            Chng_visibleMode() { this.visibleMode = (this.visibleMode == 'tile') ? 'table' : 'tile'; },

            // получить строковое наименование типа
            Get_strFileTypeName(typeVal) {
                switch(typeVal) {
                    case 'folder':
                        return this.LangData.typefilefolder;
                    case 'audio':
                        return this.LangData.typefileaudion;
                    case 'image':
                        return this.LangData.typefileimage;
                    case 'video':
                        return this.LangData.typefilevideo;
                    case 'archive':
                        return this.LangData.typefilearchive;
                    case 'file':
                        return this.LangData.typefilefile;
                    default:
                        return typeVal;
                }
            },

            // функция сортировки
            sortItems(items) {
                if (!items.length) return items;
                
                // Создаем копию для избежания мутаций
                const itemsCopy = [...items];
                const sortKey = this.contentSortKey;
                const sortMode = this.contentSortMode;
                const multiplier = sortMode === 'asc' ? 1 : -1;
                
                return itemsCopy.sort((a, b) => {
                    // Папки всегда сверху (кроме сортировки по имени)
                    if (sortKey !== 'name') {
                        if (a.type === 'folder' && b.type !== 'folder') return -1;
                        if (a.type !== 'folder' && b.type === 'folder') return 1;
                    }
                    
                    let aVal = this.getSortValue(a, sortKey);
                    let bVal = this.getSortValue(b, sortKey);
                    
                    // Естественная сортировка для строк
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return this.naturalCompare(aVal, bVal) * multiplier;
                    }
                    
                    // Числовое сравнение
                    if (aVal < bVal) return -1 * multiplier;
                    if (aVal > bVal) return 1 * multiplier;
                    return 0;
                });
            },

            getSortValue(item, key) {
                if (key === 'createdAt' || key === 'updatedAt') return item[key] ? new Date(item[key]).getTime() : 0;                
                if (key === 'name') return item.name?.toLowerCase() || '';                
                if (key === 'size') return item.type === 'folder' ? -1 : (item.size || 0);
                
                return item[key] || '';
            },
            
            naturalCompare(a, b) {
                // Поддержка чисел в строках (file1, file2, file10)
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            },

            // Переключение направления сортировки
            toggleSortMode() { this.contentSortMode = this.contentSortMode === 'asc' ? 'desc' : 'asc'; },

            // Применение сортировки (вызывается при изменении ключа)
            applySorting() {
                // computed свойство filteredContents обновится автоматически
                // Этот метод можно использовать для дополнительной логики
                console.log(`Sorting by ${this.contentSortKey} in ${this.contentSortMode} order`);
            },

            // кнопка "вернуться на предыдущую папку"
            ToBackFolder() {
                if (this.currentPath && this.currentPath.length > 1) {
                    const targetPathElem = this.currentPath[this.currentPath.length - 2];
                    
                    this.navigateTo(targetPathElem);
                }                
            },

            // открыть форму переименования файла/папки
            async OpenForm_renameItem(inpVal) {
                console.log('inpVal', inpVal);
                this.operFormRename = true;
                this.renameTarget = inpVal;
                this.renameTarget_newName = inpVal.name;                
            },
            CloseForm_renameItem() {
                this.operFormRename = false;
                this.renameTarget_newName = '';
            },

            // переименовать файл
            async renameItem() {
                if (!this.USERID) throw new Error('User ID required');
                if (!this.renameTarget) throw new Error('Rename target required');
                if (!this.renameTarget_newName) throw new Error('Rename target (new name) required');

                try {
                    if (this.renameTarget && this.renameTarget.id && this.renameTarget_newName && this.renameTarget_newName !== '') {
                        await dFiles.rename(this.USERID, this.renameTarget.id, this.renameTarget_newName);
                        await this.loadFolderContents(this.currentFolder.id);
                        // обновляем дерево базовых папок
                        await this.buildFolderTree();

                        this.CloseForm_renameItem();
                    }                    
                } catch (error) {
                    this.showError('Operation (renameItem) error:', error);
                }                
            },

            // удалить файл
            async deleteItem(inpVal) {
                if (confirm(`Удалить ${inpVal.name}?`)) {
                    try {
                        await dFiles.delete(this.USERID, inpVal.id, true);
                        await this.navigateTo(this.currentFolder);
                        await this.buildFolderTree();
                    } catch (error) {
                        this.showError('Ошибка при удалении');
                    }
                }               
            },

            // // копировать файл
            // copyItem(inpVal) {},

            // // вырезать файл
            // cutItem(inpVal) {},

            scrollToEnd() {
                const breadcrumbUl = this.$refs.breadcrumbList;
      
                if (breadcrumbUl) {
                    // Мягкая прокрутка с анимацией
                    breadcrumbUl.scrollTo({
                        left: breadcrumbUl.scrollWidth,
                        behavior: 'smooth' // Плавная прокрутка
                    });
                }
            },
            
            // Очистка перед уничтожением компонента
            beforeDestroy() {
                // Очищаем все ObjectURL
                this.objectUrls.forEach((url) => {
                    URL.revokeObjectURL(url);
                });
                this.objectUrls.clear();
            }
        },

        async mounted() {
            console.log(`OSIDirDigger mounted with windowId:`, this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            this.$nextTick(() => {
                this.scrollToEnd();
            });

            // Сохраняем ссылку на fileInput
            this.fileInput = this.$refs.fileInput;
            
            await this.loadRootFolder();
        },
    }
</script>