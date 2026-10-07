// Cyber Pong Game Module
window.CyberPongGame = {
    canvas: null,
    ctx: null,
    animId: null,
    score1: 0,
    score2: 0,
    maxScore: 7,
    mode: 'ai', // 'ai' or 'pvp'
    paused: false,
    gameOver: false,

    leftPad: { x: 20, y: 0, w: 14, h: 90, speed: 8 },
    rightPad: { x: 0, y: 0, w: 14, h: 90, speed: 8 },
    ball: { x: 0, y: 0, r: 8, vx: 5, vy: 3, speed: 6 },

    inputMode: 'keyboard', // 'keyboard' or 'mouse'
    keys: { w: false, s: false, up: false, down: false },
    mouseY: 0,

    init(container) {
        this.container = container;
        this.renderLayout();
        this.setupCanvas();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper cyber-pong-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">P1 SCORE: <span id="cp-score1" class="stat-value">0</span></div>
                    <div class="mode-select-group">
                        <button class="mode-btn active" data-mode="ai">VS AI</button>
                        <button class="mode-btn" data-mode="pvp">2 PLAYER</button>
                    </div>
                    <div class="stat-box">P2 SCORE: <span id="cp-score2" class="stat-value">0</span></div>
                    <button class="action-btn" id="cp-pause">PAUSE [SPACE]</button>
                    <button class="action-btn" id="cp-restart">RESET</button>
                </div>

                <div class="canvas-frame">
                    <canvas id="cp-canvas" width="720" height="460"></canvas>
                </div>

                <div class="pc-controls-hint">
                    <span>P1: <kbd>W</kbd> / <kbd>S</kbd> or <kbd>MOUSE</kbd></span>
                    <span>P2: <kbd>↑</kbd> / <kbd>↓</kbd></span>
                    <span><kbd>SPACE</kbd> Pause/Resume</span>
                </div>

                <div class="game-overlay-modal hidden" id="cp-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="cp-modal-title">CHAMPION VICTORY!</h2>
                        <p class="modal-sub" id="cp-modal-desc">Player 1 claimed match point.</p>
                        <button class="primary-btn" id="cp-modal-restart">PLAY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    setupCanvas() {
        this.canvas = this.container.querySelector('#cp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.rightPad.x = this.canvas.width - 34;
    },

    bindEvents() {
        const pauseBtn = this.container.querySelector('#cp-pause');
        const restartBtn = this.container.querySelector('#cp-restart');
        const modalRestart = this.container.querySelector('#cp-modal-restart');
        const modeBtns = this.container.querySelectorAll('.mode-btn');

        this.onKeyDown = (e) => {
            if (e.key === 'w' || e.key === 'W') { this.keys.w = true; this.inputMode = 'keyboard'; }
            if (e.key === 's' || e.key === 'S') { this.keys.s = true; this.inputMode = 'keyboard'; }
            if (e.key === 'ArrowUp') { this.keys.up = true; }
            if (e.key === 'ArrowDown') { this.keys.down = true; }
            if (e.key === ' ') {
                e.preventDefault();
                this.togglePause();
            }
        };

        this.onKeyUp = (e) => {
            if (e.key === 'w' || e.key === 'W') this.keys.w = false;
            if (e.key === 's' || e.key === 'S') this.keys.s = false;
            if (e.key === 'ArrowUp') this.keys.up = false;
            if (e.key === 'ArrowDown') this.keys.down = false;
        };

        this.onMouseMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseY = e.clientY - rect.top;
            this.inputMode = 'mouse';
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        this.canvas.addEventListener('mousemove', this.onMouseMove);

        pauseBtn.addEventListener('click', () => this.togglePause());
        restartBtn.addEventListener('click', () => this.startNewGame());
        modalRestart.addEventListener('click', () => {
            this.hideModal();
            this.startNewGame();
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.startNewGame();
            });
        });
    },

    startNewGame() {
        this.score1 = 0;
        this.score2 = 0;
        this.paused = false;
        this.gameOver = false;

        this.leftPad.y = (this.canvas.height - this.leftPad.h) / 2;
        this.rightPad.y = (this.canvas.height - this.rightPad.h) / 2;

        this.resetBall(1);
        this.updateUI();
        this.startLoop();
    },

    resetBall(direction = 1) {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        const angle = (-Math.PI / 4) + (Math.random() * Math.PI / 2);
        this.ball.speed = 6;
        this.ball.vx = direction * this.ball.speed * Math.cos(angle);
        this.ball.vy = this.ball.speed * Math.sin(angle);
    },

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const pauseBtn = this.container.querySelector('#cp-pause');
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

    update() {
        // Bug fix: separate keyboard vs mouse control explicitly so keyboard controls don't fight mouse
        if (this.keys.w) {
            this.leftPad.y = Math.max(0, this.leftPad.y - this.leftPad.speed);
        } else if (this.keys.s) {
            this.leftPad.y = Math.min(this.canvas.height - this.leftPad.h, this.leftPad.y + this.leftPad.speed);
        } else if (this.inputMode === 'mouse') {
            const targetY = this.mouseY - this.leftPad.h / 2;
            this.leftPad.y += (targetY - this.leftPad.y) * 0.2;
            this.leftPad.y = Math.max(0, Math.min(this.canvas.height - this.leftPad.h, this.leftPad.y));
        }

        // Player 2 or AI control
        if (this.mode === 'pvp') {
            if (this.keys.up) this.rightPad.y = Math.max(0, this.rightPad.y - this.rightPad.speed);
            if (this.keys.down) this.rightPad.y = Math.min(this.canvas.height - this.rightPad.h, this.rightPad.y + this.rightPad.speed);
        } else {
            // AI movement
            const targetY = this.ball.y - this.rightPad.h / 2;
            this.rightPad.y += (targetY - this.rightPad.y) * 0.1;
            this.rightPad.y = Math.max(0, Math.min(this.canvas.height - this.rightPad.h, this.rightPad.y));
        }

        // Ball movement
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Top/Bottom wall bounce
        if (this.ball.y - this.ball.r <= 0) {
            this.ball.y = this.ball.r;
            this.ball.vy *= -1;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        } else if (this.ball.y + this.ball.r >= this.canvas.height) {
            this.ball.y = this.canvas.height - this.ball.r;
            this.ball.vy *= -1;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        }

        // Left paddle collision (Bug fix: expand collision check by ball radius to fix corner tunneling)
        if (
            this.ball.x - this.ball.r <= this.leftPad.x + this.leftPad.w &&
            this.ball.x + this.ball.r >= this.leftPad.x &&
            this.ball.y + this.ball.r >= this.leftPad.y &&
            this.ball.y - this.ball.r <= this.leftPad.y + this.leftPad.h &&
            this.ball.vx < 0
        ) {
            this.ball.speed = Math.min(14, this.ball.speed + 0.4);
            const hitPos = (this.ball.y - (this.leftPad.y + this.leftPad.h / 2)) / (this.leftPad.h / 2);
            const angle = hitPos * (Math.PI / 3);

            // Bug fix: clamp minimum horizontal velocity to prevent vertical trajectory stalling
            this.ball.vx = Math.max(3.0, this.ball.speed * Math.cos(angle));
            this.ball.vy = this.ball.speed * Math.sin(angle);
            if (window.arcadeAudio) window.arcadeAudio.pop();
        }

        // Right paddle collision
        if (
            this.ball.x + this.ball.r >= this.rightPad.x &&
            this.ball.x - this.ball.r <= this.rightPad.x + this.rightPad.w &&
            this.ball.y + this.ball.r >= this.rightPad.y &&
            this.ball.y - this.ball.r <= this.rightPad.y + this.rightPad.h &&
            this.ball.vx > 0
        ) {
            this.ball.speed = Math.min(14, this.ball.speed + 0.4);
            const hitPos = (this.ball.y - (this.rightPad.y + this.rightPad.h / 2)) / (this.rightPad.h / 2);
            const angle = hitPos * (Math.PI / 3);

            this.ball.vx = -Math.max(3.0, this.ball.speed * Math.cos(angle));
            this.ball.vy = this.ball.speed * Math.sin(angle);
            if (window.arcadeAudio) window.arcadeAudio.pop();
        }

        // Scoring logic
        if (this.ball.x + this.ball.r < 0) {
            this.score2++;
            if (window.arcadeAudio) window.arcadeAudio.score();
            this.updateUI();
            if (this.score2 >= this.maxScore) {
                this.handleEndGame(2);
            } else {
                this.resetBall(1);
            }
        } else if (this.ball.x - this.ball.r > this.canvas.width) {
            this.score1++;
            if (window.arcadeAudio) window.arcadeAudio.score();
            this.updateUI();
            if (this.score1 >= this.maxScore) {
                this.handleEndGame(1);
            } else {
                this.resetBall(-1);
            }
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Center line
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([12, 12]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Left Paddle
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(this.leftPad.x, this.leftPad.y, this.leftPad.w, this.leftPad.h);

        // Right Paddle
        this.ctx.fillStyle = '#ff0055';
        this.ctx.shadowColor = '#ff0055';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(this.rightPad.x, this.rightPad.y, this.rightPad.w, this.rightPad.h);

        // Ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 12;
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;
    },

    updateUI() {
        const s1 = this.container.querySelector('#cp-score1');
        const s2 = this.container.querySelector('#cp-score2');
        if (s1) s1.textContent = this.score1;
        if (s2) s2.textContent = this.score2;
    },

    handleEndGame(winner) {
        this.gameOver = true;
        if (winner === 1) {
            if (window.arcadeAudio) window.arcadeAudio.win();
            if (window.ArcadeHub) window.ArcadeHub.updateHighScore('cyber-pong', this.score1 * 100);
        } else {
            if (window.arcadeAudio) window.arcadeAudio.lose();
        }

        const modal = this.container.querySelector('#cp-modal');
        const titleEl = this.container.querySelector('#cp-modal-title');
        const descEl = this.container.querySelector('#cp-modal-desc');

        if (titleEl) titleEl.textContent = `PLAYER ${winner} WINS!`;
        if (descEl) descEl.textContent = winner === 1 ? 'Dominant paddle performance!' : 'Better luck next match!';
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#cp-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.gameOver = true;
        if (this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
        if (this.canvas) this.canvas.removeEventListener('mousemove', this.onMouseMove);
    }
};
