function tank() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <h2>Tank</h2>
        <div id="tank-arena" style="width: 600px; height: 400px; background-color: #8B4513;">
            <!-- Tank game arena will be created here -->
        </div>
        <p>Use WASD to move and space to shoot.</p>
    `;
    // Add Tank game logic here
    console.log("Tank game started");
}