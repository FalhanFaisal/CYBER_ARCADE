// Tap Trap Cyber Whacker Module
window.TapTrapGame = {
    timer: null,
    moleTimer: null,
    nextMoleTimer: null,
    score: 0,
    lives: 3,
    timeLeft: 30,
    isPlaying: false,
    paused: false,
    lastHole: null,

    init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.resetGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper tap-trap-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">SCORE: <span id="tt-score" class="stat-value">0</span></div>
                    <div class="stat-box">TIME: <span id="tt-time" class="stat-value">30s</span></div>
                    <div class="stat-box">LIVES: <span id="tt-lives" class="stat-value">❤️❤️❤️</span></div>
                    <button class="action-btn" id="tt-pause">PAUSE [P]</button>
                    <button class="action-btn" id="tt-start">START GAME</button>
                </div>

                <div class="tt-grid-container">
                    <div class="tt-grid">
                        ${Array(9).fill(0).map((_, i) => `
                            <div class="tt-hole" data-index="${i}">
                                <span class="tt-key-badge">${i + 1}</span>
                                <div class="tt-mole">
                                    <div class="tt-mole-face">👾</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="pc-controls-hint">
                    <span><kbd>1-9</kbd> or <kbd>QWE/ASD/ZXC</kbd> or <kbd>CLICK</kbd> Whack Invaders!</span>
                    <span><kbd>P</kbd> Pause/Resume</span>
                    <span>Avoid Bombs 💣!</span>
                </div>

                <div class="game-overlay-modal hidden" id="tt-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="tt-modal-title">PURGE COMPLETE!</h2>
                        <p class="modal-sub">Final Score: <strong id="tt-final-score">0</strong></p>
                        <button class="primary-btn" id="tt-play-again">PLAY AGAIN [SPACE]</button>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const startBtn = this.container.querySelector('#tt-start');
        const pauseBtn = this.container.querySelector('#tt-pause');
        const playAgainBtn = this.container.querySelector('#tt-play-again');
        const holes = this.container.querySelectorAll('.tt-hole');

        this.onKeyDown = (e) => {
            if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
                if (e.repeat) return;
                e.preventDefault();
                const modal = this.container.querySelector('#tt-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.hideModal();
                    this.startNewGame();
                } else if (!this.isPlaying) {
                    this.startNewGame();
                } else if (e.key === 'p' || e.key === 'P') {
                    this.togglePause();
                }
                return;
            }

            if (e.key === 'Enter') {
                const modal = this.container.querySelector('#tt-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    e.preventDefault();
                    this.hideModal();
                    this.startNewGame();
                }
                return;
            }

            if (!this.isPlaying || this.paused) return;

            // Direct PC desktop keyboard whack hotkeys: 1-9 and QWE/ASD/ZXC
            const keyMap = {
                '1': 0, '2': 1, '3': 2,
                '4': 3, '5': 4, '6': 5,
                '7': 6, '8': 7, '9': 8,
                'q': 0, 'w': 1, 'e': 2,
                'a': 3, 's': 4, 'd': 5,
                'z': 6, 'x': 7, 'c': 8
            };
            const index = keyMap[e.key.toLowerCase()];
            if (index !== undefined) {
                e.preventDefault();
                const targetHole = holes[index];
                if (targetHole) {
                    const mole = targetHole.querySelector('.tt-mole');
                    if (mole && mole.classList.contains('up')) {
                        this.whackMole(targetHole, mole);
                    }
                }
            }
        };

        window.addEventListener('keydown', this.onKeyDown);

        startBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.startNewGame();
        });

        pauseBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.togglePause();
        });

        playAgainBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.hideModal();
            this.startNewGame();
        });

        holes.forEach(hole => {
            hole.addEventListener('click', () => {
                if (!this.isPlaying || this.paused) return;
                const mole = hole.querySelector('.tt-mole');
                if (mole && mole.classList.contains('up')) {
                    this.whackMole(hole, mole);
                }
            });
        });
    },

    togglePause() {
        if (!this.isPlaying) return;
        this.paused = !this.paused;
        const pauseBtn = this.container.querySelector('#tt-pause');
        if (pauseBtn) pauseBtn.textContent = this.paused ? 'RESUME [P]' : 'PAUSE [P]';

        if (this.paused) {
            this.stopTimers();
        } else {
            this.startMainTimer();
            this.popMole();
        }
    },

    startNewGame() {
        this.stopTimers();
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 30;
        this.isPlaying = true;

        this.updateUI();
        this.startMainTimer();
        this.popMole();
    },

    resetGame() {
        this.stopTimers();
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 30;
        this.isPlaying = false;
        this.updateUI();
        const holes = this.container.querySelectorAll('.tt-mole');
        holes.forEach(m => m.classList.remove('up', 'bomb', 'whacked'));
    },

    popMole() {
        if (!this.isPlaying) return;

        const holes = this.container.querySelectorAll('.tt-hole');
        const randomIndex = Math.floor(Math.random() * holes.length);
        const hole = holes[randomIndex];

        if (hole === this.lastHole) {
            this.popMole();
            return;
        }
        this.lastHole = hole;

        const mole = hole.querySelector('.tt-mole');
        const face = mole.querySelector('.tt-mole-face');

        const isBomb = Math.random() < 0.22;
        mole.classList.remove('bomb', 'whacked');
        if (isBomb) {
            mole.classList.add('bomb');
            if (face) face.textContent = '💣';
        } else {
            if (face) face.textContent = ['👾', '🛸', '🤖', '👾'][Math.floor(Math.random() * 4)];
        }

        mole.classList.add('up');

        const popTime = Math.max(500, 1100 - (30 - this.timeLeft) * 20);

        this.moleTimer = setTimeout(() => {
            mole.classList.remove('up');
            if (this.isPlaying) this.popMole();
        }, popTime);
    },

    whackMole(hole, mole) {
        if (mole.classList.contains('whacked')) return;
        mole.classList.add('whacked');
        mole.classList.remove('up');

        if (this.moleTimer) {
            clearTimeout(this.moleTimer);
            this.moleTimer = null;
        }

        if (mole.classList.contains('bomb')) {
            if (window.arcadeAudio) window.arcadeAudio.hit();
            this.lives--;
            this.updateUI();
            if (this.lives <= 0) {
                this.handleGameOver();
                return;
            }
        } else {
            if (window.arcadeAudio) window.arcadeAudio.pop();
            this.score += 10;
            this.updateUI();
        }

        // Bug fix: pop next mole safely without overlapping timers
        if (this.nextMoleTimer) {
            clearTimeout(this.nextMoleTimer);
            this.nextMoleTimer = null;
        }

        if (this.isPlaying && !this.paused) {
            this.nextMoleTimer = setTimeout(() => {
                this.nextMoleTimer = null;
                this.popMole();
            }, 100);
        }
    },

    startMainTimer() {
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateUI();
            if (this.timeLeft <= 0) {
                this.handleGameOver();
            }
        }, 1000);
    },

    stopTimers() {
        if (this.timer) clearInterval(this.timer);
        if (this.moleTimer) clearTimeout(this.moleTimer);
        if (this.nextMoleTimer) clearTimeout(this.nextMoleTimer);
        this.timer = null;
        this.moleTimer = null;
        this.nextMoleTimer = null;
    },

    updateUI() {
        const scoreEl = this.container.querySelector('#tt-score');
        const timeEl = this.container.querySelector('#tt-time');
        const livesEl = this.container.querySelector('#tt-lives');

        if (scoreEl) scoreEl.textContent = this.score;
        if (timeEl) timeEl.textContent = `${this.timeLeft}s`;
        // Bug fix: clamp lives count to >= 0 to avoid RangeError
        if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, this.lives));
    },

    handleGameOver() {
        this.isPlaying = false;
        this.stopTimers();
        if (window.arcadeAudio) window.arcadeAudio.win();
        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('tap-trap', this.score);

        const modal = this.container.querySelector('#tt-modal');
        const finalScore = this.container.querySelector('#tt-final-score');
        if (finalScore) finalScore.textContent = this.score;
        if (modal) {
            modal.classList.remove('hidden');
            const playAgainBtn = modal.querySelector('#tt-play-again');
            if (playAgainBtn) playAgainBtn.focus();
        }
    },

    hideModal() {
        const modal = this.container.querySelector('#tt-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.isPlaying = false;
        this.stopTimers();
        window.removeEventListener('keydown', this.onKeyDown);
        this.hideModal();
    }
};
