// Cyber Racer (Car Game) Module
window.CyberRacerGame = {
    canvas: null,
    ctx: null,
    animId: null,
    score: 0,
    speed: 5,
    gameOver: false,
    paused: false,

    player: { x: 0, y: 0, w: 40, h: 70, speed: 6 },
    obstacles: [],
    roadOffset: 0,
    keys: { left: false, right: false, up: false, down: false },
    lastSpawn: 0,

    init(container) {
        this.container = container;
        this.renderLayout();
        this.setupCanvas();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper cyber-racer-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">SCORE: <span id="cr-score" class="stat-value">0</span></div>
                    <div class="stat-box">SPEED: <span id="cr-speed" class="stat-value">120 KM/H</span></div>
                    <button class="action-btn" id="cr-pause">PAUSE [SPACE]</button>
                    <button class="action-btn" id="cr-restart">RESET</button>
                </div>

                <div class="canvas-frame">
                    <canvas id="cr-canvas" width="480" height="600"></canvas>
                </div>

                <div class="pc-controls-hint">
                    <span><kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> Steer Left/Right</span>
                    <span><kbd>↑</kbd> / <kbd>W</kbd> Boost Speed</span>
                    <span><kbd>SPACE</kbd> Pause/Resume</span>
                </div>

                <div class="game-overlay-modal hidden" id="cr-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="cr-modal-title">HIGHWAY CRASH!</h2>
                        <p class="modal-sub">Final Score: <strong id="cr-final-score">0</strong></p>
                        <button class="primary-btn" id="cr-modal-restart">RACE AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    setupCanvas() {
        this.canvas = this.container.querySelector('#cr-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    bindEvents() {
        const pauseBtn = this.container.querySelector('#cr-pause');
        const restartBtn = this.container.querySelector('#cr-restart');
        const modalRestart = this.container.querySelector('#cr-modal-restart');

        this.onKeyDown = (e) => {
            if (e.repeat) return;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
            if (e.key === ' ') {
                e.preventDefault();
                this.togglePause();
            }
        };

        this.onKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
        };

        // Bug fix: clear keypress state on window blur (e.g. Alt-Tab)
        this.onBlur = () => {
            this.keys.left = false;
            this.keys.right = false;
            this.keys.up = false;
            this.keys.down = false;
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.onBlur);

        pauseBtn.addEventListener('click', () => this.togglePause());
        restartBtn.addEventListener('click', () => this.startNewGame());
        modalRestart.addEventListener('click', () => {
            this.hideModal();
            this.startNewGame();
        });
    },

    startNewGame() {
        this.score = 0;
        this.speed = 5;
        this.gameOver = false;
        this.paused = false;

        this.player.w = 40;
        this.player.h = 70;
        this.player.x = (this.canvas.width - this.player.w) / 2;
        this.player.y = this.canvas.height - 100;

        this.obstacles = [];
        this.lastSpawn = Date.now();

        this.updateUI();
        this.startLoop();
    },

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const pauseBtn = this.container.querySelector('#cr-pause');
        if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME [SPACE]' : 'PAUSE [SPACE]';
        if (!this.paused) this.startLoop();
    },

    startLoop() {
        if (this.animId) cancelAnimationFrame(this.animId);
        const loop = () => {
            if (!this.paused && !this.gameOver) {
                this.update();
                this.draw();
                this.animId = requestAnimationFrame(loop);
            }
        };
        this.animId = requestAnimationFrame(loop);
    },

    spawnObstacle() {
        const laneWidth = (this.canvas.width - 60) / 4; // 4 lanes with 30px side borders
        const occupiedLanes = new Set(this.obstacles.filter(o => o.y < 220).map(o => o.lane));
        const choices = [0, 1, 2, 3].filter(l => !occupiedLanes.has(l));

        // Bug fix: guard against empty choices when all lanes are occupied
        if (!choices.length) return;

        const lane = choices[Math.floor(Math.random() * choices.length)];
        const x = 30 + lane * laneWidth + (laneWidth - 38) / 2;
        const colors = ['#ff0055', '#ff9900', '#00ffcc', '#bf00ff'];

        this.obstacles.push({
            lane,
            x,
            y: -80,
            w: 38,
            h: 68,
            speed: 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    },

    update() {
        const effectiveSpeed = this.keys.up ? this.speed * 1.6 : (this.keys.down ? this.speed * 0.6 : this.speed);
        this.roadOffset = (this.roadOffset + effectiveSpeed) % 40;

        // Move player
        if (this.keys.left) this.player.x = Math.max(30, this.player.x - this.player.speed);
        if (this.keys.right) this.player.x = Math.min(this.canvas.width - 30 - this.player.w, this.player.x + this.player.speed);

        // Spawn obstacles
        const now = Date.now();
        if (now - this.lastSpawn > Math.max(600, 1500 - this.score * 5)) {
            this.spawnObstacle();
            this.lastSpawn = now;
        }

        // Move obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += effectiveSpeed - obs.speed;

            // Collision check
            if (
                this.player.x < obs.x + obs.w - 4 &&
                this.player.x + this.player.w > obs.x + 4 &&
                this.player.y < obs.y + obs.h - 4 &&
                this.player.y + this.player.h > obs.y + 4
            ) {
                this.handleGameOver();
                return;
            }

            // Passed obstacle score
            if (obs.y > this.canvas.height) {
                this.obstacles.splice(i, 1);
                this.score += 10;
                if (this.score % 50 === 0) this.speed += 0.5;
                if (window.arcadeAudio) window.arcadeAudio.score();
                this.updateUI();
            }
        }
    },

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a14';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw side borders
        this.ctx.fillStyle = '#ff0055';
        this.ctx.fillRect(0, 0, 30, this.canvas.height);
        this.ctx.fillRect(this.canvas.width - 30, 0, 30, this.canvas.height);

        // Draw dashed road lines
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([20, 20]);
        this.ctx.lineDashOffset = -this.roadOffset;

        const laneWidth = (this.canvas.width - 60) / 4;
        for (let i = 1; i < 4; i++) {
            const x = 30 + i * laneWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);

        // Draw obstacles
        for (const obs of this.obstacles) {
            this.ctx.fillStyle = obs.color;
            this.ctx.shadowColor = obs.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(obs.x + 4, obs.y + 10, obs.w - 8, 14);
            this.ctx.shadowBlur = 0;
        }

        // Draw player car
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 14;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
        // Windshield
        this.ctx.fillStyle = '#000022';
        this.ctx.fillRect(this.player.x + 5, this.player.y + 15, this.player.w - 10, 16);
        // Headlights
        this.ctx.fillStyle = '#ffe600';
        this.ctx.fillRect(this.player.x + 4, this.player.y + 2, 8, 6);
        this.ctx.fillRect(this.player.x + this.player.w - 12, this.player.y + 2, 8, 6);
        this.ctx.shadowBlur = 0;
    },

    updateUI() {
        const scoreEl = this.container.querySelector('#cr-score');
        const speedEl = this.container.querySelector('#cr-speed');
        if (scoreEl) scoreEl.textContent = this.score;
        if (speedEl) speedEl.textContent = `${Math.round(80 + this.speed * 12)} KM/H`;
    },

    handleGameOver() {
        this.gameOver = true;
        if (window.arcadeAudio) window.arcadeAudio.hit();
        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('cyber-racer', this.score);

        const modal = this.container.querySelector('#cr-modal');
        const finalScore = this.container.querySelector('#cr-final-score');
        if (finalScore) finalScore.textContent = this.score;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#cr-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.gameOver = true;
        if (this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onBlur);
    }
};
