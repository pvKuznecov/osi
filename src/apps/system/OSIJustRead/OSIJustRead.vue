<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable, dFiles } from '@/idb/db';
    import { LangPack } from './lang';

    const FONT_SIZE_MIN = 8;
    const FONT_SIZE_MAX = 32;
    const FONT_SIZE_DEFAULT = 14;
    
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
                fontSize: FONT_SIZE_DEFAULT,
                fontSizeMin: FONT_SIZE_MIN,
                fontSizeMax: FONT_SIZE_MAX,

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
                        const existingIndex = this.files.findIndex(
                            f => f.id != null && String(f.id) === normalizedId
                        );

                        if (existingIndex !== -1) {
                            this.currentIndex = existingIndex;
                            this.lastExternalFileId = normalizedId;
                            return;
                        }

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
                        const existingIndex = this.files.findIndex(
                            f => f.id != null && String(f.id) === normalizedId
                        );

                        if (existingIndex !== -1) {
                            this.currentIndex = existingIndex;
                            this.lastExternalFileId = normalizedId;
                            return;
                        }

                        if (this.lastExternalFileId === normalizedId) return;
                        this.lastExternalFileId = normalizedId;

                        const fileData = await dFiles.getInfo(newVal.id);
                        if (fileData) {
                            await this.loadFileFromData(fileData, { replaceList: true });
                        }
                        return;
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

            fontSize() {
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
                const sizes = this.LangData.sizeUnits || ['B', 'KB', 'MB', 'GB'];

                if (bytes == null) return '—';
                if (bytes === 0) return `0 ${sizes[0]}`;

                const k = 1024;
                const i = Math.floor(Math.log(bytes) / Math.log(k));

                return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
            },

            TargetTitle() {
                return this.currentFile?.name || 'Заголовок';
            },

            fileContent() {
                return this.currentFile?.content ?? '';
            },

            contentFontStyle() {
                return { fontSize: `${this.fontSize}px` };
            },

            isTextViewable() {
                if (!this.currentFile) return false;

                return this.isTextLike(this.currentFile.name, this.currentFile.mimetype || '');
            },
        },

        methods: {
            clampFontSize(size) {
                const value = Number(size);

                if (Number.isNaN(value)) {
                    return FONT_SIZE_DEFAULT;
                }

                return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)));
            },

            Chng_fontSize(val) {
                if (val === '-' && this.fontSize > FONT_SIZE_MIN) {
                    this.fontSize -= 1;
                } else if (val === '+' && this.fontSize < FONT_SIZE_MAX) {
                    this.fontSize += 1;
                }
            },

            handleFontSizeInput(event) {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 2);

                if (!digits) {
                    event.target.value = '';
                    return;
                }

                let size = parseInt(digits, 10);

                if (size > FONT_SIZE_MAX) {
                    size = FONT_SIZE_MAX;
                }

                this.fontSize = size;
                event.target.value = String(size);
            },

            onFontSizeKeydown(event) {
                const serviceKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];

                if (serviceKeys.includes(event.key)) {
                    return;
                }

                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.normalizeFontSize(event);
                    event.target.blur();
                    return;
                }

                if (!/^\d$/.test(event.key)) {
                    event.preventDefault();
                }
            },

            normalizeFontSize(event) {
                const input = event?.target;
                const raw = input ? input.value : String(this.fontSize);
                const digits = raw.replace(/\D/g, '');

                if (!digits) {
                    this.fontSize = FONT_SIZE_DEFAULT;
                    if (input) input.value = String(FONT_SIZE_DEFAULT);
                    return;
                }

                const size = this.clampFontSize(parseInt(digits, 10));
                this.fontSize = size;

                if (input) {
                    input.value = String(size);
                }
            },

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

            resolveMimeType(fileName, fileData = {}) {
                if (fileData.mimetype && String(fileData.mimetype).includes('/')) {
                    return fileData.mimetype;
                }

                if (typeof fileData.type === 'string' && fileData.type.includes('/')) {
                    return fileData.type;
                }

                const propType = this.fileType || '';
                if (propType.includes('/')) {
                    return propType;
                }

                const ext = fileName.split('.').pop()?.toLowerCase();
                const byExt = {
                    txt: 'text/plain',
                    md: 'text/markdown',
                    json: 'application/json',
                    xml: 'application/xml',
                    html: 'text/html',
                    htm: 'text/html',
                    css: 'text/css',
                    js: 'application/javascript',
                    csv: 'text/csv',
                    log: 'text/plain',
                };

                if (ext && byExt[ext]) {
                    return byExt[ext];
                }

                if (this.isTextLike(fileName, '')) {
                    return 'text/plain';
                }

                return 'application/octet-stream';
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

                    if (savedState.fontSize !== undefined) {
                        this.fontSize = this.clampFontSize(savedState.fontSize);
                    }
                }

                this.isInitialized = true;
                console.log('OSIJustRead initialized');

                // Если окно было открыто "Открыть с помощью..." — догружаем файл после инициализации
                try {
                    if (this.pendingFileId) {
                        const normalizedId = String(this.pendingFileId);
                        const fileData = await dFiles.getInfo(this.pendingFileId);
                        this.pendingFileId = null;
                        this.lastExternalFileId = normalizedId;
                        if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
                    } else if (this.pendingFileData) {
                        const pending = this.pendingFileData;
                        this.pendingFileData = null;

                        if (pending?.id != null) {
                            const normalizedId = String(pending.id);
                            this.lastExternalFileId = normalizedId;
                            const fileData = await dFiles.getInfo(pending.id);
                            if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
                        } else {
                            await this.loadFileFromData(pending, { replaceList: true });
                        }
                    } else if (this.fileData && this.files.length === 0) {
                        if (this.fileData?.id != null) {
                            const normalizedId = String(this.fileData.id);
                            this.lastExternalFileId = normalizedId;
                            const fileData = await dFiles.getInfo(this.fileData.id);
                            if (fileData) await this.loadFileFromData(fileData, { replaceList: true });
                        } else {
                            await this.loadFileFromData(this.fileData, { replaceList: true });
                        }
                    }

                    if (this.files.length > 0 && (this.currentIndex < 0 || this.currentIndex >= this.files.length)) {
                        this.currentIndex = 0;
                    }
                } catch (error) {
                    console.error('Failed to load initial file:', error);
                }
            },

            openFilePicker() { 
                this.$refs.fileInput.click(); 
            },

            selectFile(index) {
                if (index >= 0 && index < this.files.length) {
                    this.currentIndex = index;
                }
            },

            async handleFileSelect(event) {
                const selectedFiles = Array.from(event.target.files || []);
                if (!selectedFiles.length) return;

                const startIndex = this.files.length;

                for (const file of selectedFiles) {
                    await this.loadFileFromData(file, { replaceList: false });
                }

                // Активным — первый из только что добавленных (если что-то добавилось)
                if (this.files.length > startIndex) {
                    this.currentIndex = startIndex;
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
                    let mimeType = 'text/plain';
                    let fileId = null;
                    let parentid = null;
                    let dfileType = 'text';
                    let source = 'upload';

                    // Вариант 1: fileData это сам файл (File или Blob)
                    if (fileData instanceof File || fileData instanceof Blob) {
                        textBlob = fileData;
                        if (fileData instanceof File) textFile = fileData;
                        fileName = fileData.name || fileName;
                        mimeType = fileData.type || this.resolveMimeType(fileName, fileData);
                    }
                    // Вариант 2: есть id, но нет пригодного blob — грузим из IDB
                    else if (
                        fileData?.id
                        && !(fileData.blob instanceof Blob)
                        && !(fileData.blob instanceof File)
                        && !(fileData.data instanceof Blob)
                        && !(fileData.data instanceof File)
                    ) {
                        const idbFile = await dFiles.getInfo(fileData.id);
                        return await this.loadFileFromData(idbFile, options);
                    }
                    // Вариант 3: fileData содержит blob (из DFile)
                    else if (fileData.blob instanceof Blob || fileData.blob instanceof File) {
                        textBlob = fileData.blob;
                        if (fileData.blob instanceof File) textFile = fileData.blob;
                        fileName = fileData.name || fileName;
                        mimeType = this.resolveMimeType(fileName, fileData);
                        fileId = fileData.id ?? null;
                        parentid = fileData.parentid ?? null;
                        dfileType = fileData.type || dfileType;
                        source = fileId ? 'idb' : 'upload';
                    }
                    // Вариант 4: есть только id
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

                    files.push({
                        ...rest,
                        content,
                        mimetype: this.resolveMimeType(rest.name || 'document.txt', rest),
                    });
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
                    fontSize: this.fontSize,
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