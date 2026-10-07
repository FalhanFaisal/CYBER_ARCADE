// Retro Aero Dodge Game Module
window.RetroAeroGame = {
    canvas: null,
    ctx: null,
    animId: null,
    score: 0,
    paused: false,
    gameOver: false,

    rocket: { x: 80, y: 0, w: 32, h: 22, vy: 0, gravity: 0.45, flap: -8 },
    pipes: [],
    pipeWidth: 54,
    pipeGap: 140,
    lastPipeSpawn: 0,

    init(container) {
        this.container = container;
        this.renderLayout();
        this.setupCanvas();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper retro-aero-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">SCORE: <span id="ra-score" class="stat-value">0</span></div>
                    <button class="action-btn" id="ra-pause">PAUSE [SPACE]</button>
                    <button class="action-btn" id="ra-restart">RESET</button>
                </div>

                <div class="canvas-frame">
                    <canvas id="ra-canvas" width="600" height="480"></canvas>
                </div>

                <div class="pc-controls-hint">
                    <span><kbd>SPACE</kbd> or <kbd>↑</kbd> or <kbd>CLICK</kbd> Thrust Rocket Up</span>
                </div>

                <div class="game-overlay-modal hidden" id="ra-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="ra-modal-title">ROCKET CRASHED!</h2>
                        <p class="modal-sub">Final Score: <strong id="ra-final-score">0</strong></p>
                        <button class="primary-btn" id="ra-modal-restart">FLY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    setupCanvas() {
        this.canvas = this.container.querySelector('#ra-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    bindEvents() {
        const pauseBtn = this.container.querySelector('#ra-pause');
        const restartBtn = this.container.querySelector('#ra-restart');
        const modalRestart = this.container.querySelector('#ra-modal-restart');

        this.onKeyDown = (e) => {
            if (e.repeat) return;
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                if (!this.paused && !this.gameOver) {
                    this.flap();
                } else if (this.paused) {
                    this.togglePause();
                }
            }
        };

        this.onCanvasClick = () => {
            if (!this.paused && !this.gameOver) {
                this.flap();
            }
        };

        window.addEventListener('keydown', this.onKeyDown);
        this.canvas.addEventListener('click', this.onCanvasClick);

        pauseBtn.addEventListener('click', () => this.togglePause());
        restartBtn.addEventListener('click', () => this.startNewGame());
        modalRestart.addEventListener('click', () => {
            this.hideModal();
            this.startNewGame();
        });
    },

    startNewGame() {
        this.score = 0;
        this.paused = false;
        this.gameOver = false;

        this.rocket.y = this.canvas.height / 2;
        this.rocket.vy = 0;
        this.pipes = [];
        this.lastPipeSpawn = Date.now();

        this.updateUI();
        this.startLoop();
    },

    flap() {
        this.rocket.vy = this.rocket.flap;
        if (window.arcadeAudio) window.arcadeAudio.pop();
    },

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const pauseBtn = this.container.querySelector('#ra-pause');
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

    spawnPipe() {
        const minTop = 50;
        const maxTop = this.canvas.height - this.pipeGap - 50;
        const topH = minTop + Math.floor(Math.random() * (maxTop - minTop));

        this.pipes.push({
            x: this.canvas.width + 10,
            topH,
            bottomY: topH + this.pipeGap,
            passed: false
        });
    },

    update() {
        // Rocket gravity
        this.rocket.vy += this.rocket.gravity;
        this.rocket.y += this.rocket.vy;

        // Ground / Ceiling crash
        if (this.rocket.y + this.rocket.h >= this.canvas.height || this.rocket.y <= 0) {
            this.handleGameOver();
            return;
        }

        // Spawn pipes
        const now = Date.now();
        if (now - this.lastPipeSpawn > 1400) {
            this.spawnPipe();
            this.lastPipeSpawn = now;
        }

        // Move pipes & collision check
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= 3.2;

            // Bug fix: match pipe collision boundary with visual 4px cap flange width
            const capMargin = 4;
            const rx = this.rocket.x;
            const ry = this.rocket.y;
            const rw = this.rocket.w;
            const rh = this.rocket.h;

            if (rx + rw > p.x - capMargin && rx < p.x + this.pipeWidth + capMargin) {
                if (ry < p.topH || ry + rh > p.bottomY) {
                    this.handleGameOver();
                    return;
                }
            }

            // Score pipe
            if (!p.passed && p.x + this.pipeWidth < rx) {
                p.passed = true;
                this.score += 1;
                if (window.arcadeAudio) window.arcadeAudio.score();
                this.updateUI();
            }

            if (p.x < -this.pipeWidth - 20) {
                this.pipes.splice(i, 1);
            }
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Pipes with caps
        for (const p of this.pipes) {
            this.ctx.fillStyle = '#39ff14';
            this.ctx.shadowColor = '#39ff14';
            this.ctx.shadowBlur = 8;

            // Top pipe
            this.ctx.fillRect(p.x, 0, this.pipeWidth, p.topH - 12);
            this.ctx.fillRect(p.x - 4, p.topH - 12, this.pipeWidth + 8, 12); // Top flange cap

            // Bottom pipe
            this.ctx.fillRect(p.x, p.bottomY + 12, this.pipeWidth, this.canvas.height - p.bottomY - 12);
            this.ctx.fillRect(p.x - 4, p.bottomY, this.pipeWidth + 8, 12); // Bottom flange cap
        }
        this.ctx.shadowBlur = 0;

        // Draw Rocket facing right (Bug fix: orient default rocket graphics forward/right)
        this.ctx.save();
        this.ctx.translate(this.rocket.x + this.rocket.w / 2, this.rocket.y + this.rocket.h / 2);
        const rotation = Math.max(-0.4, Math.min(0.6, this.rocket.vy * 0.08));
        this.ctx.rotate(rotation);

        // Rocket body
        this.ctx.fillStyle = '#ff0055';
        this.ctx.shadowColor = '#ff0055';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Nose cone facing right
        this.ctx.fillStyle = '#ffe600';
        this.ctx.beginPath();
        this.ctx.moveTo(12, -6);
        this.ctx.lineTo(20, 0);
        this.ctx.lineTo(12, 6);
        this.ctx.closePath();
        this.ctx.fill();

        // Cockpit window
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.beginPath();
        this.ctx.arc(4, -2, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Thruster flame
        if (this.rocket.vy < 0) {
            this.ctx.fillStyle = '#ff9900';
            this.ctx.beginPath();
            this.ctx.moveTo(-16, -5);
            this.ctx.lineTo(-24, 0);
            this.ctx.lineTo(-16, 5);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.restore();
        this.ctx.shadowBlur = 0;
    },

    updateUI() {
        const scoreEl = this.container.querySelector('#ra-score');
        if (scoreEl) scoreEl.textContent = this.score;
    },

    handleGameOver() {
        this.gameOver = true;
        if (window.arcadeAudio) window.arcadeAudio.hit();
        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('retro-aero', this.score * 50);

        const modal = this.container.querySelector('#ra-modal');
        const finalScore = this.container.querySelector('#ra-final-score');
        if (finalScore) finalScore.textContent = this.score;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#ra-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.gameOver = true;
        if (this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.onKeyDown);
        if (this.canvas) this.canvas.removeEventListener('click', this.onCanvasClick);
    }
};
