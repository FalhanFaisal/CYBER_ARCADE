// Snake & Ladder Cyber Edition Module
window.SnakeLadderGame = {
    currentSession: 0,
    players: [],
    turn: 0,
    isRolling: false,
    mode: 'vs-ai', // 'vs-ai' or 'pvp'
    numPlayers: 2,

    snakes: { 16: 6, 48: 26, 62: 19, 88: 24, 95: 56, 99: 78 },
    ladders: { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 100 },
    colors: ['#00f3ff', '#ff0055', '#39ff14', '#ffe600'],

    init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.startNewGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper snake-ladder-wrapper">
                <div class="game-header-bar">
                    <div class="mode-select-group">
                        <button class="mode-btn active" data-mode="vs-ai">VS AI</button>
                        <button class="mode-btn" data-mode="pvp">2 PLAYER</button>
                    </div>
                    <div class="stat-box" id="sl-turn-status">PLAYER 1 TURN</div>
                    <button class="action-btn" id="sl-restart">RESET</button>
                </div>

                <div class="sl-main-container">
                    <div class="sl-board-wrap">
                        <div class="sl-board" id="sl-board"></div>
                    </div>

                    <div class="sl-controls-panel">
                        <div class="sl-dice-area">
                            <div class="sl-dice" id="sl-dice" tabindex="0">🎲</div>
                            <button class="primary-btn" id="sl-roll-btn">ROLL DICE [SPACE]</button>
                        </div>
                        <div class="sl-players-status" id="sl-players-list"></div>
                    </div>
                </div>

                <div class="game-overlay-modal hidden" id="sl-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="sl-modal-title">VICTORY REACHED!</h2>
                        <p class="modal-sub" id="sl-modal-desc">Player 1 reached Cell 100 first!</p>
                        <button class="primary-btn" id="sl-modal-restart">PLAY AGAIN</button>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const rollBtn = this.container.querySelector('#sl-roll-btn');
        const diceEl = this.container.querySelector('#sl-dice');
        const restartBtn = this.container.querySelector('#sl-restart');
        const modalRestart = this.container.querySelector('#sl-modal-restart');
        const modeBtns = this.container.querySelectorAll('.mode-btn');

        this.onKeyDown = (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.handleRollClick();
            }
        };

        window.addEventListener('keydown', this.onKeyDown);
        rollBtn.addEventListener('click', () => this.handleRollClick());
        diceEl.addEventListener('click', () => this.handleRollClick());

        restartBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.startNewGame();
        });

        modalRestart.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.hideModal();
            this.startNewGame();
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.arcadeAudio) window.arcadeAudio.click();
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
                this.startNewGame();
            });
        });
    },

    startNewGame() {
        // Bug fix: increment session token to invalidate ongoing async AI turn loops
        this.currentSession++;
        this.isRolling = false;
        this.turn = 0;

        if (this.mode === 'vs-ai') {
            this.players = [
                { id: 1, name: 'Player 1', pos: 1, isAI: false, color: this.colors[0] },
                { id: 2, name: 'Cyber AI', pos: 1, isAI: true, color: this.colors[1] }
            ];
        } else {
            this.players = [
                { id: 1, name: 'Player 1', pos: 1, isAI: false, color: this.colors[0] },
                { id: 2, name: 'Player 2', pos: 1, isAI: false, color: this.colors[1] }
            ];
        }

        this.buildBoard();
        this.updatePlayersUI();
        this.updateTurnUI();
    },

    buildBoard() {
        const boardEl = this.container.querySelector('#sl-board');
        boardEl.innerHTML = '';

        for (let row = 9; row >= 0; row--) {
            const isReverse = (9 - row) % 2 === 1;
            for (let col = 0; col < 10; col++) {
                const cellNum = isReverse ? row * 10 + (10 - col) : row * 10 + col + 1;
                const cell = document.createElement('div');
                cell.className = 'sl-cell';
                cell.dataset.cell = cellNum;

                let badge = '';
                if (this.snakes[cellNum]) badge = `<span class="sl-badge snake">🐍 ${this.snakes[cellNum]}</span>`;
                if (this.ladders[cellNum]) badge = `<span class="sl-badge ladder">🪜 ${this.ladders[cellNum]}</span>`;

                cell.innerHTML = `
                    <span class="sl-num">${cellNum}</span>
                    ${badge}
                    <div class="sl-tokens-container" id="sl-tokens-${cellNum}"></div>
                `;
                boardEl.appendChild(cell);
            }
        }
        this.renderTokens();
    },

    renderTokens() {
        // Clear all token containers
        for (let i = 1; i <= 100; i++) {
            const el = this.container.querySelector(`#sl-tokens-${i}`);
            if (el) el.innerHTML = '';
        }

        this.players.forEach(p => {
            const el = this.container.querySelector(`#sl-tokens-${p.pos}`);
            if (el) {
                const token = document.createElement('div');
                token.className = 'sl-token';
                token.style.background = p.color;
                token.title = p.name;
                el.appendChild(token);
            }
        });
    },

    handleRollClick() {
        if (this.isRolling) return;
        const currentP = this.players[this.turn];
        if (currentP.isAI) return; // AI takes turn automatically

        this.executeTurn();
    },

    async executeTurn() {
        const sessionToken = this.currentSession;
        this.isRolling = true;

        const currentP = this.players[this.turn];
        const diceEl = this.container.querySelector('#sl-dice');
        const rollBtn = this.container.querySelector('#sl-roll-btn');
        if (rollBtn) rollBtn.disabled = true;

        // Dice roll animation
        const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        for (let i = 0; i < 8; i++) {
            if (this.currentSession !== sessionToken) return; // Session check bug fix
            diceEl.textContent = diceFaces[Math.floor(Math.random() * 6)];
            if (window.arcadeAudio) window.arcadeAudio.pop();
            await new Promise(r => setTimeout(r, 60));
        }

        const rollVal = Math.floor(Math.random() * 6) + 1;
        diceEl.textContent = diceFaces[rollVal - 1];

        // Move player
        let targetPos = currentP.pos + rollVal;
        if (targetPos <= 100) {
            currentP.pos = targetPos;
            this.renderTokens();
            if (window.arcadeAudio) window.arcadeAudio.bounce();
            await new Promise(r => setTimeout(r, 350));
        }

        // Check snake or ladder
        if (this.snakes[currentP.pos]) {
            currentP.pos = this.snakes[currentP.pos];
            if (window.arcadeAudio) window.arcadeAudio.hit();
            this.renderTokens();
            await new Promise(r => setTimeout(r, 400));
        } else if (this.ladders[currentP.pos]) {
            currentP.pos = this.ladders[currentP.pos];
            if (window.arcadeAudio) window.arcadeAudio.score();
            this.renderTokens();
            await new Promise(r => setTimeout(r, 400));
        }

        if (this.currentSession !== sessionToken) return; // Session check bug fix

        // Win check
        if (currentP.pos === 100) {
            this.handleEndGame(currentP);
            return;
        }

        // Next turn
        this.turn = (this.turn + 1) % this.players.length;
        this.updateTurnUI();
        this.updatePlayersUI();
        this.isRolling = false;
        if (rollBtn) rollBtn.disabled = false;

        // If next player is AI, trigger AI turn safely
        const nextP = this.players[this.turn];
        if (nextP.isAI) {
            await new Promise(r => setTimeout(r, 700));
            if (this.currentSession === sessionToken) {
                this.executeTurn();
            }
        }
    },

    updateTurnUI() {
        const currentP = this.players[this.turn];
        const statusEl = this.container.querySelector('#sl-turn-status');
        if (statusEl) {
            statusEl.textContent = `${currentP.name.toUpperCase()}'S TURN`;
            statusEl.style.color = currentP.color;
        }
    },

    updatePlayersUI() {
        const listEl = this.container.querySelector('#sl-players-list');
        if (!listEl) return;
        listEl.innerHTML = this.players.map((p, i) => `
            <div class="sl-player-card ${i === this.turn ? 'active' : ''}">
                <div class="player-color-dot" style="background: ${p.color}"></div>
                <div class="player-info">
                    <span class="p-name">${p.name}</span>
                    <span class="p-pos">CELL ${p.pos}</span>
                </div>
            </div>
        `).join('');
    },

    handleEndGame(winner) {
        if (window.arcadeAudio) {
            if (!winner.isAI) window.arcadeAudio.win();
            else window.arcadeAudio.lose();
        }

        if (!winner.isAI && window.ArcadeHub) {
            window.ArcadeHub.updateHighScore('snake-ladder', 500);
        }

        const modal = this.container.querySelector('#sl-modal');
        const titleEl = this.container.querySelector('#sl-modal-title');
        const descEl = this.container.querySelector('#sl-modal-desc');

        if (titleEl) titleEl.textContent = `${winner.name.toUpperCase()} VICTORY!`;
        if (descEl) descEl.textContent = `${winner.name} successfully reached Cell 100!`;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#sl-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() {
        this.currentSession++;
        window.removeEventListener('keydown', this.onKeyDown);
    }
};
