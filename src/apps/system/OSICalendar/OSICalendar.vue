<template src="./template.html"></template>
<style src="./styles.css"></style>
<script>
    import { LangPack } from './lang';
    import { mapStores } from 'pinia';
    import { useAppsStore } from '@/stores/apps.store';
    import { usersTable } from '@/idb/db';

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
                USER: null,
                lang_data: {},

                timer: null,
                
                currentDate: new Date(),
                currentDateStr: null,
                currentTime: null,
            
                selectDate: new Date(),
                selectDate_Events: [],
                selectDate_Reminders: [],                
            }
        },

        computed: {
            ...mapStores(useAppsStore),
            
            selectYear() {
                const targetDate = this.selectDate;
                return targetDate.getYear();
            },

            
        },

        methods: {
            async reloadTime() {
                this.updateTime();
                this.timer = setInterval(this.updateTime, 1000);
            },

            updateTime() {
                const now = new Date();

                this.currentDate = now;
                this.currentDateStr = now.toLocaleDateString();
                this.currentTime = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
            },

            async findUser() {
                try {
                    this.USER = await usersTable.getbyId(this.USERID);
                } catch (error) {
                    console.error('Ошибка поиска пользователя:', error);
                    this.$toast.error('Не удалось загрузить данные пользователя');
                }
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

            // поиск по lang файлу
            LangData(key) { return this.lang_data[key] || ''; },

            Get_monthStr(inpVal) {
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

                return monthsList[inpVal];
            },
            
            Get_wdayStr(inpVal) {
                let wdays = [
                    this.LangData('sunday'),
                    this.LangData('monday'),
                    this.LangData('tuesday'),
                    this.LangData('wednesday'),
                    this.LangData('thursday'),
                    this.LangData('friday'),
                    this.LangData('saturday'),
                ];

                return wdays[inpVal];
            },

            calendarWeeks() {
                const weeks = [];
                const firstDayOfMonth = new Date(this.selectDate.getFullYear(), this.selectDate.getMonth(), 1);

                let sDate = this.selectDate;
                sDate = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
                
                // const sDay = sDate.getDate();
                // const sMonth = sDate.getMonth();
                // const sYear = sDate.getFullYear();

                const curMonth = this.currentDate.getMonth();
                const curDay = this.currentDate.getDate();
                const curYear = this.currentDate.getFullYear();
                // const curDate = new Date(curYear, curMonth, curDay);
                
                // Находим первый день, который нужно отобразить (может быть из предыдущего месяца)
                const firstDayOfCalendar = new Date(firstDayOfMonth);
                // Начинаем с понедельника (0 - воскресенье, 1 - понедельник)
                const dayOfWeek = firstDayOfMonth.getDay();
                // Корректировка для начала недели с понедельника
                const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

                firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - startOffset);

                let cur_Date = new Date(firstDayOfCalendar);
                let weekNumber = 0;

                for (let week = 0; week < 6; week++) {
                    const weekDays = [];

                    for (let day = 0; day < 7; day++) {
                        const d = new Date(cur_Date);
                        const dayOfMonth = d.getDate();
                        const isCurrentYear = d.getFullYear() === curYear;
                        const isCurrentMonth = d.getMonth() === curMonth;
                        // const isCurrentMonth = d.getMonth() === sMonth;
                        const isCurrentDay = isCurrentMonth && dayOfMonth === curDay && d.getFullYear() === curYear;
                        // const isCurrentDay = isCurrentMonth && dayOfMonth === sDay && d.getFullYear() === sYear;
                        // const isSelectedDay = this.selectedDay !== null && isCurrentMonth && dayOfMonth === this.selectedDay && d.getFullYear() === this.display_year();
                        // const isSelectedDay = d === curDate;
                        const isSelectedDay = d.toLocaleDateString() === sDate.toLocaleDateString();

                        weekDays.push({
                            date: d,
                            // dateString: d.toISOString().split('T')[0],
                            dateString: d.toLocaleDateString(),
                            dayOfMonth: dayOfMonth,
                            CurrentYear: isCurrentYear,
                            CurrentMonth: isCurrentMonth,
                            CurrentDay: isCurrentDay,
                            SelectedDay: isSelectedDay,
                            month: d.getMonth(),
                            year: d.getFullYear()
                        });
                        
                        // Переходим к следующему дню
                        cur_Date.setDate(cur_Date.getDate() + 1);
                    }
        
                    // Добавляем неделю только если она содержит дни текущего месяца
                    // или это первая/последняя неделя
                    const hasCurrentMonthDays = weekDays.some(day => day.isCurrentMonth);
                    const isFirstWeek = week === 0;
                    // const isLastWeek = week === 5;

                    if (hasCurrentMonthDays || isFirstWeek || (week < 5 && new Date(cur_Date).getMonth() !== this.currentDate.getMonth() + 2)) {
                        weeks.push({
                            weekNumber: weekNumber++,
                            days: weekDays
                        });
                    }
                }
                
                return weeks;

            },
        },

        mounted() {
            console.log('OSICalendar app mounted with windowId:', this.windowId);

            const sDate = (this.selectedYear && this.selectedMonth && this.selectedDay) ? new Date(this.selectedYear, this.selectedMonth, this.selectedDay) : this.currentDate;
            this.selectDate = sDate;

            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;

            this.lang_data = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем начальное состояние после небольшой задержки
            setTimeout(() => {
                this.saveState();
            }, 100);

            this.reloadTime();
        },
  
        beforeUnmount() {
            if (this.timer) {
                clearInterval(this.timer);
            }
        }
    }
</script>