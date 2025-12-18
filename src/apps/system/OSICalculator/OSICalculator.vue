<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useAppsStore } from '@/stores/apps.store';
    import { LangPack } from './lang';
    import { mapStores } from 'pinia';

    export default {
        name: 'OSICalculator',

        props: {
            windowId: {
                type: String,
                required: true
            },
        },
  
        data() {
            // Инициализируем базовые значения, НЕ используем this.appsStore здесь
            return {
                expression: '',
                result: '0',
                history: [],
                lastResult: null,
                LangData: {},
                isInitialized: false // Флаг инициализации
            }
        },
  
        computed: {
            ...mapStores(useAppsStore),

            reversedHistory() {
                return [...this.history].reverse().slice(0, 5);
            }
        },
  
        watch: {
            // Отслеживаем изменения только после инициализации
            expression() {
                if (this.isInitialized) {
                    this.calculate();
                    this.saveState();
                }
            },
            history: {
                handler() { 
                    if (this.isInitialized) {
                        this.saveState(); 
                    }
                },
                deep: true
            },
            result() {
                if (this.isInitialized) {
                    this.saveState();
                }
            }
        },

        methods: {
            // Инициализация из store
            initFromStore() {
                if (!this.windowId || !this.appsStore) {
                    console.error('CalculatorApp: windowId or appsStore is missing');
                    return;
                }
            
                const savedState = this.appsStore.getWindowState(this.windowId);
                console.log('CalculatorApp loaded state:', savedState);
            
                if (savedState && savedState.appType === 'calculator') {
                    this.expression = savedState.expression || '';
                    this.result = savedState.result || '0';
                    this.history = savedState.history || [];
                    this.lastResult = savedState.lastResult || null;
                }
                
                this.isInitialized = true;
                console.log('CalculatorApp initialized');
            },

            // Сохраняем текущее состояние в store
            saveState() {
                if (!this.windowId || !this.appsStore || !this.isInitialized) return;
                
                const state = {
                    appType: 'calculator',
                    expression: this.expression,
                    result: this.result,
                    lastResult: this.lastResult,
                    history: [...this.history],
                    timestamp: Date.now()
                };
                
                console.log('CalculatorApp saving state:', state);
                this.appsStore.saveWindowState(this.windowId, state);
            },

            // Добавление цифры
            appendNumber(number) {
                if (this.lastResult !== null && !this.expression.includes('+') && 
                    !this.expression.includes('-') && !this.expression.includes('×') && 
                    !this.expression.includes('÷')) {
                    this.expression = '';
                    this.lastResult = null;
                }
      
                this.expression += number;
            },
    
            // Добавление операции
            appendOperation(operation) {
                if (!this.expression) {
                    if (this.lastResult !== null) {
                        this.expression = this.lastResult + operation;
                    } else {
                        return;
                    }
                } else {
                    const lastChar = this.expression.slice(-1);
                    if (['+', '-', '×', '÷'].includes(lastChar)) {
                        this.expression = this.expression.slice(0, -1) + operation;
                    } else {
                        this.expression += operation;
                    }
                }
      
                this.lastResult = null;
            },
    
            // Добавление десятичной точки
            appendDecimal() {
                if (!this.expression || ['+', '-', '×', '÷'].includes(this.expression.slice(-1))) {
                    this.expression += '0.';
                } else if (!this.expression.split(/[+\-×÷]/).pop().includes('.')) {
                    this.expression += '.';
                }
            },
    
            // Вычисление результата
            calculate() {
                if (!this.expression) {
                    this.result = '0';
                    return;
                }
      
                try {
                    let expr = this.expression.replace(/×/g, '*').replace(/÷/g, '/');
                    let calcResult = eval(expr);
        
                    if (calcResult % 1 !== 0) {
                        calcResult = parseFloat(calcResult.toFixed(10));
                    }
        
                    this.result = calcResult;
                } catch (error) {
                    this.result = 'Ошибка';
                }
            },
    
            // Выполнить вычисление и добавить в историю
            calculateAndAddHistory() {
                if (!this.expression) return;
      
                const oldExpression = this.expression;
                this.calculate();
      
                if (this.result !== 'Ошибка') {
                    this.addToHistory(oldExpression, this.result);
                    this.lastResult = this.result;
                    this.expression = '';
                }
            },
    
            // Добавить в историю
            addToHistory(expression, result) {
                this.history.push({
                    expression: expression,
                    result: result,
                    timestamp: new Date().toLocaleTimeString()
                });
                
                // Автоматически сохраняем после добавления в историю
                if (this.isInitialized) {
                    this.saveState();
                }
            },
    
            // Очистить все
            clearAll() {
                this.expression = '';
                this.result = '0';
                this.lastResult = null;
            },
    
            // Очистить последнюю запись
            clearEntry() {
                this.expression = '';
                this.calculate();
            },
    
            // Удалить последний символ
            backspace() {
                if (this.expression) {
                    this.expression = this.expression.slice(0, -1);
                    this.calculate();
                }
            },
    
            // Очистить историю
            clearHistory() { 
                this.history = []; 
                if (this.isInitialized) {
                    this.saveState();
                }
            },
    
            // Использовать результат из истории
            useHistoryItem(item) {
                this.expression = item.expression;
                this.result = item.result;
                this.lastResult = item.result;
            },
    
            // Обработка нажатия клавиш
            handleKeyPress(event) {
                const key = event.key;
      
                if (/[0-9]/.test(key)) {
                    this.appendNumber(key);
                    event.preventDefault();
                } else if (key === '+') {
                    this.appendOperation('+');
                    event.preventDefault();
                } else if (key === '-') {
                    this.appendOperation('-');
                    event.preventDefault();
                } else if (key === '*') {
                    this.appendOperation('×');
                    event.preventDefault();
                } else if (key === '/') {
                    this.appendOperation('÷');
                    event.preventDefault();
                } else if (key === '.' || key === ',') {
                    this.appendDecimal();
                    event.preventDefault();
                } else if (key === 'Enter' || key === '=') {
                    this.calculateAndAddHistory();
                    event.preventDefault();
                } else if (key === 'Escape') {
                    this.clearAll();
                    event.preventDefault();
                } else if (key === 'Backspace') {
                    this.backspace();
                    event.preventDefault();
                }
            }
        },
  
        mounted() {
            console.log('CalculatorApp mounted with windowId:', this.windowId);
    
            // Добавляем поддержку клавиатуры
            window.addEventListener('keydown', this.handleKeyPress);

            // Инициализируем данные из store после монтирования
            this.$nextTick(() => {
                this.initFromStore();
            });
            
            const userLang = navigator.language || navigator.userLanguage;
            const userLangS = userLang.split('-')[0];
            this.UserLang = userLangS; 
            
            const LangPackData = LangPack;
            this.LangData = (userLangS && LangPackData && LangPackData[userLangS]) ? LangPackData[userLangS] : LangPackData.en;

            // Сохраняем начальное состояние после небольшой задержки
            setTimeout(() => {
                if (!this.isInitialized) {
                    this.initFromStore();
                }
                this.saveState();
            }, 100);
        },
  
        beforeUnmount() {
            window.removeEventListener('keydown', this.handleKeyPress);
            
            // // Сохраняем состояние перед размонтированием
            // if (this.isInitialized) {
            //     this.saveState();
            // }
        }
    }
</script>