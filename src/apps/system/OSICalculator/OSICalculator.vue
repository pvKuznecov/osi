<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
    import { useAppsStore } from '@/stores/apps.store'; //store хранилище pinia для состояний app приложений 
    import { mapStores } from 'pinia';

    export default {
        name: 'CalculatorApp',

        props: {
            windowId: {
                type: String,
                required: true
            },
        },
  
        data() {
            return {
                expression: '',
                result: '0',
                history: [],
                lastResult: null
            }
        },
  
        computed: {
            ...mapStores(useAppsStore), // Подключаем store через mapStores

            reversedHistory() {
                return [...this.history].reverse().slice(0, 5); // Последние 5 операций
            }
        },
  
        watch: {
            // отслеживаем изменение истории и записываем ее состояние в store pinia
            history: {
                handler() { this.saveState(); },
                deep: true
            }
        },

        methods: {
            // Инициализация из store (вызывается в mounted)
            initFromStore() {
                if (!this.windowId) return;
            
                const savedState = this.appsStore.getWindowState(this.windowId);
            
                if (savedState) {
                    this.expression = savedState.expression || '';
                    this.result = savedState.result || '0';
                    this.history = savedState.history || this.history;
                    this.lastResult = savedState.lastResult || null;
                }
            },

            // Сохраняем текущее состояние в store pinia
            saveState() {
                if (!this.windowId || !this.appsStore) return;
                
                const state = {
                    appType: 'calculator',
                    
                    expression: this.expression,
                    result: this.result,
                    lastResult: this.lastResult,

                    history: [...this.history],
                    timestamp: Date.now(),
                };
                
                this.appsStore.saveWindowState(this.windowId, state);
            },

            // Добавление цифры
            appendNumber(number) {
                // Если есть результат и пользователь начинает новое выражение
                if (this.lastResult !== null && !this.expression.includes('+') && 
                    !this.expression.includes('-') && !this.expression.includes('×') && 
                    !this.expression.includes('÷'))
                {
                    this.expression = '';
                    this.lastResult = null;
                }
      
                this.expression += number;
                this.calculate();
            },
    
            // Добавление операции
            appendOperation(operation) {
                if (!this.expression) {
                    // Если выражение пустое, используем последний результат
                    if (this.lastResult !== null) {
                        this.expression = this.lastResult + operation;
                    } else {
                        return;
                    }
                } else {
                    // Проверяем, не является ли последний символ операцией
                    const lastChar = this.expression.slice(-1);
                    if (['+', '-', '×', '÷'].includes(lastChar)) {
                        // Заменяем последнюю операцию
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
                    // Заменяем символы для вычисления
                    let expr = this.expression.replace(/×/g, '*').replace(/÷/g, '/');
        
                    // Вычисляем выражение
                    let calcResult = eval(expr);
        
                    // Ограничиваем количество знаков после запятой
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
                    expression: expression || this.expression,
                    result: result || this.result,
                    timestamp: new Date().toLocaleTimeString()
                });
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
            clearHistory() { this.history = []; },
    
            // Использовать результат из истории
            useHistoryItem(item) {
                this.expression = item.expression;
                this.result = item.result;
                this.lastResult = item.result;
            },
    
            // Обработка нажатия клавиш
            handleKeyPress(event) {
                const key = event.key;
      
                // Цифры 0-9
                if (/[0-9]/.test(key)) {
                    this.appendNumber(key);
                    event.preventDefault();
                } else if (key === '+') {
                    // Операции
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
                    // Десятичная точка
                    this.appendDecimal();
                    event.preventDefault();
                } else if (key === 'Enter' || key === '=') {
                    // Enter или = для вычисления
                    this.calculateAndAddHistory();
                    event.preventDefault();
                } else if (key === 'Escape') {
                    // Escape для очистки
                    this.clearAll();
                    event.preventDefault();
                } else if (key === 'Backspace') {
                    // Backspace для удаления
                    this.backspace();
                    event.preventDefault();
                }
            }
        },
  
        mounted() {
            console.log('AppWiki mounted with windowId:', this.windowId);
    
            // Добавляем поддержку клавиатуры
            window.addEventListener('keydown', this.handleKeyPress);

            // Инициализируем данные из store после монтирования
            this.initFromStore();
        
            // // Сохраняем начальное состояние
            // this.saveState();
        },
  
        beforeUnmount() {
            window.removeEventListener('keydown', this.handleKeyPress);
        }
    }
</script>

