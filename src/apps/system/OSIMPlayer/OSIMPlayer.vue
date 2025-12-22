<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    // import { resolve } from 'core-js/fn/promise';
    import { LangPack } from './lang';
    import { parseBlob } from 'music-metadata';

    export default {
        name: 'OSIMPlayer',

        props: {
            windowId: {
                type: String,
                required: true
            },
        },

        data() {
            return {
                LangData: {},
                PlayList: [],
                isPlaying: false,
                durationAll: 0,
                TargetTrack: null,
                ShowConfig: {
                    playlist: {
                        artist: true,
                        album: true,
                        genre: true,
                        duration: true,
                    }
                },
                isLoading: false,
                totalFiles: 0,
                MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB,
                MAX_PLAYLIST_SIZE: 1000 * 1024 * 1024, // 1000MB,
                curFilesSize: 0,
                audioDurations: {}, // Объект для "длительностей"
                VolumeLvl: 0.5,
                VolumeLvl_save: 0.5,
                currentIndex: 0,
                urlsData: new Map(),
                TrackTime: { current: 0, duration: 0},
                SilentMode: false,
            }
        },

        mounted() {
            console.log('MPlayer app mounted with windowId:', this.windowId);

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;
        },

        beforeUnmount() {
            this.PlayerAction_Pause();
        },

        computed: {
            currentTrack() {
                const curindex = this.currentIndex + '';
                const preplist = this.PlayList;

                if (preplist && preplist.length > 0 && curindex) {
                    let tr = preplist[curindex];
                    console.log("tr", tr);
                    return tr;
                } else {
                    return null;
                }
            },
        },

        watch: {
            // PlayList: {
            //     handler(newPlayList) {

            //     },
            //     immediate: true,
            // },
        },

        methods: {
            // Сброс input (открывает возможность повторно загружать те-же файлы)
            resetInput(inputElement) { inputElement.value = ''; },

            showError(message) {
                alert(message);
                console.error(message);
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
                    audio.addEventListener('error', onError); //подписка на событие "ошибка"
                    
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

                        // afile.common = parseData.common;
                        // afile.common.id = trackDKey;
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
                                console.warn(`Не удалось получить длительность для ${afile.name}:`, error);
                                this.audioDurations[trackDKey] = 0;
                            }
                        }

                        validFiles.push(afile);
                    } catch (error) {
                        console.error('Ошибка при разборе файла: ', error);
                    }
                }

                this.isLoading = false;

                if (validFiles.length > 0) {
                    this.PlayList = validFiles;
                } else {
                    alert('Не было выбрано ни одного аудиофайла!');
                }
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
                const AudioElement = document.querySelector('#main_audio');

                if (AudioElement) {
                    if (this.VolumeLvl < 1) {
                        this.VolumeLvl = parseFloat((this.VolumeLvl + 0.1).toFixed(1));
                    }
                    AudioElement.volume = this.VolumeLvl;
                }
            },
            VolumeMinus() {
                const AudioElement = document.querySelector('#main_audio');
                if (this.VolumeLvl > 0) {
                    this.VolumeLvl = parseFloat((this.VolumeLvl - 0.1).toFixed(1));
                }
                AudioElement.volume = this.VolumeLvl;
            },

            PlayerAction_Play() {
                const AudioElement = document.querySelector('#main_audio');
                const preplist = this.PlayList;

                if (AudioElement && preplist && preplist.length > 0) {
                    AudioElement.play();
                    this.isPlaying = true;
                }                
            },
            PlayerAction_Pause() {
                const AudioElement = document.querySelector('#main_audio');
                const preplist = this.PlayList;

                if (AudioElement && preplist && preplist.length > 0) {
                    AudioElement.pause();
                    this.isPlaying = false;
                }
            },

            getObjectURL(track) {
                const key = track.common.id;
                if (!this.urlsData.has(key)) {
                    this.urlsData.set(key, URL.createObjectURL(track));
                }
                return this.urlsData.get(key);
            },

            Chng_TrackRangeTime() {
                const AudioElement = document.querySelector('#main_audio');
                const TrackTimeElement = document.querySelector('#main_tracktime');

                // this.TrackTime.current = (TrackTimeElement) ? TrackTimeElement.value : 0;
                AudioElement.currentTime = TrackTimeElement.value;
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

            onTimeUpdate(event) {
                const audio = event.target;
                // Получаем текущую позицию воспроизведения и общую продолжительность
                this.TrackTime.current = audio.currentTime;
                this.TrackTime.duration = audio.duration || 0;

                if (this.TrackTime.current == this.TrackTime.duration) {
                    this.PlayerAction_Pause();
                }
      
                let TrackTimeElement = document.querySelector('#main_tracktime');
                TrackTimeElement.value = this.TrackTime.current;
            },

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
        }
    }
</script>