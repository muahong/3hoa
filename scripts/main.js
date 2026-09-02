// This file can contain shared functionality across games

function loadGame(gameName) {
    console.log("Loading game:", gameName);
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';

    if (gameName === 'tetris') {
        tetris();
    } else if (gameName === 'tank') {
        tank();
    } else if (gameName === 'pacman') {
        pacman();
    } else {
        console.error("Unknown game:", gameName);
    }
}