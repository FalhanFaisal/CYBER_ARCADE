// Cyber Invaders Game Module
window.CyberInvadersGame = {
    canvas: null,
    ctx: null,
    animId: null,
    score: 0,
    lives: 3,
    state: 'idle', // 'idle', 'playing', 'paused', 'gameover', 'victory'

    player: { x: 0, y: 0, w: 40, h: 24, speed: 6 },
    bullets: [],
    alienBullets: [],
    aliens: [],
    alienDirection: 1, // 1 for right, -1 for left
    alienSpeed: 1,
    baseAlienSpeed: 1,
    lastAlienShoot: 0,
    keys: { left: false, right: false, space: false },

    init(container) {
        this.container = container;
        this.renderLayout();
        this.setupCanvas();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper cyber-invaders-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">SCORE: <span id="ci-score" class="stat-value">0</span></div>
                    <div class="stat-box">LIVES: <span id="ci-lives" class="stat-value">❤️❤️❤️</span></div>
                    <button class="action-btn" id="ci-pause">PAUSE [SPACE]</button>
                    <button class="action-btn" id="ci-restart">RESET</button>
                </div>

                <div class="canvas-frame">
                    <canvas id="ci-canvas" width="640" height="480"></canvas>
                </div>

                <div class="pc-controls-hint">
                    <span><kbd>←</kbd> / <kbd>→</kbd> or <kbd>A</kbd> / <kbd>D</kbd> Move Ship</span>
                    <span><kbd>SPACE</kbd> / <kbd>↑</kbd> Shoot Plasma Cannon</span>
                </div>

                <div class="game-overlay-modal hidden" id="ci-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="ci-modal-title">FLEET OVERRUN!</h2>
                        <p class="modal-sub">Final Score: <strong id="ci-final-score">0</strong></p>
                        <button class="primary-btn" id="ci-modal-restart">PLAY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    setupCanvas() {
        this.canvas = this.container.querySelector('#ci-canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    bindEvents() {
        const pauseBtn = this.container.querySelector('#ci-pause');
        const restartBtn = this.container.querySelector('#ci-restart');
        const modalRestart = this.container.querySelector('#ci-modal-restart');

        this.onKeyDown = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                if (this.state === 'playing') {
                    this.firePlayerBullet();
                } else if (this.state === 'paused') {
                    this.togglePause();
                }
            }
        };

        this.onKeyUp = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        };

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);

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
        this.state = 'playing';

        this.player.x = (this.canvas.width - this.player.w) / 2;
        this.player.y = this.canvas.height - 40;

        this.bullets = [];
        this.alienBullets = [];
        this.buildAlienGrid();

        this.updateUI();
        this.startLoop();
    },

    buildAlienGrid() {
        this.aliens = [];
        const rows = 4;
        const cols = 8;
        const padding = 16;
        const alienW = 34;
        const alienH = 24;
        const offsetLeft = (this.canvas.width - (cols * (alienW + padding) - padding)) / 2;

        const types = ['boss', 'medium', 'medium', 'grunt'];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.aliens.push({
                    x: offsetLeft + c * (alienW + padding),
                    y: 40 + r * (alienH + padding),
                    w: alienW,
                    h: alienH,
                    alive: true,
                    type: types[r],
                    points: (4 - r) * 10
                });
            }
        }

        this.alienDirection = 1;
        this.baseAlienSpeed = 1;
        this.alienSpeed = 1;
    },

    firePlayerBullet() {
        // Bug fix: strict state check to prevent firing in non-playing state
        if (this.state !== 'playing') return;
        if (this.bullets.length >= 3) return; // Max 3 active player bullets

        if (window.arcadeAudio) window.arcadeAudio.shoot();
        this.bullets.push({
            x: this.player.x + this.player.w / 2 - 2,
            y: this.player.y - 10,
            w: 4,
            h: 12,
            speed: 8
        });
    },

    togglePause() {
        if (this.state === 'gameover' || this.state === 'victory') return;
        if (this.state === 'playing') {
            this.state = 'paused';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.startLoop();
        }
        const pauseBtn = this.container.querySelector('#ci-pause');
        if (pauseBtn) pauseBtn.textContent = this.state === 'paused' ? 'RESUME [SPACE]' : 'PAUSE [SPACE]';
    },

    startLoop() {
        if (this.animId) cancelAnimationFrame(this.animId);
        const loop = () => {
            if (this.state === 'playing') {
                this.update();
                this.draw();
                this.animId = requestAnimationFrame(loop);
            }
        };
        this.animId = requestAnimationFrame(loop);
    },

    update() {
        // Move player
        if (this.keys.left) this.player.x = Math.max(10, this.player.x - this.player.speed);
        if (this.keys.right) this.player.x = Math.min(this.canvas.width - 10 - this.player.w, this.player.x + this.player.speed);

        // Move player bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.y -= b.speed;
            if (b.y < -10) this.bullets.splice(i, 1);
        }

        // Move alien bullets
        for (let i = this.alienBullets.length - 1; i >= 0; i--) {
            const ab = this.alienBullets[i];
            ab.y += ab.speed;

            // Player hit check
            if (
                ab.x < this.player.x + this.player.w &&
                ab.x + ab.w > this.player.x &&
                ab.y < this.player.y + this.player.h &&
                ab.y + ab.h > this.player.y
            ) {
                this.alienBullets.splice(i, 1);
                this.lives--;
                if (window.arcadeAudio) window.arcadeAudio.hit();
                this.updateUI();

                if (this.lives <= 0) {
                    this.handleGameOver(false);
                    return;
                }
                continue;
            }

            if (ab.y > this.canvas.height + 10) this.alienBullets.splice(i, 1);
        }

        // Alien fleet movement and speedup calculation
        const livingAliens = this.aliens.filter(a => a.alive);
        if (livingAliens.length === 0) {
            this.handleGameOver(true);
            return;
        }

        // Bug fix: dynamically increase alien speed as invaders die
        const totalAliens = 32;
        const destroyedRatio = (totalAliens - livingAliens.length) / totalAliens;
        this.alienSpeed = this.baseAlienSpeed + destroyedRatio * 2.5;

        let edgeHit = false;
        for (const a of livingAliens) {
            if (
                (this.alienDirection === 1 && a.x + a.w >= this.canvas.width - 15) ||
                (this.alienDirection === -1 && a.x <= 15)
            ) {
                edgeHit = true;
                break;
            }
        }

        // Bug fix: avoid edge oscillation by shifting inward and stepping down cleanly
        if (edgeHit) {
            this.alienDirection *= -1;
            for (const a of livingAliens) {
                a.y += 14;
                a.x += this.alienDirection * 4; // Shift inward
                if (a.y + a.h >= this.player.y) {
                    this.handleGameOver(false);
                    return;
                }
            }
        } else {
            for (const a of livingAliens) {
                a.x += this.alienDirection * this.alienSpeed;
            }
        }

        // Alien firing logic
        const now = Date.now();
        if (now - this.lastAlienShoot > Math.max(700, 1800 - (32 - livingAliens.length) * 30)) {
            const shooter = livingAliens[Math.floor(Math.random() * livingAliens.length)];
            this.alienBullets.push({
                x: shooter.x + shooter.w / 2 - 2,
                y: shooter.y + shooter.h,
                w: 4,
                h: 10,
                speed: 4
            });
            this.lastAlienShoot = now;
        }

        // Bullet vs Alien collision
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            for (const a of livingAliens) {
                if (b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) {
                    a.alive = false;
                    this.score += a.points;
                    this.bullets.splice(i, 1);
                    if (window.arcadeAudio) window.arcadeAudio.pop();
                    this.updateUI();
                    break;
                }
            }
        }
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Player
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(this.player.x, this.player.y + 8, this.player.w, this.player.h - 8);
        this.ctx.fillRect(this.player.x + this.player.w / 2 - 4, this.player.y, 8, 8);

        // Draw Player Bullets
        this.ctx.fillStyle = '#39ff14';
        this.ctx.shadowColor = '#39ff14';
        this.ctx.shadowBlur = 8;
        for (const b of this.bullets) {
            this.ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        // Draw Alien Bullets
        this.ctx.fillStyle = '#ff0055';
        this.ctx.shadowColor = '#ff0055';
        for (const ab of this.alienBullets) {
            this.ctx.fillRect(ab.x, ab.y, ab.w, ab.h);
        }

        // Draw Aliens
        for (const a of this.aliens) {
            if (!a.alive) continue;
            let color = '#bf00ff';
            if (a.type === 'boss') color = '#ff0055';
            if (a.type === 'medium') color = '#ffe600';

            this.ctx.fillStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 8;

            this.ctx.fillRect(a.x + 4, a.y, a.w - 8, a.h);
            this.ctx.fillRect(a.x, a.y + 6, a.w, a.h - 12);
            // Eyes
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(a.x + 8, a.y + 8, 4, 4);
            this.ctx.fillRect(a.x + a.w - 12, a.y + 8, 4, 4);
        }
        this.ctx.shadowBlur = 0;
    },

    updateUI() {
        const scoreEl = this.container.querySelector('#ci-score');
        const livesEl = this.container.querySelector('#ci-lives');
        if (scoreEl) scoreEl.textContent = this.score;
        // Bug fix: clamp lives to >= 0 to avoid RangeError
        if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
    },

    handleGameOver(victory = false) {
        this.state = victory ? 'victory' : 'gameover';
        if (victory) {
            if (window.arcadeAudio) window.arcadeAudio.win();
            this.score += 500;
        } else {
            if (window.arcadeAudio) window.arcadeAudio.lose();
        }

        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('cyber-invaders', this.score);

        const modal = this.container.querySelector('#ci-modal');
        const titleEl = this.container.querySelector('#ci-modal-title');
        const finalScore = this.container.querySelector('#ci-final-score');

        if (titleEl) titleEl.textContent = victory ? 'SYSTEM PURIFIED! VICTORY!' : 'FLEET OVERRUN!';
        if (finalScore) finalScore.textContent = this.score;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#ci-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.state = 'idle';
        if (this.animId) cancelAnimationFrame(this.animId);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
};
