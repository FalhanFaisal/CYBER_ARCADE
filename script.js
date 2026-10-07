// Single PC Arcade Master Controller
window.ArcadeHub = {
    currentGame: null,
    highScores: {},

    games: [
        {
            id: 'neon-memory',
            title: 'NEON MEMORY',
            icon: '🧠',
            tag: 'PUZZLE',
            desc: 'Cyberpunk memory card matching matrix. Test your neural memory circuits across 3 difficulty levels.',
            module: 'NeonMemoryGame'
        },
        {
            id: 'tictactoe',
            title: 'TIC-TAC-TOE NEON',
            icon: '❌',
            tag: 'STRATEGY',
            desc: 'Futuristic XO tactical duel vs adaptive AI or local 2 Player desktop battle.',
            module: 'TicTacToeGame'
        },
        {
            id: 'brick-smash',
            title: 'BRICK SMASH',
            icon: '🧱',
            tag: 'ARCADE',
            desc: 'High-velocity arcade brick breaker. Features multi-angle physics, power levels, and paddle controls.',
            module: 'BrickSmashGame'
        },
        {
            id: 'cyber-racer',
            title: 'CYBER RACER',
            icon: '🏎️',
            tag: 'RACING',
            desc: 'High-speed highway dodger. Weave through traffic, boost velocity, and avoid catastrophic collisions.',
            module: 'CyberRacerGame'
        },
        {
            id: 'cyber-invaders',
            title: 'CYBER INVADERS',
            icon: '👾',
            tag: 'SHOOTER',
            desc: 'Retro alien fleet space shooter. Defend the terminal against invading cyber armadas.',
            module: 'CyberInvadersGame'
        },
        {
            id: 'cyber-pong',
            title: 'CYBER PONG',
            icon: '🏓',
            tag: 'SPORTS',
            desc: 'Neon table tennis combat. Play with dual-input WASD/Mouse controls vs AI or Player 2.',
            module: 'CyberPongGame'
        },
        {
            id: 'retro-aero',
            title: 'RETRO AERO DODGE',
            icon: '🚀',
            tag: 'ACTION',
            desc: 'Rocket flight obstacle course. Flap through plasma pipe barriers with precision aerodynamics.',
            module: 'RetroAeroGame'
        },
        {
            id: 'snake-ladder',
            title: 'SNAKE & LADDER',
            icon: '🎲',
            tag: 'BOARD',
            desc: 'Futuristic Cyber Board game. Climb neon ladders and bypass digital security snakes to reach Cell 100.',
            module: 'SnakeLadderGame'
        },
        {
            id: 'tap-trap',
            title: 'TAP TRAP',
            icon: '🔨',
            tag: 'REFLEX',
            desc: 'Cyber invader mole whacker. Purge rogue invaders with lightning-fast reflex clicks before time runs out.',
            module: 'TapTrapGame'
        }
    ],

    init() {
        this.loadHighScores();
        this.renderLobbyGrid();
        this.bindGlobalHotkeys();
        this.bindHeaderControls();
    },

    loadHighScores() {
        try {
            const saved = localStorage.getItem('pc_arcade_highscores');
            if (saved) {
                this.highScores = JSON.parse(saved);
            }
        } catch (e) {
            this.highScores = {};
        }
    },

    updateHighScore(gameId, score) {
        if (!this.highScores[gameId] || score > this.highScores[gameId]) {
            this.highScores[gameId] = score;
            try {
                localStorage.setItem('pc_arcade_highscores', JSON.stringify(this.highScores));
            } catch (e) { }
            this.renderLobbyGrid();
        }
    },

    renderLobbyGrid() {
        const gridEl = document.getElementById('arcade-game-grid');
        if (!gridEl) return;

        gridEl.innerHTML = this.games.map(game => {
            const highScore = this.highScores[game.id] || 0;
            return `
                <div class="game-card" data-id="${game.id}">
                    <div class="card-banner">
                        <span class="game-icon">${game.icon}</span>
                        <span class="card-tag">${game.tag}</span>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">${game.title}</h3>
                        <p class="card-desc">${game.desc}</p>
                        <div class="card-footer">
                            <span class="high-score-tag">BEST: 🏆 ${highScore}</span>
                            <button class="play-btn" onclick="ArcadeHub.launchGame('${game.id}')">PLAY NOW</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    launchGame(gameId) {
        const gameConfig = this.games.find(g => g.id === gameId);
        if (!gameConfig) return;

        if (window.arcadeAudio) window.arcadeAudio.click();

        // Destroy existing game if active
        this.exitActiveGame(false);

        const overlay = document.getElementById('game-viewport-overlay');
        const stage = document.getElementById('game-stage');
        const titleEl = document.getElementById('active-game-title');

        if (titleEl) titleEl.textContent = `${gameConfig.icon} ${gameConfig.title}`;
        if (stage) stage.innerHTML = '';
        if (overlay) overlay.classList.remove('hidden');

        // Instantiate Game Module
        const Module = window[gameConfig.module];
        if (Module && typeof Module.init === 'function') {
            this.currentGame = Module;
            Module.init(stage);
        }
    },

    exitActiveGame(hideOverlay = true) {
        if (this.currentGame) {
            if (typeof this.currentGame.destroy === 'function') {
                this.currentGame.destroy();
            }
            this.currentGame = null;
        }

        if (hideOverlay) {
            const overlay = document.getElementById('game-viewport-overlay');
            const stage = document.getElementById('game-stage');
            if (overlay) overlay.classList.add('hidden');
            if (stage) stage.innerHTML = '';
        }
    },

    bindGlobalHotkeys() {
        window.addEventListener('keydown', (e) => {
            // ESC key to return to Arcade lobby
            if (e.key === 'Escape') {
                if (this.currentGame) {
                    if (window.arcadeAudio) window.arcadeAudio.click();
                    this.exitActiveGame(true);
                }
            }
            // M key to toggle audio
            if (e.key === 'm' || e.key === 'M') {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    this.toggleAudio();
                }
            }
            // F key for fullscreen toggle
            if (e.key === 'f' || e.key === 'F') {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    this.toggleFullscreen();
                }
            }
        });
    },

    bindHeaderControls() {
        const audioBtn = document.getElementById('btn-toggle-audio');
        const fsBtn = document.getElementById('btn-toggle-fs');
        const exitBtn = document.getElementById('btn-exit-game');

        if (audioBtn) audioBtn.addEventListener('click', () => this.toggleAudio());
        if (fsBtn) fsBtn.addEventListener('click', () => this.toggleFullscreen());
        if (exitBtn) exitBtn.addEventListener('click', () => {
            if (window.arcadeAudio) window.arcadeAudio.click();
            this.exitActiveGame(true);
        });
    },

    toggleAudio() {
        if (window.arcadeAudio) {
            const isMuted = window.arcadeAudio.toggleMute();
            const btn = document.getElementById('btn-toggle-audio');
            if (btn) btn.innerHTML = isMuted ? '🔇 AUDIO: OFF' : '🔊 AUDIO: ON';
        }
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ArcadeHub.init();
});
