<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable, dFiles } from '@/idb/db';
    import { LangPack } from './lang';
    
    export default {
        name: "OSIJustRead",

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0},
            fileData: { type: Object, default: null },
            fileId: { type: [String, Number], default: null },
            fileName: { type: String, default: '' },
            fileType: { type: String, default: '' },
        },

        emits: ['startapp', 'error', 'notification'],

        data() {
            return {
                LangData: {},
                isInitialized: false,
                isLoading: false,
                pendingFileId: null,
                pendingFileData: null,
                lastExternalFileId: null,
                files: [],
                currentIndex: -1,
                saveTimeout: null,

                aboutVisible: false,
            }
        },

        watch: {
            fileId: {
                async handler(newId) {
                    if (!newId) return;
                    if (!this.isInitialized) {
                        this.pendingFileId = newId;
                        return;
                    }

                    try {
                        const normalizedId = String(newId);
                        if (this.lastExternalFileId === normalizedId) return;
                        this.lastExternalFileId = normalizedId;

                        const fileData = await dFiles.getInfo(newId);
                        if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
                    } catch (error) {
                        console.error('Loading file error:', error);
                    }
                },
                immediate: true,
            },

            fileData: {
                async handler(newVal) {
                    if (!newVal) return;
                    if (!this.isInitialized) {
                        this.pendingFileData = newVal;
                        return;
                    }

                    if (newVal?.id !== undefined && newVal?.id !== null) {
                        const normalizedId = String(newVal.id);
                        if (this.lastExternalFileId === normalizedId) return;
                        this.lastExternalFileId = normalizedId;
                    }

                    await this.loadFileFromData(newVal, { replaceList: true });
                },
                immediate: true,
                deep: false,
            },

            files: {
                handler() {
                    if (this.isInitialized) this.throttledSaveState();
                },
                deep: true,
            },

            currentIndex() {
                if (this.isInitialized) this.throttledSaveState();
            },
        },

        computed: {
            currentFile() {
                return this.files[this.currentIndex] || null;                
            },

            currentFileType() {
                return this.currentFile?.mimetype ?? null;
            },

            currentFileSize() {
                const bytes = this.currentFile?.size;
                if (bytes == null) return '—';
                if (bytes === 0) return '0 Б';

                const k = 1024;
                const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
            },

            TargetTitle() {
                return this.currentFile?.name || 'Заголовок';
            },

            fileContent() {
                return this.currentFile?.content ?? '';
            },
        },

        methods: {
            showError(message) {
                alert(message);
                console.error(message);
            },

            isTextLike(fileName, mimeType = '') {
                const textExt = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'csv', 'log'];
                const ext = fileName.split('.').pop()?.toLowerCase();

                if (mimeType.startsWith('text/')) return true;
                if (['application/json', 'application/xml', 'application/javascript'].includes(mimeType)) return true;
                if (ext && textExt.includes(ext)) return true;

                return false;
            },

            isSameFile(a, b) {
                if (a.id != null && b.id != null && String(a.id) === String(b.id)) {
                    return true;
                }

                if (a.name !== b.name || a.size !== b.size) {
                    return false;
                }

                if (a.id != null || b.id != null) {
                    return false;
                }

                return a.lastModified === b.lastModified;
            },

            isDuplicateInList(candidate) {
                return this.files.some(existing => this.isSameFile(existing, candidate));
            },

            // Инициализация из IDB
            async initFromIDB() {
                if (!this.windowId) {
                    console.error('OSIJustRead: windowId is missing');
                    return;
                }

                const savedState = await usersTable.windstates.getById(this.USERID, this.windowId);
                console.log('savedState', savedState);

                if (savedState) {
                    this.files = await this.restoreFilesFromState(savedState.files || []);

                    if (this.files.length > 0) {
                        const idx = savedState.currentIndex;
                        this.currentIndex = (idx !== undefined && idx >= 0 && idx < this.files.length) ? idx : 0;
                    } else {
                        this.currentIndex = -1;
                    }
                }

                this.isInitialized = true;
                console.log('OSIJustRead initialized');

                // Если окно было открыто "Открыть с помощью..." — догружаем файл после инициализации
                try {
                    if (this.pendingFileId) {
                        const fileData = await dFiles.getInfo(this.pendingFileId);
                        this.pendingFileId = null;
                        if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
                    } else if (this.pendingFileData) {
                        const fileData = this.pendingFileData;
                        this.pendingFileData = null;
                        await this.loadFileFromData(fileData, { replaceList: true });
                    } else if (this.fileData && this.files.length === 0) {
                        await this.loadFileFromData(this.fileData, { replaceList: true });
                    }
                } catch (error) {
                    console.error('Failed to load initial file:', error);
                }
            },

            openFilePicker() { 
                this.$refs.fileInput.click(); 
            },

            selectFile(nFile) {
                const index = this.files.findIndex(f => this.isSameFile(f, nFile));
                if (index !== -1) {
                    this.currentIndex = index;
                }
            },

            async handleFileSelect(event) {
                const selectedFiles = Array.from(event.target.files || []);
                if (!selectedFiles.length) return;

                for (const file of selectedFiles) {
                    await this.loadFileFromData(file, { replaceList: false });
                }

                if (this.files.length > 0) {
                    this.currentIndex = 0;
                }

                event.target.value = '';
            },

            // Загрузка файла из переданных данных
            async loadFileFromData(fileData, options = {}) {
                if (!fileData) {
                    console.error('[FUNC ERR] loadFileFromData:: fileData пустой');
                    this.showError('Нет данных файла');
                    return;
                }

                try {
                    this.isLoading = true;

                    let textFile = null;
                    let textBlob = null;
                    let fileName = this.fileName || 'document.txt';
                    let mimeType = this.fileType || 'text/plain';
                    let fileId = null;
                    let parentid = null;
                    let dfileType = 'text';
                    let source = 'upload';

                    // Вариант 1: fileData это сам файл (File или Blob)
                    if (fileData instanceof File || fileData instanceof Blob) {
                        textBlob = fileData;
                        if (fileData instanceof File) textFile = fileData;
                        fileName = fileData.name || fileName;
                        mimeType = fileData.type || mimeType;
                    }
                    // Вариант 2: fileData содержит blob (из DFile)
                    else if (fileData.blob || fileData.data) {
                        const blobLike = fileData.blob || fileData.data;
                        fileName = fileData.name || fileName;
                        mimeType = fileData.mimetype
                            || (typeof fileData.type === 'string' && fileData.type.includes('/') ? fileData.type : null)
                            || mimeType;
                        fileId = fileData.id ?? null;
                        parentid = fileData.parentid ?? null;
                        dfileType = fileData.type || dfileType;
                        source = fileId ? 'idb' : 'upload';

                        if (blobLike instanceof Blob || blobLike instanceof File) {
                            textBlob = blobLike;
                            if (blobLike instanceof File) textFile = blobLike;
                        } else {
                            textBlob = new Blob([blobLike], { type: mimeType });
                        }
                    }
                    // Вариант 3: есть только id (например, при запуске из DirDigger)
                    else if (fileData?.id) {
                        const idbFile = await dFiles.getInfo(fileData.id);
                        return await this.loadFileFromData(idbFile, options);
                    }

                    if (!textBlob) {
                        this.showError('Не удалось получить данные файла');
                        return;
                    }

                    const lastModified = textFile?.lastModified || Date.now();

                    if (!options.replaceList && this.isDuplicateInList({
                        id: fileId,
                        name: fileName,
                        size: textBlob.size,
                        lastModified,
                    })) {
                        console.warn('OSIJustRead: пропуск дубликата:', fileName);
                        return;
                    }

                    if (!this.isTextLike(fileName, mimeType)) {
                        console.warn('OSIJustRead: файл может не быть текстовым:', fileName, mimeType);
                    }

                    const content = await textBlob.text();

                    const fileEntry = {
                        id: fileId,
                        name: fileName,
                        mimetype: mimeType,
                        dfileType,
                        size: textBlob.size,
                        content,
                        source,
                        parentid,
                        file: textFile,
                        lastModified,
                    };

                    if (options.replaceList) {
                        this.files = [fileEntry];
                        this.currentIndex = 0;
                    } else {
                        this.files.push(fileEntry);
                        this.currentIndex = this.files.length - 1;
                    }

                    this.throttledSaveState();

                } catch (error) {
                    console.error('[FUNC ERR] loadFileFromData:: Critical Error upload file:', error);
                    this.showError(`Ошибка загрузки файла: ${error.message}`);
                } finally {
                    this.isLoading = false;
                }
            },

            serializeFilesForState() {
                return this.files.map((entry) => {
                    const rest = { ...entry };
                    delete rest.file;

                    return {
                        ...rest,
                        content: typeof rest.content === 'string' ? rest.content : '',
                    };
                });
            },

            async restoreFilesFromState(restoredFiles = []) {
                const files = [];

                for (const entry of restoredFiles) {
                    const rest = { ...entry };
                    delete rest.file;
                    let content = typeof rest.content === 'string' ? rest.content : '';

                    if (!content && rest.id) {
                        try {
                            const idbFile = await dFiles.getInfo(rest.id);
                            const blob = idbFile?.blob;

                            if (blob instanceof Blob || blob instanceof File) {
                                content = await blob.text();
                            }
                        } catch (error) {
                            console.warn('OSIJustRead: не удалось догрузить контент:', rest.name, error);
                        }
                    }

                    files.push({ ...rest, content });
                }

                return files;
            },

            throttledSaveState() {
                if (this.saveTimeout) clearTimeout(this.saveTimeout);

                this.saveTimeout = setTimeout(() => {
                    this.saveState();
                    this.saveTimeout = null;
                }, 2000);
            },

            async saveState() {
                if (!this.windowId || !this.isInitialized) return;

                const state = {
                    appType: 'justread',
                    files: this.serializeFilesForState(),
                    currentIndex: this.currentIndex,
                    timestamp: Date.now(),
                };

                await usersTable.windstates.updateVal(this.USERID, this.windowId, state);
            },
        },

        async mounted() {
            this.$nextTick(() => {
                this.initFromIDB();
            });

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            setTimeout(() => {
                if (!this.isInitialized) this.initFromIDB();

                this.saveState();
            }, 100);
        },

        beforeUnmount() {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);

            if (this.isInitialized) this.saveState();
        },
    }
</script>