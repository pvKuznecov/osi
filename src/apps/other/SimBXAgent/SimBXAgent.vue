<template src="./template.html"></template>
<style src="./style.css"></style>
<script>
export default {
    name: 'SimBXAgent',
    
    data() {
        return {
            tasks: [],
            loading: false,
            error: null,
            expandedTasks: [],
            webhookUrl: 'https://bxlocalnew.skc-fmba.ru/rest/24/x2fg4u4n3zqr3fcu/',
            filters: {
                RESPONSIBLE_ID: 24,
            },
            selectFields: [
                'ID', 
                'TITLE', 
                'DESCRIPTION',
                'STATUS', 
                'DEADLINE', 
                'PRIORITY', 
                'CREATED_DATE'
            ],
            currentPage: 1,
            perPage: 10,
            perPageOptions: [5, 10, 20, 50, 100],
            start: 0,
            total: 0
        };
    },

    computed: {
        totalPages() {
            return Math.ceil(this.total / this.perPage) || 1;
        },
        
        rangeText() {
            if (this.tasks.length === 0) return 'Нет задач';
            const start = (this.currentPage - 1) * this.perPage + 1;
            const end = Math.min(this.currentPage * this.perPage, this.total);
            return `${start}–${end} из ${this.total}`;
        },
        
        visiblePages() {
            const total = this.totalPages;
            const current = this.currentPage;
            const delta = 2;
            const range = [];
            
            for (let i = 1; i <= total; i++) {
                if (
                    i === 1 ||
                    i === total ||
                    (i >= current - delta && i <= current + delta)
                ) {
                    range.push(i);
                } else if (range[range.length - 1] !== '...') {
                    range.push('...');
                }
            }
            return range;
        }
    },

    mounted() {
        this.loadTasks();
    },

    methods: {
        // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
        pluralize(count, words) {
            const cases = [2, 0, 1, 1, 1, 2];
            return words[
                (count % 100 > 4 && count % 100 < 20) 
                    ? 2 
                    : cases[Math.min(count % 10, 5)]
            ];
        },

        // ===== ⭐ ОСНОВНОЙ МЕТОД ДЛЯ РАСКРЫТИЯ ОПИСАНИЯ =====
        toggleTaskExpand(taskId) {
            const index = this.expandedTasks.indexOf(taskId);
            if (index > -1) {
                this.expandedTasks.splice(index, 1);
            } else {
                this.expandedTasks.push(taskId);
            }
        },

        // ===== РАБОТА С ДАННЫМИ =====
        async loadTasks() {
            this.loading = true;
            this.error = null;
            
            const start = (this.currentPage - 1) * this.perPage;

            try {
                const params = {
                    filter: this.filters,
                    select: this.selectFields,
                    order: { CREATED_DATE: 'DESC' },
                    start: start,
                    limit: this.perPage
                };

                console.log('📤 Запрос к Битрикс:', params);

                const response = await fetch(`${this.webhookUrl}tasks.task.list`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ошибка: ${response.status}`);
                }

                const data = await response.json();
                console.log('📥 Ответ от Битрикс:', data);

                if (data.error) {
                    throw new Error(`API ошибка: ${data.error_description || data.error}`);
                }

                if (data.result && data.result.tasks) {
                    this.tasks = data.result.tasks;
                    this.total = data.total || 0;
                } else {
                    this.tasks = [];
                    this.total = 0;
                }

            } catch (error) {
                console.error('❌ Ошибка:', error);
                this.error = error.message || 'Не удалось загрузить задачи';
            } finally {
                this.loading = false;
            }
        },

        refreshTasks() {
            this.loadTasks();
        },

        // ===== ПАГИНАЦИЯ =====
        goToPage(page) {
            if (page === '...') return;
            if (page < 1 || page > this.totalPages) return;
            if (page === this.currentPage) return;
            
            this.currentPage = page;
            this.expandedTasks = [];
            this.loadTasks();
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        },

        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        },

        changePerPage(newPerPage) {
            if (newPerPage === this.perPage) return;
            
            this.perPage = newPerPage;
            this.currentPage = 1;
            this.expandedTasks = [];
            this.loadTasks();
        },

        // ===== ФОРМАТИРОВАНИЕ =====
        formatDescription(description) {
            if (!description) return '';
            return description.replace(/\n/g, '<br>');
        },

        openTask(taskId) {
            const baseUrl = this.webhookUrl.replace(/\/rest\/.*$/, '');
            window.open(`${baseUrl}/tasks/task/view/${taskId}/`, '_blank');
        },

        formatDate(dateString) {
            if (!dateString) return '—';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return dateString;
            }
        },

        // ===== ПРИОРИТЕТЫ =====
        getPriorityLabel(priority) {
            const map = {
                '1': '🔥 Высокий',
                '2': '⚡ Средний',
                '3': '✅ Низкий'
            };
            return map[priority] || '—';
        },

        getPriorityClass(priority) {
            const map = {
                '1': 'priority-high',
                '2': 'priority-medium',
                '3': 'priority-low'
            };
            return map[priority] || '';
        },

        // ===== СТАТУСЫ =====
        getStatusLabel(status) {
            const map = {
                '1': '🟢 Новая',
                '2': '🟡 В работе',
                '3': '🔵 Выполняется',
                '4': '🟣 Ожидает контроля',
                '5': '✅ Завершена'
            };
            return map[String(status)] || `Статус ${status}`;
        },

        getStatusClass(status) {
            const map = {
                '1': 'status-new',
                '2': 'status-progress',
                '3': 'status-progress',
                '4': 'status-pending',
                '5': 'status-done'
            };
            return map[String(status)] || '';
        },

        // ===== ФИЛЬТРЫ =====
        setFilter(key, value) {
            this.filters[key] = value;
            this.currentPage = 1;
            this.refreshTasks();
        },

        setLimit(limit) {
            this.perPage = limit;
            this.currentPage = 1;
            this.refreshTasks();
        }
    }
};
</script>