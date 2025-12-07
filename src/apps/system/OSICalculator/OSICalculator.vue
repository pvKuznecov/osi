<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
export default {
  name: 'CalculatorApp',
  
  data() {
    return {
      expression: '',
      result: '0',
      history: [],
      lastResult: null
    }
  },
  
  computed: {
    reversedHistory() {
      return [...this.history].reverse().slice(0, 5); // Последние 5 операций
    }
  },
  
  methods: {
    // Добавление цифры
    appendNumber(number) {
      // Если есть результат и пользователь начинает новое выражение
      if (this.lastResult !== null && !this.expression.includes('+') && 
          !this.expression.includes('-') && !this.expression.includes('×') && 
          !this.expression.includes('÷')) {
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
        let expr = this.expression
          .replace(/×/g, '*')
          .replace(/÷/g, '/');
        
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
    clearHistory() {
      this.history = [];
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
      
      // Цифры 0-9
      if (/[0-9]/.test(key)) {
        this.appendNumber(key);
        event.preventDefault();
      }
      // Операции
      else if (key === '+') {
        this.appendOperation('+');
        event.preventDefault();
      }
      else if (key === '-') {
        this.appendOperation('-');
        event.preventDefault();
      }
      else if (key === '*') {
        this.appendOperation('×');
        event.preventDefault();
      }
      else if (key === '/') {
        this.appendOperation('÷');
        event.preventDefault();
      }
      // Десятичная точка
      else if (key === '.' || key === ',') {
        this.appendDecimal();
        event.preventDefault();
      }
      // Enter или = для вычисления
      else if (key === 'Enter' || key === '=') {
        this.calculateAndAddHistory();
        event.preventDefault();
      }
      // Escape для очистки
      else if (key === 'Escape') {
        this.clearAll();
        event.preventDefault();
      }
      // Backspace для удаления
      else if (key === 'Backspace') {
        this.backspace();
        event.preventDefault();
      }
    }
  },
  
  mounted() {
    // Добавляем поддержку клавиатуры
    window.addEventListener('keydown', this.handleKeyPress);
  },
  
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress);
  }
}
</script>

