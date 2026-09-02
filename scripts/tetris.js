function tetris() {
    // Add these lines at the beginning of the function
    document.body.classList.add('game-active');
    
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>Tetris</h2>
        <canvas id="tetris-board" width="300" height="600"></canvas>
        <div id="game-info">
            <p>Score: <span id="score">0</span></p>
            <p>Level: <span id="level">1</span></p>
            <p>Lines: <span id="lines">0</span></p>
        </div>
        <p>Use arrow keys to move and rotate pieces.</p>
    `;

    const canvas = document.getElementById('tetris-board');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;

    // Tetromino shapes
    const SHAPES = [
        [[1, 1, 1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1, 1], [0, 1, 0]],
        [[1, 1, 1], [1, 0, 0]],
        [[1, 1, 1], [0, 0, 1]],
        [[1, 1, 0], [0, 1, 1]],
        [[0, 1, 1], [1, 1, 0]]
    ];

    const COLORS = ['cyan', 'yellow', 'purple', 'blue', 'orange', 'green', 'red'];

    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let score = 0;
    let level = 1;
    let lines = 0;

    function createPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        const shape = SHAPES[shapeIndex];
        const color = COLORS[shapeIndex];
        const x = Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2);
        const y = 0;

        return { shape, color, x, y };
    }

    function drawBoard() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = COLORS[value - 1];
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#fff';
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    function drawPiece() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = currentPiece.color;
                    ctx.fillRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#fff';
                    ctx.strokeRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    function moveDown() {
        currentPiece.y++;
        if (collision()) {
            currentPiece.y--;
            merge();
            clearLines();
            currentPiece = createPiece();
            if (collision()) {
                // Game over
                alert('Game Over!');
                board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
                score = 0;
                level = 1;
                lines = 0;
                updateScore();
            }
        }
    }

    function moveLeft() {
        currentPiece.x--;
        if (collision()) {
            currentPiece.x++;
        }
    }

    function moveRight() {
        currentPiece.x++;
        if (collision()) {
            currentPiece.x--;
        }
    }

    function rotate() {
        const rotated = currentPiece.shape[0].map((_, i) =>
            currentPiece.shape.map(row => row[i]).reverse()
        );
        const previousShape = currentPiece.shape;
        currentPiece.shape = rotated;
        if (collision()) {
            currentPiece.shape = previousShape;
        }
    }

    function collision() {
        return currentPiece.shape.some((row, dy) =>
            row.some((value, dx) =>
                value &&
                (currentPiece.y + dy >= ROWS ||
                    currentPiece.x + dx < 0 ||
                    currentPiece.x + dx >= COLS ||
                    board[currentPiece.y + dy][currentPiece.x + dx])
            )
        );
    }

    function merge() {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    board[currentPiece.y + y][currentPiece.x + x] = COLORS.indexOf(currentPiece.color) + 1;
                }
            });
        });
    }

    function clearLines() {
        let linesCleared = 0;
        board = board.filter(row => {
            if (row.every(cell => cell !== 0)) {
                linesCleared++;
                return false;
            }
            return true;
        });

        while (board.length < ROWS) {
            board.unshift(Array(COLS).fill(0));
        }

        if (linesCleared > 0) {
            lines += linesCleared;
            score += linesCleared * linesCleared * 100;
            level = Math.floor(lines / 10) + 1;
            updateScore();
        }
    }

    function updateScore() {
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }

    function gameLoop() {
        drawBoard();
        drawPiece();
        requestAnimationFrame(gameLoop);
    }

    // Modify the event listener to prevent default behavior
    document.addEventListener('keydown', event => {
        // Prevent default action for arrow keys
        if([37, 38, 39, 40].indexOf(event.keyCode) > -1) {
            event.preventDefault();
        }

        switch (event.keyCode) {
            case 37: // Left arrow
                moveLeft();
                break;
            case 39: // Right arrow
                moveRight();
                break;
            case 40: // Down arrow
                moveDown();
                break;
            case 38: // Up arrow
                rotate();
                break;
        }
    });

    currentPiece = createPiece();
    gameLoop();

    setInterval(() => {
        moveDown();
    }, 1000 / level);

    console.log("Tetris game started");

    // Add this line at the end of the function
    return () => document.body.classList.remove('game-active');
}