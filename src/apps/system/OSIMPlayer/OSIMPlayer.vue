<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable, dFiles } from '@/idb/db';
    import { LangPack } from './lang';
    import { parseBlob } from 'music-metadata';
    import debounce from 'lodash/debounce';

    export default {
        name: 'OSIMPlayer',

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0},
            // параметры для запуска воспроизведения файла "со стороны"
            fileData: { type: Object, default: null },
            fileId: { type: [String, Number], default: null },
            fileName: { type: String, default: '' },
            fileType: { type: String, default: '' }
        },

        data() {
            return {
                lang_data: {},
                audioElement: null, // Аудио0элемент, отвечающий за воспроизведение
                PlayList: [],
                isPlaying: false,
                durationAll: 0,
                TargetTrack: null,
                ShowConfig: {
                    playlist: {
                        artist: true,
                        album: true,
                        duration: true,
                    }
                },
                isLoading: false,
                totalFiles: 0,
                MAX_FILE_SIZE: 100 * 1024 * 1024,       // 100MB,
                MAX_PLAYLIST_SIZE: 1000 * 1024 * 1024,  // 1000MB,
                curFilesSize: 0,
                audioDurations: {},                     // Объект для "длительностей"
                VolumeLvl: 0.5,
                VolumeLvl_save: 0.5,
                currentIndex: 0,
                urlsData: new Map(),
                TrackTime: { current: 0, duration: 0},
                SilentMode: false,
                ShuffleMode: false,
                currentCoverUrl: null,
                prevCoverUrl: null,
                CoverMode: true,
                IsValidPlayList: false,
                isInitialized: false,
                trackSelector: [],
                pendingFileData: null,
            }
        },
        
        computed: {
            currentTrack() {
                const curindex = this.currentIndex + '';
                const preplist = this.PlayList;

                if (preplist && preplist.length > 0 && curindex) {
                    let tr = preplist[curindex];
                    return tr;
                } else {
                    return null;
                }
            },

            currentTrack_time() {
                return this.ShowerTime(this.TrackTime.current);
            },
        },

        watch: {
            currentTrack: {
                handler() {
                    this.updateCoverUrl();
                },
                immediate: true
            },

            fileId: {
                async handler(newId) {
                    if (newId && this.isInitialized) {
                        try {
                            const fileData = await dFiles.getInfo(newId);
                            if (fileData) await this.loadFileFromData(fileData);
                        } catch (error) {
                            console.error('Loading file Error:', error);
                        }
                    }
                },
                immediate: true
            },

            fileData: {
                handler(newVal) {                    
                    if (newVal && this.isInitialized) {
                        this.loadFileFromData(newVal);
                    } else if (newVal && !this.isInitialized) {
                        this.pendingFileData = newVal;  // Компонент еще не инициализирован, сохраняем fileData для загрузки позже
                    }
                },
                immediate: true,
                deep: true
            },

            PlayList: {
                handler(newVal) {
                    console.log('PlayList are chenged', {length: newVal.length, firstTrack: newVal[0]?.common?.title});
                },
                deep: true,
                immediate: true
            },

            // при изменении любого из следующих параметров (при пройденой инициализации) - вызываем фун-ю сохранения состояния
            VolumeLvl() { if (this.isInitialized) { this.saveState(); } },      //уровень громкости
            SilentMode() { if (this.isInitialized) { this.saveState(); } },     //режим без звука
            ShuffleMode() { if (this.isInitialized) { this.saveState(); } },    //режим случайного воспроизведения
        },

        methods: {
            LangData(key) { return this.lang_data[key] || ''; },
            
            // инициализация аудио
            initAudio() {
                if (this.audioElement) {
                    // Удаляем старые обработчики перед очисткой
                    this.audioElement.removeEventListener('ended', this._onEnded);
                    this.audioElement.removeEventListener('timeupdate', this._onTimeUpdate);
                    this.audioElement.removeEventListener('error', this._onError);
                    
                    this.audioElement.pause();
                    this.audioElement.src = '';
                    this.audioElement.load();
                    this.audioElement = null;
                }
                
                // Создаем новый аудио элемент
                this.audioElement = new Audio();
                this.audioElement.crossOrigin = 'anonymous';
                
                // Сохраняем обработчики как методы класса для возможности удаления
                this._onEnded = () => {
                    this.PlayerAction_NextTrack();
                };
                
                this._onTimeUpdate = (event) => {
                    this.onTimeUpdate(event);
                };
                
                this._onError = () => {
                    // Проверяем, что audioElement существует
                    if (this.audioElement) {
                        console.error('[FUNC ERR] initAudio:: Audio Element Error:', this.audioElement.error);
                        console.error('code:', this.audioElement.error?.code);
                        console.error('message:', this.audioElement.error?.message);
                    } else {
                        console.warn('Audio Element are DESTROYED!');
                    }
                };
                
                // Добавляем обработчики
                this.audioElement.addEventListener('ended', this._onEnded);
                this.audioElement.addEventListener('timeupdate', this._onTimeUpdate);
                this.audioElement.addEventListener('error', this._onError);
            },
            
            async initFromIDB() {
                console.log('[START FUNC]:: initFromIDB');
                if (!this.windowId) {
                    console.error('OSIMPlayer: windowId is missing');
                    return;
                }

                const savedState = await usersTable.windstates.getById(this.USERID, this.windowId);

                if (savedState) {
                    this.durationAll = savedState.durationAll || 0;
                    this.ShowConfig = savedState.ShowConfig || { playlist: { artist: true, album: true, genre: true, duration: true } };
                    this.totalFiles = savedState.totalFiles || 0;
                    this.curFilesSize = savedState.curFilesSize || 0;
                    this.audioDurations = savedState.audioDurations || {};
                    this.VolumeLvl = savedState.VolumeLvl || 0.5;
                    this.VolumeLvl_save = savedState.VolumeLvl_save || 0.5;
                    this.SilentMode = savedState.SilentMode || false;
                    this.ShuffleMode = savedState.ShuffleMode || false;
                    // ВОССТАНАВЛИВАЕМ PlayList из сохранения
                    if (savedState.PlayList && savedState.PlayList.length > 0) {
                        this.PlayList = savedState.PlayList;
                        this.IsValidPlayList = true;
                        this.currentIndex = 0;
                    }
                }
                
                this.isInitialized = true;
                console.log('++OSIMPlayer initialized');
                
                // если есть pendingFileData - загружаем его
                if (this.pendingFileData) {
                    console.log('Loading from pendingFileData:', this.pendingFileData.name);
                    
                    await this.loadFileFromData(this.pendingFileData);
                    this.pendingFileData = null;
                }
                
                // если есть fileData + плейлист пуст - загружаем (на случай если pendingFileData не сработал)
                if (this.fileData && this.PlayList.length === 0) {
                    console.log('Loading fileData after initialization:', this.fileData.name);
                    
                    await this.loadFileFromData(this.fileData);
                }
            },

            // Сохраняем текущее состояние
            async saveState() {
                console.log('[START FUNC]:: saveState');
                if (!this.windowId || !this.isInitialized) return;
                
                const playlistMetadata = this.PlayList.map(track => ({
                    name: track.name,
                    size: track.size,
                    type: track.type,
                    lastModified: track.lastModified,
                    webkitRelativePath: track.webkitRelativePath,
                    common: {
                        album: track.common?.album || null,
                        artist: track.common?.artist || null,
                        id: track.common?.id || null,
                        title: track.common?.title || null,
                        duration: track.common?.duration || null,
                    }
                }));
                
                const state = {
                    appType: 'mplayer',
                    durationAll: this.durationAll,
                    ShowConfig: this.ShowConfig,
                    totalFiles: this.totalFiles,
                    curFilesSize: this.curFilesSize,
                    audioDurations: this.audioDurations,
                    VolumeLvl: this.VolumeLvl,
                    VolumeLvl_save: this.VolumeLvl_save,
                    SilentMode: this.SilentMode,
                    ShuffleMode: this.ShuffleMode,
                    PlayList: playlistMetadata,
                    timestamp: Date.now()
                };

                await usersTable.windstates.updateVal(this.USERID, this.windowId, state);
            },

            // Сброс input (открывает возможность повторно загружать те-же файлы)
            resetInput(inputElement) { inputElement.value = ''; },

            showError(message) {
                alert(message);
                console.error(message);
            },

            // Загрузка файла из переданных данных
            async loadFileFromData(fileData) {                
                if (!fileData) {
                    console.error('[FUNC ERR] loadFileFromData:: fileData пустой');
                    this.showError('Нет данных файла');
                    return;
                }
                
                try {
                    this.isLoading = true;
                    
                    // Пытаемся извлечь файл из разных структур
                    let audioFile = null;
                    let audioBlob = null;
                    
                    // Вариант 1: fileData это сам файл (File или Blob)
                    if (fileData instanceof File || fileData instanceof Blob) {
                        audioFile = fileData;
                        audioBlob = fileData;
                    }
                    // Вариант 2: fileData содержит blob (из DFile)
                    else if (fileData.blob) {
                        const fileName = fileData.name || 'audio.mp3';
                        const fileType = fileData.type || 'audio/mpeg';
                        
                        if (fileData.blob instanceof Blob || fileData.blob instanceof File) {
                            audioBlob = fileData.blob;
                            audioFile = new File([audioBlob], fileName, { type: fileType });
                        } else {
                            audioBlob = new Blob([fileData.blob], { type: fileType });
                            audioFile = new File([audioBlob], fileName, { type: fileType });
                        }
                    }
                    // Вариант 3: fileData содержит data (старый формат)
                    else if (fileData.data) {
                        const fileName = fileData.name || 'audio.mp3';
                        const fileType = fileData.type || 'audio/mpeg';
                        
                        if (fileData.data instanceof Blob || fileData.data instanceof File) {
                            audioBlob = fileData.data;
                            audioFile = new File([audioBlob], fileName, { type: fileType });
                        } else {
                            audioBlob = new Blob([fileData.data], { type: fileType });
                            audioFile = new File([audioBlob], fileName, { type: fileType });
                        }
                    }
                    // Вариант 4: fileData похож на File
                    else if (fileData.name && typeof fileData.size === 'number') {
                        if (fileData.blob) {
                            audioBlob = fileData.blob instanceof Blob ? fileData.blob : new Blob([fileData.blob]);
                            audioFile = new File([audioBlob], fileData.name, { type: fileData.type || 'audio/mpeg' });
                        } else {
                            throw new Error('[FUNC ERR] loadFileFromData:: No data (blob) to create file');
                        }
                    }
                    
                    // Проверяем, удалось ли создать аудиофайл
                    if (!audioFile || !audioBlob) {
                        console.error('[FUNC ERR] loadFileFromData:: Failed to create audio file');
                        this.showError('Не удалось извлечь аудиоданные из файла');
                        this.isLoading = false;
                        return;
                    }
                    
                    // Проверяем, что файл - аудио
                    const isAudioFile = this.isAudio(audioFile);
                    
                    if (!isAudioFile) console.warn('[FUNC WARN] loadFileFromData:: Файл не прошел проверку isAudio, выполняется попытка загрузить.');
                    
                    // Получаем метаданные
                    let parseData = null;
                    try {
                        const sampleSize = Math.min(audioBlob.size || 1024*1024, 1024*1024);
                        const sampleBlob = audioBlob.slice(0, sampleSize);
                        parseData = await parseBlob(sampleBlob);
                    } catch (error) {
                        console.warn('[FUNC WARN] loadFileFromData:: Не удалось получить метаданные:', error.message);
                    }
                    
                    // Создаем трек
                    const trackId = `${audioFile.name || 'track'}-${Date.now()}`;
                    const track = {
                        name: audioFile.name || 'Неизвестный трек',
                        size: audioFile.size || 0,
                        type: audioFile.type || 'audio/mpeg',
                        common: {
                            ...parseData?.common || {},
                            id: trackId,
                            title: parseData?.common?.title || audioFile.name || 'Неизвестный трек',
                            artist: parseData?.common?.artist || 'Неизвестный исполнитель',
                            album: parseData?.common?.album || 'Неизвестный альбом',
                            duration: parseData?.format?.duration || 0,
                        }
                    };
                    
                    // Получаем длительность через Audio API
                    if (!track.common.duration || track.common.duration === 0) {
                        try {
                            const tempUrl = URL.createObjectURL(audioFile);
                            const duration = await this.getAudioDurationFromUrl(tempUrl);
                            
                            track.common.duration = duration;
                            URL.revokeObjectURL(tempUrl);
                        } catch (error) {
                            console.warn('[FUNC WARN] loadFileFromData:: Не удалось получить длительность через Audio API:', error.message);
                            track.common.duration = 0;
                        }
                    }
                    
                    // СОЗДАЕМ URL ДЛЯ ВОСПРОИЗВЕДЕНИЯ
                    let url;
                    try {
                        url = URL.createObjectURL(audioFile);
                    } catch (error) {
                        console.error('[FUNC ERR] loadFileFromData:: Error creating URL::', error);
                        
                        try {
                            url = URL.createObjectURL(audioBlob);
                            console.log('[FUNC] loadFileFromData:: URL creating from audioBlob:', url);
                        } catch (error2) {
                            console.error('[FUNC ERR] loadFileFromData:: Error creating URL from audioBlob:', error2);
                            this.showError('Failed to create URL for file');
                            this.isLoading = false;
                            return;
                        }
                    }
                    
                    track.common.url = url;
                    this.urlsData.set(track.common.id, url);
                    console.log('Будет добавлен track:', track);

                    // Обновляем плейлист
                    this.PlayList = [track];
                    this.IsValidPlayList = true;
                    this.currentIndex = 0;
                    this.durationAll = track.common.duration || 0;
                    this.totalFiles = 1;
                    this.curFilesSize = audioFile.size || 0;
                    this.audioDurations[track.common.id] = track.common.duration;

                    console.group('[FUNC] loadFileFromData:: Result:');
                    console.log('Playlist updated, tracks:', this.PlayList.length, this.PlayList);
                    console.log('Track uploaded:', track.common.title);
                    console.log('Current Track:', this.currentTrack);
                    console.groupEnd('');

                    // // ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ UI
                    // this.$forceUpdate();

                    // Автоматически начинаем воспроизведение
                    this.$nextTick(() => {
                        const AudioElement = this.audioElement;

                        if (AudioElement) {
                            AudioElement.load();
                            this.PlayerAction_Play();
                        } else {
                            console.warn('[FUNC WARN] loadFileFromData:: Audio Element not found');
                        }
                    });
                    
                    // Сохраняем состояние
                    setTimeout(() => {
                        this.saveState();
                    }, 300);
                    
                } catch (error) {
                    console.error('[FUNC ERR] loadFileFromData:: Critical Error upload file:', error);
                    this.showError(`Ошибка загрузки файла: ${error.message}`);
                } finally {
                    this.isLoading = false;
                }
            },

            // Новый метод для получения длительности через Audio API
            getAudioDurationFromUrl(url) {
                return new Promise((resolve, reject) => {
                    const audio = new Audio();
                    let resolved = false;
                    
                    const cleanup = () => {
                        audio.removeEventListener('loadedmetadata', onLoaded);
                        audio.removeEventListener('error', onError);
                        audio.src = '';
                        audio.load();
                    };
                    
                    const onLoaded = () => {
                        if (!resolved) {
                            resolved = true;
                            const duration = audio.duration;

                            cleanup();
                            resolve(duration);
                        }
                    };
                    
                    const onError = (e) => {
                        if (!resolved) {
                            resolved = true;

                            cleanup();
                            reject(new Error('Failed to load audio: ' + (e.target?.error?.message || 'unknown error')));
                        }
                    };
                    
                    audio.addEventListener('loadedmetadata', onLoaded);
                    audio.addEventListener('error', onError);
                    
                    // Таймаут
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;

                            cleanup();
                            reject(new Error('Timeout loading audio metadata'));
                        }
                    }, 5000);
                    
                    audio.src = url;
                    audio.load();
                });
            },

            getAudioDurationSimple(track) {
                return new Promise((resolve, reject) => {
                    const audio = new Audio();
                    const objectURL = URL.createObjectURL(track);

                    audio.src = objectURL;

                    const mkClean = () => {
                        audio.removeEventListener('loadedmetadata', onLoaded);
                        audio.removeEventListener('error', onError);
                        URL.revokeObjectURL(objectURL); // Освобождаем ссылку в памяти "URL" - сразу
                    };

                    const onLoaded = () => {
                        mkClean();
                        resolve(audio.duration);
                    };

                    // чистим ссылки, возвращаем ошибку
                    const onError = (e) => {
                        mkClean();
                        reject(e);
                    };
                    
                    audio.addEventListener('loadedmetadata', onLoaded); //подписка на событие "загрузка мета-данных"
                    audio.addEventListener('error', onError);           //подписка на событие "ошибка"
                    
                    // Таймаут
                    setTimeout(() => {
                        mkClean();
                        reject(new Error('Timeout loading audio metadata'));
                    }, 3000);
                });
            },
            
            async handleFileSelect(event) {
                const files = Array.from(event.target.files);
                const audioFiles = files.filter(file => this.isAudio(file));

                if (audioFiles.length === 0) {
                    this.showError('Не было выбрано ни одного файла!');
                    this.resetInput(event.target);
                    
                    return;
                }

                let cSize = 0;
                files.forEach(function(item) { cSize += item.size; });

                if (cSize > this.MAX_PLAYLIST_SIZE) {
                    this.showError('Превышен лимит доступной памяти! Максимальный размер - ' + (this.MAX_PLAYLIST_SIZE / 1024 / 1024) + "MB.");
                    this.resetInput(event.target);

                    return;
                }

                this.isLoading = true;
                this.totalFiles = audioFiles.length;

                let validFiles = [];

                for (let afile of audioFiles) {
                    try {
                        const afile_size = afile.size;
                        const afile_name = afile.name;
                        const blob = afile.slice(0, afile_size);

                        let parseData = await parseBlob(blob);
                        let trackDKey = `${afile_name}-${afile_size}`;

                        afile.common = {
                            ...parseData.common,
                            id: trackDKey,                            
                        };

                        afile.common.url = this.getObjectURL(afile);                        

                        if (!this.audioDurations[trackDKey]) {
                            try {
                                let tduration = await this.getAudioDurationSimple(afile);

                                this.audioDurations[trackDKey] = tduration;
                                afile.common.duration = tduration;
                                this.durationAll += tduration;
                            } catch (error) {
                                console.warn(`[FUNC WARN] handleFileSelect:: Не удалось получить длительность для ${afile.name}:`, error);
                                this.audioDurations[trackDKey] = 0;
                            }
                        } else {
                            afile.common.duration = this.audioDurations[trackDKey];
                        }

                        validFiles.push(afile);
                    } catch (error) {
                        console.error('Ошибка при разборе файла: ', error);
                    }
                }

                this.isLoading = false;

                if (validFiles.length > 0) {
                    this.PlayList = validFiles;
                    this.IsValidPlayList = true;
                } else {
                    alert('Не было выбрано ни одного аудиофайла!');
                }

                setTimeout(() => {
                    this.saveState();
                }, 300);
            },

            // проверка "на аудиофайл"
            isAudio(file) {
                if (file.size > this.MAX_FILE_SIZE) {
                    console.warn(`Файл ${file.name} слишком большой: ${file.size} bytes`);
                    return false;
                }

                const audioTypes = [ 'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/aac', 'audio/x-m4a' ];
                const extension = file.name.toLowerCase().split('.').pop();
                const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'];
            
                return audioTypes.includes(file.type) || audioExtensions.includes(extension);
            },

            formatDuration(seconds) {
                if (!seconds || isNaN(seconds)) {
                    return '00:00';
                } else {
                    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
                }
            },

            VolimePlus() {
                if (this.audioElement) {
                    if (this.VolumeLvl < 1) {
                        this.VolumeLvl = parseFloat((this.VolumeLvl + 0.1).toFixed(1));
                    }
                    this.audioElement.volume = this.VolumeLvl;
                }
            },

            VolumeMinus() {
                if (this.audioElement) {
                    if (this.VolumeLvl > 0) {
                        this.VolumeLvl = parseFloat((this.VolumeLvl - 0.1).toFixed(1));
                    }
                    this.audioElement.volume = this.VolumeLvl;
                }
            },

            PlayerAction_Play() {
                if (!this.audioElement) this.initAudio();
                
                const currentTrack = this.currentTrack;
                
                if (!this.audioElement) {
                    console.error('[FUNC ERR] PlayerAction_Play:: Audio Element not found');
                    this.showError('Аудио элемент не найден');
                    return;
                }
                
                if (!currentTrack) {
                    console.error('[FUNC ERR] PlayerAction_Play:: Нет текущего трека');
                    this.showError('Нет трека для воспроизведения');
                    return;
                }
                
                if (!currentTrack.common.url) {
                    console.error('[FUNC ERR] PlayerAction_Play:: У трека нет URL');
                    this.showError('URL трека отсутствует');
                    return;
                }
                
                // Обновляем src если изменился
                if (this.audioElement.src !== currentTrack.common.url) {
                    this.audioElement.src = currentTrack.common.url;
                    this.audioElement.load();
                }
                
                // Восстанавливаем громкость
                this.audioElement.volume = this.VolumeLvl;
                
                const playPromise = this.audioElement.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            this.isPlaying = true;
                        })
                        .catch(error => {
                            if (error.name === 'AbortError') {
                                console.log('Воспроизведение прервано (нормально)');
                                return;
                            }
                            console.error('[FUNC ERR] PlayerAction_Play:: Ошибка воспроизведения:', error);
                            this.isPlaying = false;
                            this.showError(`Не удалось воспроизвести трек: ${error.message}`);
                        });
                } else {
                    this.audioElement.play();
                    this.isPlaying = true;
                }
            },

            PlayerAction_Pause() {
                if (this.audioElement) {
                    this.audioElement.pause();
                    this.isPlaying = false;
                }
            },

            PlayerAction_Stop() {
                if (this.audioElement) {
                    this.audioElement.pause();
                    this.audioElement.currentTime = 0;
                    this.TrackTime.current = 0;
                    
                    const trackTimeElement = document.querySelector('#main_tracktime');
                    if (trackTimeElement) trackTimeElement.value = 0;
                    
                    console.log('Воспроизведение остановлено');
                }
            },

            PlayerAction_NextTrack() {
                const preplist = this.PlayList;

                if (!preplist || preplist.length === 0) {
                    console.warn('[FUNC WARN] PlayerAction_NextTrack:: Плейлист пуст');
                    return;
                }
                
                this.PlayerAction_Pause();
                
                let newIndex;
                if (!this.ShuffleMode) {
                    newIndex = (this.currentIndex >= preplist.length - 1) ? 0 : this.currentIndex + 1;
                } else {
                    newIndex = this.Get_randomInteger(0, preplist.length - 1);
                }
                
                this.SelectTrack(newIndex);
            },

            PlayerAction_PrevTrack() {
                const preplist = this.PlayList;

                if (!preplist || preplist.length === 0) return;
                
                this.PlayerAction_Pause();
                
                let newIndex;

                if (!this.ShuffleMode) {
                    newIndex = (this.currentIndex === 0) ? preplist.length - 1 : this.currentIndex - 1;
                } else {
                    newIndex = this.Get_randomInteger(0, preplist.length - 1);
                }
                
                this.SelectTrack(newIndex);
            },

            getObjectURL(track) {
                const key = track.common.id;

                if (!this.urlsData.has(key)) this.urlsData.set(key, URL.createObjectURL(track));
                return this.urlsData.get(key);
            },

            Chng_TrackRangeTime() {
                if (!this.audioElement) return;

                const TrackTimeElement = document.querySelector('#main_tracktime');

                if (TrackTimeElement) this.audioElement.currentTime = parseFloat(TrackTimeElement.value);
            },

            ShowerTime(iSec) {
                if (iSec && typeof iSec == 'number') {
                    let inpSec = Math.trunc(iSec);
                    let strMin = (Math.trunc(inpSec / 60) < 10) ? ("0" + Math.trunc(inpSec / 60)) : Math.trunc(inpSec / 60);
                    let strSec = (inpSec % 60 < 10) ? ("0" + (inpSec % 60)) : (inpSec % 60);

                    return strMin + ":" + strSec;
                } else {
                    return "00:00";
                }
            },

            onTimeUpdate: debounce(function(event) {
                const audio = event.target || this.audioElement;
                if (!audio) return;
                
                this.TrackTime.current = audio.currentTime;
                this.TrackTime.duration = audio.duration || 0;
                
                const trackTimeElement = document.querySelector('#main_tracktime');
                if (trackTimeElement) trackTimeElement.value = this.TrackTime.current;
            }, 100),

            Chng_SilentMode() {
                const Silent = this.SilentMode;

                if (!Silent) {
                    this.VolumeLvl_save = this.VolumeLvl;
                    this.VolumeLvl = 0;
                } else {
                    this.VolumeLvl = this.VolumeLvl_save;
                }

                this.SilentMode = !Silent;
            },

            Get_randomInteger(min, max) {
                let rand = min + Math.random() * (max + 1 - min);
                
                return Math.floor(rand);
            },

            Chng_ShuffleMode() { this.ShuffleMode = !this.ShuffleMode; },

            SelectTrack(inpIndex) {
                const preplist = this.PlayList;
                
                if (!preplist || preplist.length === 0) {
                    this.showError('Плейлист пуст');
                    return;
                }
                
                if (inpIndex < 0 || inpIndex >= preplist.length) {
                    console.error('[FUNC ERR] SelectTrack:: Индекс вне диапазона:', inpIndex);
                    return;
                }
                
                if (inpIndex === this.currentIndex) {
                    if (this.audioElement) {
                        this.audioElement.currentTime = 0;
                    }
                    this.PlayerAction_Play();
                    return;
                }
                
                this.PlayerAction_Pause();
                this.currentIndex = inpIndex;

                this.$forceUpdate();                
                this.$nextTick(() => {
                    const currentTrack = this.currentTrack;
                    
                    if (!this.audioElement || !currentTrack) {
                        console.error('[FUNC ERR] SelectTrack:: Audio элемент или трек не найдены');
                        return;
                    }
                    
                    if (!currentTrack.common.url) {
                        console.error('[FUNC ERR] SelectTrack:: У трека нет URL');
                        return;
                    }
                    
                    this.audioElement.src = currentTrack.common.url;
                    this.audioElement.load();
                    
                    const onCanPlay = () => {
                        this.audioElement.removeEventListener('canplay', onCanPlay);
                    
                        setTimeout(() => {
                            this.PlayerAction_Play();
                        }, 100);
                    };
                    
                    this.audioElement.addEventListener('canplay', onCanPlay);
                    
                    setTimeout(() => {
                        this.audioElement.removeEventListener('canplay', onCanPlay);
                    
                        setTimeout(() => {
                            this.PlayerAction_Play();
                        }, 100);
                    }, 2000);
                });
            },

            Chng_CoverMode(modeIndex) { this.CoverMode = (modeIndex === 0) ? false : true; },

            updateCoverUrl() {
                // Освобождаем предыдущий URL
                if (this.prevCoverUrl) URL.revokeObjectURL(this.prevCoverUrl);
                
                if (this.currentTrack?.common?.picture?.[0]) {
                    const cover = this.currentTrack.common.picture[0];
                    const blob = new Blob([cover.data], { type: cover.format });
                    
                    this.currentCoverUrl = URL.createObjectURL(blob);
                    this.prevCoverUrl = this.currentCoverUrl;
                } else {
                    this.currentCoverUrl = null;
                }
            },

            Mk_trackSelectorAction() {
                const actSelector = document.querySelector('#trackSelector_action');
                let newList = [];

                switch (actSelector.value) {
                    case 'DEL':
                        newList = this.PlayList.filter(elem => !this.trackSelector.includes(elem.common.id));
                        
                        this.PlayerAction_Pause();
                        
                        setTimeout(() => {                    
                            this.PlayList = newList;
                            this.trackSelector = [];
                            this.SelectTrack(0);
                            this.saveState();
                            this.PlayerAction_Play();
                        }, 500);

                        break;
                    default:
                        break;
                }
            },

            ChngVal_ShowCOnfig(inpKey) {
                this.ShowConfig.playlist[inpKey] = !this.ShowConfig.playlist[inpKey];
            },
        },

        mounted() {
            console.log('OSIMPlayer app mounted with windowId:', this.windowId);

            // Инициализируем аудио элемент ПЕРВЫМ
            this.$nextTick(() => {
                this.initAudio();
                this.initFromIDB();
            });

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем начальное состояние после небольшой задержки
            setTimeout(() => {
                if (!this.isInitialized) this.saveState();
            }, 100);

            // Добавляем обработчик ошибок для аудио
            this.$nextTick(() => {
                // const AudioElement = document.querySelector('#main_audio');
                const AudioElement = this.audioElement;
                if (AudioElement) {
                    // Обработчик окончания трека
                    AudioElement.addEventListener('ended', () => {
                        this.PlayerAction_NextTrack();
                    });
                    
                    // Обработчик ошибок
                    AudioElement.addEventListener('error', (e) => {
                        console.error('AudioElement Error:', e);
                        console.error('code:', AudioElement.error?.code);
                        console.error('message:', AudioElement.error?.message);
                    });
                }
            });
        },

        beforeUnmount() {            
            if (this.audioElement) {
                // Удаляем все обработчики
                if (this._onEnded) {
                    this.audioElement.removeEventListener('ended', this._onEnded);
                    this._onEnded = null;
                }

                if (this._onTimeUpdate) {
                    this.audioElement.removeEventListener('timeupdate', this._onTimeUpdate);
                    this._onTimeUpdate = null;
                }
                
                if (this._onError) {
                    this.audioElement.removeEventListener('error', this._onError);
                    this._onError = null;
                }
                
                // Останавливаем и очищаем
                this.audioElement.pause();
                this.audioElement.src = '';
                this.audioElement.load();
                this.audioElement = null;
            }
            
            // Освобождаем все ObjectURL
            if (this.currentCoverUrl) {
                URL.revokeObjectURL(this.currentCoverUrl);
                this.currentCoverUrl = null;
            }
            
            this.urlsData.forEach(url => URL.revokeObjectURL(url));
            this.urlsData.clear();
            
            console.log('OSIMPlayer очищен');
        },
    }
</script>