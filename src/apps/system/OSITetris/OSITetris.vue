<script>
    import { usersTable } from '@/idb/db';
    
    export default {
        name: 'OSITetris',
        
        props: {
            windowId: {type: String, required: true},
            USERID: {type: Number, default: 0},
            fileData: { type: Object, default: null },
            fileId: { type: [String, Number], default: null },
            fileName: { type: String, default: '' },
            fileType: { type: String, default: '' },
        },

        emits: ['startapp', 'error', 'notification'],
        
        data() {
            return {
                // Игровое поле 10x20
                board: [],
                currentPiece: null,
                nextPiece: null,
                score: 0,
                level: 1,
                lines: 0,
                isPlaying: false,
                isPaused: false,
                gameOver: false,
                dropTime: 1000, // milliseconds
                lastTime: 0,
                animationFrameId: null,
                
                // Параметры игры
                boardWidth: 10,
                boardHeight: 20,
                
                // Тетромино фигуры
                pieces: {
                    I: { shape: [[1,1,1,1]], color: 'cyan' },
                    J: { shape: [[1,0,0], [1,1,1]], color: 'blue' },
                    L: { shape: [[0,0,1], [1,1,1]], color: 'orange' },
                    O: { shape: [[1,1], [1,1]], color: 'yellow' },
                    S: { shape: [[0,1,1], [1,1,0]], color: 'green' },
                    T: { shape: [[0,1,0], [1,1,1]], color: 'purple' },
                    Z: { shape: [[1,1,0], [0,1,1]], color: 'red' }
                },
                
                // Состояние игры
                gameStarted: false,
                
                // Заставка
                showSplash: true,
            };
        },
        
        computed: {
            // Получаем цвет фигуры по её типу
            getPieceColor() {
                return (pieceType) => {
                    return this.pieces[pieceType]?.color || 'gray';
                };
            },
            
            // Возвращает игровое поле с текущей фигурой, чтобы отобразить её в реальном времени
            displayBoard() {
                if (!this.isPlaying || !this.currentPiece) return this.board;
                
                const tempBoard = this.board.map(row => [...row]);
    
                for (let y = 0; y < this.currentPiece.shape.length; y++) {
                    for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                        if (this.currentPiece.shape[y][x] !== 0) {
                            const boardY = this.currentPiece.y + y;
                            const boardX = this.currentPiece.x + x;
                            
                            // Проверяем, что координаты находятся в пределах поля
                            if (
                                boardY >= 0 &&
                                boardY < this.boardHeight &&
                                boardX >= 0 &&
                                boardX < this.boardWidth
                            ) {
                                tempBoard[boardY][boardX] = this.currentPiece.type;
                            }
                        }
                    }
                }
                
                return tempBoard;
            }
        },
        
        watch: {
            isPlaying(newVal) {
                if (newVal && !this.gameOver) {
                    this.startGameLoop();
                } else {
                    this.stopGameLoop();
                }
            }
        },
        
        methods: {
            // Инициализация игрового поля
            initBoard() {
                this.board = Array(this.boardHeight).fill().map(() =>
                    Array(this.boardWidth).fill(0)
                );
                
                // Если есть текущая фигура, убедимся, что она корректно размещена
                if (this.currentPiece) {
                    // Проверяем, не выходит ли фигура за границы поля при инициализации
                    if (this.checkCollision(this.currentPiece)) {
                        // Если фигура сразу сталкивается с полем - игра окончена
                        this.gameOver = true;
                        this.isPlaying = false;
                    }
                }
            },
            
            // Отрисовка текущей фигуры на игровом поле (для отображения во время движения)
            drawCurrentPiece() {
                if (!this.currentPiece || !this.isPlaying) return;
                
                // Создаем временную копию поля для отрисовки
                const tempBoard = this.board.map(row => [...row]);
                
                for (let y = 0; y < this.currentPiece.shape.length; y++) {
                    for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                        if (this.currentPiece.shape[y][x] !== 0) {
                            const boardY = this.currentPiece.y + y;
                            const boardX = this.currentPiece.x + x;
                            
                            // Проверяем, что координаты находятся в пределах поля
                            if (boardY >= 0 && boardY < this.boardHeight &&
                                boardX >= 0 && boardX < this.boardWidth) {
                                tempBoard[boardY][boardX] = this.currentPiece.type;
                            }
                        }
                    }
                }
                
                return tempBoard;
            },
            
            // Генерация случайной фигуры
            getRandomPiece() {
                const pieces = Object.keys(this.pieces);
                const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
                return {
                    type: randomPiece,
                    shape: this.pieces[randomPiece].shape,
                    x: Math.floor(this.boardWidth / 2) - Math.floor(this.pieces[randomPiece].shape[0].length / 2),
                    y: 0
                };
            },
            
            // Проверка столкновения фигуры с границами или другими фигурами
            checkCollision(piece, board = this.board, offsetX = 0, offsetY = 0) {
                for (let y = 0; y < piece.shape.length; y++) {
                    for (let x = 0; x < piece.shape[y].length; x++) {
                        if (piece.shape[y][x] !== 0) {
                            const boardX = piece.x + x + offsetX;
                            const boardY = piece.y + y + offsetY;
                            
                            // Проверяем границы поля
                            if (
                                boardX < 0 || 
                                boardX >= this.boardWidth || 
                                boardY >= this.boardHeight
                            ) {
                                return true;
                            }
                            
                            // Проверяем столкновение с уже установленными фигурами
                            if (boardY >= 0 && board[boardY][boardX] !== 0) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
            
            // Вращение фигуры
            rotatePiece(piece) {
                const rotated = piece.shape[0].map((_, index) => 
                    piece.shape.map(row => row[index]).reverse()
                );
                
                return {
                    ...piece,
                    shape: rotated
                };
            },
            
            // Помещаем фигуру на поле
            placePiece() {
                if (!this.currentPiece) return;
                
                for (let y = 0; y < this.currentPiece.shape.length; y++) {
                    for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                        if (this.currentPiece.shape[y][x] !== 0) {
                            const boardY = this.currentPiece.y + y;
                            const boardX = this.currentPiece.x + x;
                            
                            // Не помещаем за пределы поля
                            if (boardY >= 0 && boardY < this.boardHeight && 
                                boardX >= 0 && boardX < this.boardWidth) {
                                this.board[boardY][boardX] = this.currentPiece.type;
                            }
                        }
                    }
                }
                
                // Проверяем заполненные линии
                this.clearLines();
                
                // Создаем новую фигуру
                this.currentPiece = this.nextPiece || this.getRandomPiece();
                this.nextPiece = this.getRandomPiece();
                
                // Проверяем, может ли новая фигура быть размещена (если нет - игра окончена)
                if (this.checkCollision(this.currentPiece)) {
                    this.gameOver = true;
                    this.isPlaying = false;
                }
            },
            
            // Очистка заполненных линий
            clearLines() {
                let linesCleared = 0;
                
                for (let y = this.boardHeight - 1; y >= 0; y--) {
                    if (this.board[y].every(cell => cell !== 0)) {
                        // Удаляем строку
                        this.board.splice(y, 1);
                        // Добавляем новую пустую строку сверху
                        this.board.unshift(Array(this.boardWidth).fill(0));
                        linesCleared++;
                        y++; // Проверяем ту же строку снова (так как она сдвинулась)
                    }
                }
                
                if (linesCleared > 0) {
                    // Обновляем счет
                    const points = [0, 40, 100, 300, 1200][linesCleared] * this.level;
                    this.score += points;
                    this.lines += linesCleared;
                    
                    // Уровень повышается каждые 10 линий
                    this.level = Math.floor(this.lines / 10) + 1;
                    this.dropTime = Math.max(100, 1000 - (this.level - 1) * 100);
                }
            },
            
            // Движение фигуры влево
            moveLeft() {
                if (!this.isPlaying || this.isPaused || this.gameOver) return;
                
                if (!this.checkCollision(this.currentPiece, this.board, -1, 0)) {
                    this.currentPiece.x -= 1;
                }
            },
            
            // Движение фигуры вправо
            moveRight() {
                if (!this.isPlaying || this.isPaused || this.gameOver) return;
                
                if (!this.checkCollision(this.currentPiece, this.board, 1, 0)) {
                    this.currentPiece.x += 1;
                }
            },
            
            // Движение фигуры вниз
            moveDown() {
                if (!this.isPlaying || this.isPaused || this.gameOver) return;
                
                if (!this.checkCollision(this.currentPiece, this.board, 0, 1)) {
                    this.currentPiece.y += 1;
                } else {
                    // Если не можем двигаться вниз - фиксируем фигуру
                    this.placePiece();
                }
            },
            
            // Быстрое падение фигуры
            hardDrop() {
                if (!this.isPlaying || this.isPaused || this.gameOver) return;
                
                while (!this.checkCollision(this.currentPiece, this.board, 0, 1)) {
                    this.currentPiece.y += 1;
                }
                this.placePiece();
            },
            
            // Вращение фигуры
            rotate() {
                if (!this.isPlaying || this.isPaused || this.gameOver) return;
                
                const rotated = this.rotatePiece(this.currentPiece);
                if (!this.checkCollision(rotated, this.board)) {
                    this.currentPiece = rotated;
                }
            },
            
            // Начало игры
            startGame() {
                this.initBoard();
                this.score = 0;
                this.level = 1;
                this.lines = 0;
                this.dropTime = 1000;
                this.gameOver = false;
                this.isPaused = false;
                
                // Создаем начальные фигуры
                this.currentPiece = this.getRandomPiece();
                this.nextPiece = this.getRandomPiece();
                
                // Убедимся, что фигура находится в правильной позиции (вверху)
                if (this.currentPiece) {
                    this.currentPiece.x = Math.floor(this.boardWidth / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
                    this.currentPiece.y = 0;
                }
                
                // Добавим небольшую задержку для отображения фигуры
                this.$nextTick(() => {
                    this.isPlaying = true;
                    this.gameStarted = true;
                    
                    if (this.gameStarted && this.isPlaying) {
                        this.startGameLoop();
                    }
                });
            },
            
            // Пауза/продолжение игры
            togglePause() {
                if (!this.isPlaying || this.gameOver) return;
                this.isPaused = !this.isPaused;
            },
            
            // Остановка игрового цикла
            stopGameLoop() {
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
            },
            
            // Запуск игрового цикла
            startGameLoop() {
                const update = (time = 0) => {
                    const deltaTime = time - this.lastTime;
                    
                    if (!this.isPaused && !this.gameOver) {
                        if (deltaTime > this.dropTime) {
                            this.moveDown();
                            this.lastTime = time;
                        }
                    }
                    
                    this.animationFrameId = requestAnimationFrame(update);
                };
                
                update();
            },
            
            
            // Сохранение состояния игры
            async saveGameState() {
                if (!this.windowId || !this.gameStarted) return;
                
                const state = {
                    appType: 'tetris',
                    board: this.board,
                    currentPiece: this.currentPiece,
                    nextPiece: this.nextPiece,
                    score: this.score,
                    level: this.level,
                    lines: this.lines,
                    isPlaying: this.isPlaying,
                    isPaused: this.isPaused,
                    gameOver: this.gameOver,
                    dropTime: this.dropTime,
                    gameStarted: this.gameStarted
                };
                
                await usersTable.windstates.updateVal(this.USERID, this.windowId, state);
            },
            
            // Загрузка состояния игры из IDB
            async loadGameState() {
                if (!this.windowId) return;
                
                const savedState = await usersTable.windstates.getById(this.USERID, this.windowId);
                if (savedState && savedState.appType === 'tetris') {
                    this.board = savedState.board || [];
                    this.currentPiece = savedState.currentPiece;
                    this.nextPiece = savedState.nextPiece;
                    this.score = savedState.score || 0;
                    this.level = savedState.level || 1;
                    this.lines = savedState.lines || 0;
                    this.isPlaying = savedState.isPlaying || false;
                    this.isPaused = savedState.isPaused || false;
                    this.gameOver = savedState.gameOver || false;
                    this.dropTime = savedState.dropTime || 1000;
                    this.gameStarted = savedState.gameStarted || false;
                }
            },
            
            // Обработка нажатий клавиш
            handleKeyDown(event) {
                // Если игра запущена и не находится в состоянии паузы, обрабатываем управление
                if (this.isPlaying && !this.gameOver) {
                    switch(event.key) {
                        case 'ArrowLeft':
                            event.preventDefault();
                            this.moveLeft();
                            break;
                        case 'ArrowRight':
                            event.preventDefault();
                            this.moveRight();
                            break;
                        case 'ArrowDown':
                            event.preventDefault();
                            this.moveDown();
                            break;
                        case 'ArrowUp':
                            event.preventDefault();
                            this.rotate();
                            break;
                        case ' ':
                            event.preventDefault();
                            this.hardDrop();
                            break;
                        case 'p':
                        case 'P':
                        case 'з':
                        case 'З':
                            event.preventDefault();
                            this.togglePause();
                            break;
                    }
                } else if (event.key === ' ') {
                    // Начать новую игру при нажатии пробела
                    if (!this.gameStarted || this.gameOver) {
                        this.startGame();
                    }
                }
            },
        },
        
        mounted() {
            console.log('OSITetris mounted with windowId:', this.windowId);
            
            // Скрываем заставку через 5 секунд
            setTimeout(() => {
                this.showSplash = false;
            }, 5000);
            
            // Добавляем обработчик клавиш
            window.addEventListener('keydown', this.handleKeyDown);
            
            // Инициализируем игровое поле
            this.initBoard();
            
            // Загружаем состояние игры если оно было сохранено
            this.$nextTick(async () => {
                await this.loadGameState();
                
                if (this.gameStarted && this.isPlaying) {
                    this.startGameLoop();
                }
            });
        },
        
        
        beforeUnmount() {
            window.removeEventListener('keydown', this.handleKeyDown);
            this.stopGameLoop();
        }
    }
</script>

<template src="./template.html">
</template>

<style src="./style.css"></style>