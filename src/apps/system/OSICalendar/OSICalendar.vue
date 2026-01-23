<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { usersTable } from '@/idb/db';
    import { useAppsStore } from '@/stores/apps.store';
    import { LangPack } from './lang';
    import { mapStores } from 'pinia';

    export default {
        name: 'OSICalendar',

        props: {
            windowId: { type: String, required: true },
            USERID: {type: Number, default: 0},
            selectedYear: { type: Number, default: null},
            selectedMonth: { type: Number, default: null},
            selectedDay: { type: Number, default: null},
        },

        data() {
            return {
                lang_data: {},
                FullMenuMode: true,
                MonthsDay: {},
                Today: new Date(),
                SelectedDate: new Date(),
                SelectedDate_plan: [{}, {}],
                USER: null,
            }
        },
        
        computed: {
            ...mapStores(useAppsStore),

            display_year() {
                return this.selectedYear !== null ? this.selectedYear : this.Today.getFullYear();
            },
            display_month() {
                return this.selectedMonth !== null ? this.selectedMonth : (this.Today.getMonth() + 1);
            },
            display_day() {
                return this.selectedDay !== null ? this.selectedDay : this.Today.getDate();
            },

            calendarWeeks() {
                const weeks = [];
                const firstDayOfMonth = new Date(this.display_year, (this.display_month - 1), 1);
                
                // Находим первый день, который нужно отобразить (может быть из предыдущего месяца)
                const firstDayOfCalendar = new Date(firstDayOfMonth);
                // Начинаем с понедельника (0 - воскресенье, 1 - понедельник)
                const dayOfWeek = firstDayOfMonth.getDay();
                // Корректировка для начала недели с понедельника
                const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

                firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - startOffset);

                let currentDate = new Date(firstDayOfCalendar);
                let weekNumber = 0;

                for (let week = 0; week < 6; week++) {
                    const weekDays = [];

                    for (let day = 0; day < 7; day++) {
                        const d = new Date(currentDate);
                        const dayOfMonth = d.getDate();
                        const isCurrentMonth = (d.getMonth() + 1) === this.display_month;
                        const isCurrentDay = isCurrentMonth && dayOfMonth === this.display_day && d.getFullYear() === this.display_year;
                        // const isDayoff = 
          
                        
                        const isSelectedDay = this.selectedDay !== null && isCurrentMonth && dayOfMonth === this.selectedDay && d.getFullYear() === this.display_year();

                        weekDays.push({
                            date: d,
                            dateString: d.toISOString().split('T')[0],
                            dayOfMonth: dayOfMonth,
                            isCurrentMonth: isCurrentMonth,
                            isCurrentDay: isCurrentDay,
                            isSelectedDay: isSelectedDay,
                            month: d.getMonth(),
                            year: d.getFullYear()
                        });
                        
                        // Переходим к следующему дню
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
        
                    // Добавляем неделю только если она содержит дни текущего месяца
                    // или это первая/последняя неделя
                    const hasCurrentMonthDays = weekDays.some(day => day.isCurrentMonth);
                    const isFirstWeek = week === 0;
                    // const isLastWeek = week === 5;

                    if (hasCurrentMonthDays || isFirstWeek || (week < 5 && new Date(currentDate).getMonth() !== this.displayMonth)) {
                        weeks.push({
                            weekNumber: weekNumber++,
                            days: weekDays
                        });
                    }
                }
                
                return weeks;
            },


            selectedDate() {
                const sDate = this.SelectedDate;

                return sDate.getDate() + '-' + (sDate.getMonth() + 1) + '-' + sDate.getFullYear();
            }
        },

        methods: {
            async findUser() {
                try {
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
            },

            display_selectedDate() {
                return this.display_day + '-' + this.display_month + '-' + this.display_year;
            },

            Get_currentDate() {
                return new Date();
            },

            Get_monthStr(inpDate) {
                let monthsList = [
                    this.LangData('january'),
                    this.LangData('february'),
                    this.LangData('march'),
                    this.LangData('april'),
                    this.LangData('may'),
                    this.LangData('june'),
                    this.LangData('july'),
                    this.LangData('august'),
                    this.LangData('september'),
                    this.LangData('october'),
                    this.LangData('november'),
                    this.LangData('december'),
                ];

                return monthsList[inpDate.getMonth()];
            },
            
            Get_weekDay(inpDate) {
                let daysList = [
                    this.LangData('sunday'),
                    this.LangData('monday'),
                    this.LangData('tuesday'),
                    this.LangData('wednesday'),
                    this.LangData('thursday'),
                    this.LangData('friday'),
                    this.LangData('saturday'),
                ];

                return daysList[inpDate.getDay()];
            },

            Get_formatingDate(inpDate) {
                return inpDate.getDate() + '-' + (inpDate.getMonth() + 1) + '-' + inpDate.getFullYear();
            },

            LangData(key) {
                return this.lang_data[key] || '';
            },
            
            // Инициализация из store
            initFromStore() {
                if (!this.windowId || !this.appsStore) {
                    console.error('OSICalendar: windowId or appsStore is missing');
                    return;
                }
            
                const savedState = this.appsStore.getWindowState(this.windowId);
                console.log('OSICalendar loaded state:', savedState);
            
                if (savedState && savedState.appType === 'calendar') {
                    this.expression = savedState.expression || '';
                    this.result = savedState.result || '0';
                    this.history = savedState.history || [];
                    this.lastResult = savedState.lastResult || null;
                }
                
                this.isInitialized = true;
                console.log('OSICalendar initialized');
            },

            // Сохраняем текущее состояние в store
            saveState() {
                if (!this.windowId || !this.appsStore || !this.isInitialized) return;
                
                const state = {
                    appType: 'calendar',
                    timestamp: Date.now()
                };
                
                console.log('OSICalculator saving state:', state);
                this.appsStore.saveWindowState(this.windowId, state);
            },

            Chng_fullMenuMode() {
                this.FullMenuMode = !this.FullMenuMode;
            },
        },

        mounted() {
            console.log('OSICalendar app mounted with windowId:', this.windowId);
            
            this.findUser();

            // Инициализируем данные из store после монтирования
            this.$nextTick(() => {
                this.initFromStore();
            });

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем начальное состояние после небольшой задержки
            setTimeout(() => {
                // if (!this.isInitialized) {
                //     this.initFromStore();
                // }
                this.saveState();
            }, 100);
        },
    }
</script>