// Tic-Tac-Toe Game Module
window.TicTacToeGame = {
    board: Array(9).fill(""),
    currentPlayer: "X",
    gameActive: true,
    gameMode: "ai", // "ai" or "pvp"
    aiDifficulty: "medium", // "easy", "medium", "hard"
    scores: { X: 0, O: 0, ties: 0 },

    winPatterns: [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ],

    init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.resetGame();
    },

    renderLayout() {
        this.container.innerHTML = `
            <div class="game-wrapper tictactoe-wrapper">
                <div class="game-header-bar">
                    <div class="mode-select-group">
                        <button class="mode-btn active" data-mode="ai">VS AI</button>
                        <button class="mode-btn" data-mode="pvp">2 PLAYER</button>
                    </div>
                    <div class="diff-select-group" id="ttt-diff-group">
                        <button class="diff-btn active" data-diff="easy">EASY</button>
                        <button class="diff-btn" data-diff="medium">MED</button>
                        <button class="diff-btn" data-diff="hard">HARD</button>
                    </div>
                    <button class="action-btn" id="ttt-restart">RESTART</button>
                </div>

                <div class="ttt-status-bar" id="ttt-status">PLAYER X TURN</div>

                <div class="ttt-board-wrap">
                    <div class="ttt-board" id="ttt-board">
                        ${Array(9).fill(0).map((_, i) => `<div class="ttt-cell" data-index="${i}" tabindex="0"></div>`).join('')}
                    </div>
                </div>

                <div class="ttt-score-board">
                    <div class="score-card">PLAYER X (X): <span id="ttt-score-x">0</span></div>
                    <div class="score-card">TIES: <span id="ttt-score-ties">0</span></div>
                    <div class="score-card">PLAYER O (O): <span id="ttt-score-o">0</span></div>
                </div>

                <div class="game-overlay-modal hidden" id="ttt-modal">
                    <div class="modal-card">
                        <h2 class="neon-title" id="ttt-modal-title">VICTORY!</h2>
                        <p class="modal-sub" id="ttt-modal-desc">Player X won the match.</p>
                        <button class="primary-btn" id="ttt-modal-continue">CONTINUE</button>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const boardEl = this.container.querySelector('#ttt-board');
        const restartBtn = this.container.querySelector('#ttt-restart');
        const continueBtn = this.container.querySelector('#ttt-modal-continue');
        const modeBtns = this.container.querySelectorAll('.mode-btn');
        const diffBtns = this.container.querySelectorAll('.diff-btn');

        boardEl.addEventListener('click', (e) => {
            const cell = e.target.closest('.ttt-cell');
            if (cell) {
                const index = parseInt(cell.dataset.index);
                this.handleCellClick(index);
            }
        });

        boardEl.addEventListener('keydown', (e) => {
            const cell = e.target.closest('.ttt-cell');
            if (cell && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                const index = parseInt(cell.dataset.index);
                this.handleCellClick(index);
            }
        });

        restartBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.resetGame();
        });

        // Bug fix: continue button resets game and starts new round
        continueBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.hideModal();
            this.resetGame();
        });

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.arcadeAudio) window.arcadeAudio.click();
                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameMode = btn.dataset.mode;
                const diffGroup = this.container.querySelector('#ttt-diff-group');
                if (diffGroup) diffGroup.style.display = this.gameMode === 'ai' ? 'flex' : 'none';
                this.resetScores();
                this.resetGame();
            });
        });

        diffBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.arcadeAudio) window.arcadeAudio.click();
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aiDifficulty = btn.dataset.diff;
                this.resetGame();
            });
        });
    },

    handleCellClick(index) {
        if (!this.gameActive || this.board[index] !== "") return;

        this.makeMove(index, this.currentPlayer);

        if (this.gameActive && this.gameMode === "ai" && this.currentPlayer === "O") {
            this.gameActive = false;
            setTimeout(() => {
                this.gameActive = true;
                this.makeAIMove();
            }, 400);
        }
    },

    makeMove(index, player) {
        this.board[index] = player;
        if (window.arcadeAudio) window.arcadeAudio.pop();

        this.renderBoard();
        const winnerInfo = this.checkWinner();

        if (winnerInfo) {
            this.gameActive = false;
            this.handleEndGame(winnerInfo);
        } else {
            this.currentPlayer = this.currentPlayer === "X" ? "O" : "X";
            this.updateStatusUI();
        }
    },

    makeAIMove() {
        let bestIndex;
        const available = this.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);

        if (available.length === 0) return;

        if (this.aiDifficulty === "easy") {
            bestIndex = available[Math.floor(Math.random() * available.length)];
        } else if (this.aiDifficulty === "medium") {
            bestIndex = Math.random() < 0.5 ? this.getBestAIMove() : available[Math.floor(Math.random() * available.length)];
        } else {
            bestIndex = this.getBestAIMove();
        }

        this.makeMove(bestIndex, "O");
    },

    getBestAIMove() {
        // Check for winning move
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === "") {
                this.board[i] = "O";
                if (this.checkWinner()?.winner === "O") {
                    this.board[i] = "";
                    return i;
                }
                this.board[i] = "";
            }
        }
        // Block opponent win
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === "") {
                this.board[i] = "X";
                if (this.checkWinner()?.winner === "X") {
                    this.board[i] = "";
                    return i;
                }
                this.board[i] = "";
            }
        }
        // Center or random
        if (this.board[4] === "") return 4;
        const available = this.board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
        return available[Math.floor(Math.random() * available.length)];
    },

    checkWinner() {
        for (let pattern of this.winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return { winner: this.board[a], pattern };
            }
        }
        if (!this.board.includes("")) {
            return { winner: "tie" };
        }
        return null;
    },

    handleEndGame(winnerInfo) {
        const { winner, pattern } = winnerInfo;
        const cells = this.container.querySelectorAll('.ttt-cell');

        if (winner === "tie") {
            this.scores.ties++;
            if (window.arcadeAudio) window.arcadeAudio.bounce();
            this.showModal("DRAW MATCH!", "Neither player could claim victory.");
        } else {
            this.scores[winner]++;
            // Bug fix: use "win" class name to match CSS winner styling
            if (pattern) {
                pattern.forEach(idx => cells[idx].classList.add('win'));
            }

            if (winner === "X") {
                if (window.arcadeAudio) window.arcadeAudio.win();
                if (window.ArcadeHub) window.ArcadeHub.updateHighScore('tictactoe', this.scores.X * 100);
            } else {
                if (window.arcadeAudio) window.arcadeAudio.lose();
            }

            this.showModal(`PLAYER ${winner} WINS!`, `Outstanding tactical play!`);
        }

        this.updateScoresUI();
    },

    renderBoard() {
        const cells = this.container.querySelectorAll('.ttt-cell');
        cells.forEach((cell, i) => {
            cell.textContent = this.board[i];
            cell.className = `ttt-cell ${this.board[i].toLowerCase()}`;
        });
    },

    updateStatusUI() {
        const statusEl = this.container.querySelector('#ttt-status');
        if (statusEl) {
            statusEl.textContent = this.gameMode === 'ai' && this.currentPlayer === 'O' 
                ? "AI IS THINKING..." 
                : `PLAYER ${this.currentPlayer}'S TURN`;
        }
    },

    updateScoresUI() {
        const scoreX = this.container.querySelector('#ttt-score-x');
        const scoreO = this.container.querySelector('#ttt-score-o');
        const scoreTies = this.container.querySelector('#ttt-score-ties');
        if (scoreX) scoreX.textContent = this.scores.X;
        if (scoreO) scoreO.textContent = this.scores.O;
        if (scoreTies) scoreTies.textContent = this.scores.ties;
    },

    resetScores() {
        this.scores = { X: 0, O: 0, ties: 0 };
        this.updateScoresUI();
    },

    resetGame() {
        this.board = Array(9).fill("");
        this.currentPlayer = "X";
        this.gameActive = true;
        this.renderBoard();
        this.updateStatusUI();
    },

    showModal(title, desc) {
        const modal = this.container.querySelector('#ttt-modal');
        const titleEl = this.container.querySelector('#ttt-modal-title');
        const descEl = this.container.querySelector('#ttt-modal-desc');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;
        if (modal) modal.classList.remove('hidden');
    },

    hideModal() {
        const modal = this.container.querySelector('#ttt-modal');
        if (modal) modal.classList.add('hidden');
    },

    destroy() { }
};
