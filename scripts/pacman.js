function pacman() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>Pacman</h2>
        <canvas id="pacman-board" width="420" height="465"></canvas>
        <p>Score: <span id="score">0</span></p>
        <p>Use arrow keys to move Pacman.</p>
    `;

    const canvas = document.getElementById('pacman-board');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');

    const CELL_SIZE = 15;
    const PACMAN_SIZE = 10;
    const ROWS = 31;
    const COLS = 28;

    let pacmanX = 1;
    let pacmanY = 1;
    let pacmanDirection = 0; // 0: right, 1: down, 2: left, 3: up
    let score = 0;
    let mouthOpen = true;

    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
        [1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const ghosts = [
        { x: 13, y: 11, color: 'red', direction: 0 },
        { x: 14, y: 11, color: 'pink', direction: 1 },
        { x: 13, y: 12, color: 'cyan', direction: 2 },
        { x: 14, y: 12, color: 'orange', direction: 3 }
    ];

    let ghostMoveTimer = 0;
    const ghostMoveInterval = 500; // Move ghosts every 500ms

    function drawMaze() {
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (maze[row][col] === 1) {
                    ctx.fillStyle = 'blue';
                    ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else if (maze[row][col] === 0) {
                    ctx.fillStyle = 'yellow';
                    ctx.beginPath();
                    ctx.arc(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    function drawPacman() {
        ctx.save();
        ctx.translate(
            pacmanX * CELL_SIZE + CELL_SIZE / 2,
            pacmanY * CELL_SIZE + CELL_SIZE / 2
        );
        ctx.rotate(pacmanDirection * Math.PI / 2);

        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        const mouthAngle = mouthOpen ? 0.2 * Math.PI : 0.05 * Math.PI;
        ctx.arc(0, 0, PACMAN_SIZE, mouthAngle, 2 * Math.PI - mouthAngle);
        ctx.lineTo(0, 0);
        ctx.fill();

        ctx.restore();
    }

    function drawGhosts() {
        ghosts.forEach(ghost => {
            ctx.fillStyle = ghost.color;
            ctx.beginPath();
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2,
                ghost.y * CELL_SIZE + CELL_SIZE / 2,
                PACMAN_SIZE,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2 - 3,
                ghost.y * CELL_SIZE + CELL_SIZE / 2 - 3,
                3,
                0,
                Math.PI * 2
            );
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2 + 3,
                ghost.y * CELL_SIZE + CELL_SIZE / 2 - 3,
                3,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2 - 3,
                ghost.y * CELL_SIZE + CELL_SIZE / 2 - 3,
                1,
                0,
                Math.PI * 2
            );
            ctx.arc(
                ghost.x * CELL_SIZE + CELL_SIZE / 2 + 3,
                ghost.y * CELL_SIZE + CELL_SIZE / 2 - 3,
                1,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
    }

    function isCellOccupied(x, y) {
        return ghosts.some(ghost => ghost.x === x && ghost.y === y);
    }

    function moveGhosts() {
        ghosts.forEach(ghost => {
            const directions = [
                { x: 0, y: -1 }, // Up
                { x: 0, y: 1 },  // Down
                { x: -1, y: 0 }, // Left
                { x: 1, y: 0 }   // Right
            ];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const newX = ghost.x + direction.x;
            const newY = ghost.y + direction.y;
            if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && maze[newY][newX] !== 1 && !isCellOccupied(newX, newY)) {
                ghost.x = newX;
                ghost.y = newY;
            }
        });
    }

    function moveUp() {
        if (pacmanY > 0 && maze[pacmanY - 1][pacmanX] !== 1) {
            pacmanY--;
            pacmanDirection = 3;
        }
    }

    function moveDown() {
        if (pacmanY < ROWS - 1 && maze[pacmanY + 1][pacmanX] !== 1) {
            pacmanY++;
            pacmanDirection = 1;
        }
    }

    function moveLeft() {
        if (pacmanX > 0 && maze[pacmanY][pacmanX - 1] !== 1) {
            pacmanX--;
            pacmanDirection = 2;
        }
    }

    function moveRight() {
        if (pacmanX < COLS - 1 && maze[pacmanY][pacmanX + 1] !== 1) {
            pacmanX++;
            pacmanDirection = 0;
        }
    }

    function handleKeyPress(e) {
        e.preventDefault();
        switch(e.key) {
            case 'ArrowUp': moveUp(); break;
            case 'ArrowDown': moveDown(); break;
            case 'ArrowLeft': moveLeft(); break;
            case 'ArrowRight': moveRight(); break;
        }
    }

    function update(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMaze();
        drawPacman();
        drawGhosts();

        if (timestamp - ghostMoveTimer > ghostMoveInterval) {
            moveGhosts();
            ghostMoveTimer = timestamp;
        }

        if (maze[pacmanY][pacmanX] === 0) {
            maze[pacmanY][pacmanX] = 2;
            score += 10;
            scoreElement.textContent = score;
        }
        mouthOpen = !mouthOpen; // Toggle mouth state for animation
    }

    function gameLoop(timestamp) {
        update(timestamp);
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', handleKeyPress);
    gameLoop();
}