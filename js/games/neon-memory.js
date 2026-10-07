// Neon Memory Game Module
window.NeonMemoryGame = {
    timer: null,
    mismatchTimer: null,
    seconds: 0,
    moves: 0,
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 8,
    isLocked: false,
    currentDiff: 'medium',

    icons: [
        '⚡', '⚡', '🛸', '🛸', '👾', '👾', '🌀', '🌀',
        '💎', '💎', '🔥', '🔥', '🔮', '🔮', '✨', '✨',
        '🚀', '🚀', '⭐', '⭐', '🌌', '🌌', '💥', '💥'
    ],

    diffConfigs: {
        easy: { pairs: 6, cols: 4 },
        medium: { pairs: 8, cols: 4 },
        hard: { pairs: 12, cols: 6 }
    },

    init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.startNewGame('medium');
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper neon-memory-wrapper">
                <div class="game-header-bar">
                    <div class="stat-box">TIME: <span id="nm-time" class="stat-value">00:00</span></div>
                    <div class="stat-box">MOVES: <span id="nm-moves" class="stat-value">0</span></div>
                    <div class="diff-selector">
                        <button class="diff-btn" data-diff="easy">EASY</button>
                        <button class="diff-btn active" data-diff="medium">MED</button>
                        <button class="diff-btn" data-diff="hard">HARD</button>
                    </div>
                    <button class="action-btn" id="nm-restart">NEW GAME</button>
                </div>

                <div class="nm-board-container">
                    <div class="nm-board grid-medium" id="nm-board"></div>
                </div>

                <div class="game-overlay-modal hidden" id="nm-win-modal" aria-hidden="true">
                    <div class="modal-card">
                        <h2 class="neon-title">MEMORY SYNCHRONIZED!</h2>
                        <p class="modal-sub">You matched all cards successfully.</p>
                        <div class="modal-stats">
                            <p>Time: <strong id="nm-final-time">00:00</strong></p>
                            <p>Moves: <strong id="nm-final-moves">0</strong></p>
                        </div>
                        <button class="primary-btn" id="nm-modal-restart">PLAY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const restartBtn = this.container.querySelector('#nm-restart');
        const modalRestart = this.container.querySelector('#nm-modal-restart');
        const diffBtns = this.container.querySelectorAll('.diff-btn');

        restartBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.startNewGame(this.currentDiff);
        });

        modalRestart.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.hideWinModal();
            this.startNewGame(this.currentDiff);
        });

        diffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (window.arcadeAudio) window.arcadeAudio.click();
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.startNewGame(btn.dataset.diff);
            });
        });
    },

    startNewGame(diff) {
        this.currentDiff = diff;
        this.totalPairs = this.diffConfigs[diff].pairs;
        
        // Clear pending mismatch timer bug fix
        if (this.mismatchTimer) {
            clearTimeout(this.mismatchTimer);
            this.mismatchTimer = null;
        }

        this.stopTimer();
        this.seconds = 0;
        this.moves = 0;
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isLocked = false;

        this.updateStatsUI();
        this.buildBoard();
        this.startTimer();
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    buildBoard() {
        const board = this.container.querySelector('#nm-board');
        board.className = `nm-board grid-${this.currentDiff}`;
        board.innerHTML = '';

        const selectedIcons = this.icons.slice(0, this.totalPairs * 2);
        this.shuffle(selectedIcons);

        selectedIcons.forEach((iconSymbol, index) => {
            const card = document.createElement('div');
            card.className = 'nm-card';
            card.dataset.symbol = iconSymbol;
            card.dataset.index = index;
            card.setAttribute('tabindex', '0');

            card.innerHTML = `
                <div class="nm-card-inner">
                    <div class="nm-card-front">${iconSymbol}</div>
                    <div class="nm-card-back">⚡</div>
                </div>
            `;

            card.addEventListener('click', () => this.handleCardClick(card));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCardClick(card);
                }
            });

            board.appendChild(card);
        });
    },

    handleCardClick(card) {
        if (this.isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) {
            return;
        }

        if (window.arcadeAudio) window.arcadeAudio.pop();

        card.classList.add('flipped');
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStatsUI();
            this.checkMatch();
        }
    },

    checkMatch() {
        const [card1, card2] = this.flippedCards;
        const symbol1 = card1.dataset.symbol;
        const symbol2 = card2.dataset.symbol;

        if (symbol1 === symbol2) {
            if (window.arcadeAudio) window.arcadeAudio.match();
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.flippedCards = [];
            this.matchedPairs++;

            if (this.matchedPairs === this.totalPairs) {
                this.handleWin();
            }
        } else {
            this.isLocked = true;
            // Target mismatch on card-inner / card-front properly (Bug fix)
            card1.classList.add('mismatch');
            card2.classList.add('mismatch');

            this.mismatchTimer = setTimeout(() => {
                card1.classList.remove('flipped', 'mismatch');
                card2.classList.remove('flipped', 'mismatch');
                this.flippedCards = [];
                this.isLocked = false;
                this.mismatchTimer = null;
            }, 700);
        }
    },

    startTimer() {
        this.timer = setInterval(() => {
            this.seconds++;
            this.updateStatsUI();
        }, 1000);
    },

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    updateStatsUI() {
        const timeEl = this.container.querySelector('#nm-time');
        const movesEl = this.container.querySelector('#nm-moves');
        if (timeEl) timeEl.textContent = this.formatTime(this.seconds);
        if (movesEl) movesEl.textContent = this.moves;
    },

    formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    handleWin() {
        this.stopTimer();
        if (window.arcadeAudio) window.arcadeAudio.win();

        const score = Math.max(10, 1000 - (this.seconds * 5 + this.moves * 10));
        if (window.ArcadeHub) window.ArcadeHub.updateHighScore('neon-memory', score);

        const modal = this.container.querySelector('#nm-win-modal');
        const finalTime = this.container.querySelector('#nm-final-time');
        const finalMoves = this.container.querySelector('#nm-final-moves');

        if (finalTime) finalTime.textContent = this.formatTime(this.seconds);
        if (finalMoves) finalMoves.textContent = this.moves;
        
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    },

    hideWinModal() {
        const modal = this.container.querySelector('#nm-win-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    destroy() {
        this.stopTimer();
        if (this.mismatchTimer) clearTimeout(this.mismatchTimer);
    }
};
