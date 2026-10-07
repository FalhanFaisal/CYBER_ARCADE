// Brick Smash Game Module
window.BrickSmashGame = {
    canvas: null,
    ctx: null,
    animId: null,
    score: 0,
    lives: 3,
    level: 1,
    paused: false,
    gameOver: false,

    paddle: { x: 0, w: 100, h: 14, speed: 8 },
    ball: { x: 0, y: 0, r: 8, dx: 4, dy: -4, speed: 5 },
    bricks: [],
    keys: { left: false, right: false },

    init(container) {
        this.container = container;
        this.renderLayout();
        this.setupCanvas();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper brick-smash-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">SCORE: <span id="bs-score" class="stat-value">0</span></div>
                    <div class="stat-box">LIVES: <span id="bs-lives" class="stat-value">❤️❤️❤️</span></div>
                    <div class="stat-box">LEVEL: <span id="bs-level" class="stat-value">1</span></div>
                    <button class="action-btn" id="bs-pause">PAUSE [SPACE]</button>
                    <button class="action-btn" id="bs-restart">RESET</button>
                </div>

                <div class="canvas-frame">
                    <canvas id="bs-canvas" width="700" height="460"></canvas>
                </div>

                <div class="pc-controls-hint">
                    <span><kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> Move Paddle</span>
                    <span><kbd>MOUSE</kbd> Move Paddle</span>
                    <span><kbd>SPACE</kbd> Pause/Resume</span>
                </div>

                <div class="game-overlay-modal hidden" id="bs-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="bs-modal-title">GAME OVER</h2>
                        <p class="modal-sub">Final Score: <strong id="bs-final-score">0</strong></p>
                        <button class="primary-btn" id="bs-modal-restart">PLAY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    setupCanvas() {
        this.canvas = this.container.querySelector('#bs-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    bindEvents() {
        const pauseBtn = this.container.querySelector('#bs-pause');
        const restartBtn = this.container.querySelector('#bs-restart');
        const modalRestart = this.container.querySelector('#bs-modal-restart');

        this.onKeyDown = (e) => {
            if (e.repeat) return; // Prevent spacebar repeat loop bug
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === ' ') {
                e.preventDefault();
                this.togglePause();
            }
        };

        this.onKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        };

        this.onMouseMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.w, mouseX - this.paddle.w / 2));
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
    },

    startNewGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.paused = false;

        this.resetLevel();
        this.updateUI();
        this.startLoop();
    },

    resetLevel() {
        this.paddle.w = Math.max(70, 110 - this.level * 5);
        this.paddle.x = (this.canvas.width - this.paddle.w) / 2;

        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 40;
        const angle = (-Math.PI / 4) + (Math.random() * Math.PI / 2);
        const speed = 5 + this.level * 0.5;
        this.ball.dx = speed * Math.sin(angle);
        this.ball.dy = -speed * Math.cos(angle);

        this.buildBricks();
    },

    buildBricks() {
        const rows = 4 + Math.min(3, this.level);
        const cols = 8;
        const padding = 8;
        const offsetTop = 40;
        const offsetLeft = 25;
        const brickW = (this.canvas.width - offsetLeft * 2 - (cols - 1) * padding) / cols;
        const brickH = 18;

        const colors = ['#00f3ff', '#ff007f', '#39ff14', '#ffe600', '#bf00ff'];

        this.bricks = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.bricks.push({
                    x: offsetLeft + c * (brickW + padding),
                    y: offsetTop + r * (brickH + padding),
                    w: brickW,
                    h: brickH,
                    alive: true,
                    color: colors[r % colors.length]
                });
            }
        }
    },

    togglePause() {
        if (this.gameOver) return;
        this.paused = !this.paused;
        const pauseBtn = this.container.querySelector('#bs-pause');
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
        // Move paddle
        if (this.keys.left) this.paddle.x = Math.max(0, this.paddle.x - this.paddle.speed);
        if (this.keys.right) this.paddle.x = Math.min(this.canvas.width - this.paddle.w, this.paddle.x + this.paddle.speed);

        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall collisions
        if (this.ball.x - this.ball.r <= 0) {
            this.ball.x = this.ball.r;
            this.ball.dx *= -1;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        } else if (this.ball.x + this.ball.r >= this.canvas.width) {
            this.ball.x = this.canvas.width - this.ball.r;
            this.ball.dx *= -1;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        }

        if (this.ball.y - this.ball.r <= 0) {
            this.ball.y = this.ball.r;
            this.ball.dy *= -1;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        }

        // Paddle collision
        if (
            this.ball.y + this.ball.r >= this.canvas.height - this.paddle.h - 10 &&
            this.ball.y - this.ball.r <= this.canvas.height - 10 &&
            this.ball.x + this.ball.r >= this.paddle.x &&
            this.ball.x - this.ball.r <= this.paddle.x + this.paddle.w &&
            this.ball.dy > 0
        ) {
            const hitPos = (this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
            const speed = Math.hypot(this.ball.dx, this.ball.dy);
            const angle = hitPos * (Math.PI / 3);
            this.ball.dx = speed * Math.sin(angle);
            this.ball.dy = -Math.abs(speed * Math.cos(angle));
            if (window.arcadeAudio) window.arcadeAudio.bounce();
        }

        // Bottom border (Life lost)
        if (this.ball.y + this.ball.r >= this.canvas.height) {
            this.lives--;
            if (window.arcadeAudio) window.arcadeAudio.hit();
            this.updateUI();

            if (this.lives <= 0) {
                this.handleGameOver();
            } else {
                this.ball.x = this.paddle.x + this.paddle.w / 2;
                this.ball.y = this.canvas.height - 40;
                this.ball.dy = -Math.abs(this.ball.dy);
            }
        }

        // Brick collision (Fix side vs top penetration depth bug)
        let bricksRemaining = 0;
        for (const b of this.bricks) {
            if (!b.alive) continue;
            bricksRemaining++;

            if (
                this.ball.x + this.ball.r > b.x &&
                this.ball.x - this.ball.r < b.x + b.w &&
                this.ball.y + this.ball.r > b.y &&
                this.ball.y - this.ball.r < b.y + b.h
            ) {
                b.alive = false;
                this.score += 10;
                this.updateUI();
                if (window.arcadeAudio) window.arcadeAudio.pop();

                // Calculate overlap depth to decide horizontal vs vertical bounce
                const overlapLeft = (this.ball.x + this.ball.r) - b.x;
                const overlapRight = (b.x + b.w) - (this.ball.x - this.ball.r);
                const overlapTop = (this.ball.y + this.ball.r) - b.y;
                const overlapBottom = (b.y + b.h) - (this.ball.y - this.ball.r);

                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapX < minOverlapY) {
                    this.ball.dx *= -1;
                } else {
                    this.ball.dy *= -1;
                }

                break;
            }
        }

        if (bricksRemaining === 0) {
            this.level++;
            if (window.arcadeAudio) window.arcadeAudio.score();
            this.resetLevel();
            this.updateUI();
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bricks
        for (const b of this.bricks) {
            if (!b.alive) continue;
            this.ctx.fillStyle = b.color;
            this.ctx.shadowColor = b.color;
            this.ctx.shadowBlur = 8;
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
            this.ctx.shadowBlur = 0;
        }

        // Draw paddle
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 12;
        this.ctx.fillRect(this.paddle.x, this.canvas.height - this.paddle.h - 10, this.paddle.w, this.paddle.h);

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.closePath();
        this.ctx.shadowBlur = 0;
    },

    updateUI() {
        const scoreEl = this.container.querySelector('#bs-score');
        const livesEl = this.container.querySelector('#bs-lives');
        const levelEl = this.container.querySelector('#bs-level');
        if (scoreEl) scoreEl.textContent = this.score;
        if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
        if (levelEl) levelEl.textContent = this.level;
    },

    handleGameOver() {
        this.gameOver = true;
        if (window.arcadeAudio) window.arcadeAudio.lose();
        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('brick-smash', this.score);

        const modal = this.container.querySelector('#bs-modal');
        const finalScore = this.container.querySelector('#bs-final-score');
        if (finalScore) finalScore.textContent = this.score;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#bs-modal');
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
