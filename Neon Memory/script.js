const SYMBOLS = ["⚡", "🔮", "💎", "🌀", "☄️", "👾", "🛸", "🎮", "🧿", "🌌"];

const LEVELS = {
  easy:   { pairs: 6,  boardClass: "easy" },
  medium: { pairs: 8,  boardClass: "medium" },
  hard:   { pairs: 10, boardClass: "hard" }
};

const boardEl = document.querySelector('#board');
const movesEl = document.querySelector('#moves');
const pairsLeftEl = document.querySelector('#pairsLeft');
const timerEl = document.querySelector('#timer');
const bestMovesEl = document.querySelector('#bestMoves');
const startBtn = document.querySelector('#startButton');
const modal = document.querySelector('#gameOver');
const finalMovesEl = document.querySelector('#finalMoves');
const finalTimeEl = document.querySelector('#finalTime');
const newBestEl = document.querySelector('#newBest');

let level = 'easy';
let moves = 0;
let matchedPairs = 0;
let totalPairs = LEVELS[level].pairs;
let flipped = [];
let lockBoard = false;
let seconds = 0;
let clockTimer = null;
let timerStarted = false;

function bestKey(lvl) { return `neonMemoryBest_${lvl}`; }

function loadBest() {
  const val = localStorage.getItem(bestKey(level));
  bestMovesEl.textContent = val ? val : '—';
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function updateUI() {
  movesEl.textContent = moves;
  pairsLeftEl.textContent = `${totalPairs - matchedPairs} PAIRS LEFT`;
  timerEl.textContent = formatTime(seconds);
}

function startClock() {
  if (timerStarted) return;
  timerStarted = true;
  clockTimer = setInterval(() => {
    seconds++;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}

function stopClock() {
  clearInterval(clockTimer);
  timerStarted = false;
}

const COLS = 4;

function sizeBoard() {
  const rows = Math.ceil((totalPairs * 2) / COLS);
  const styles = getComputedStyle(boardEl);
  const gap = parseFloat(styles.rowGap || styles.gap) || 0;
  const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

  const availW = boardEl.clientWidth - padX - gap * (COLS - 1);
  const availH = boardEl.clientHeight - padY - gap * (rows - 1);

  const cell = Math.max(28, Math.floor(Math.min(availW / COLS, availH / rows)));

  boardEl.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;
  boardEl.style.visibility = 'visible';
}

let resizeHandle;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeHandle);
  resizeHandle = requestAnimationFrame(sizeBoard);
});
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(sizeBoard);
});

function buildBoard() {
  stopClock();
  moves = 0;
  matchedPairs = 0;
  seconds = 0;
  flipped = [];
  lockBoard = false;
  totalPairs = LEVELS[level].pairs;

  const chosenSymbols = SYMBOLS.slice(0, totalPairs);
  const deck = shuffle([...chosenSymbols, ...chosenSymbols]);

  boardEl.className = `board ${LEVELS[level].boardClass}`;
  boardEl.style.visibility = 'hidden'; // avoid a flash of unsized cards
  boardEl.innerHTML = '';

  deck.forEach(symbol => {
    const card = document.createElement('button');
    card.className = 'card';
    card.setAttribute('aria-label', 'Hidden card');
    card.dataset.symbol = symbol;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back">✦</div>
        <div class="card-face card-front">${symbol}</div>
      </div>
    `;
    card.addEventListener('click', () => flipCard(card));
    boardEl.appendChild(card);
  });

  updateUI();
  loadBest();
  modal.classList.remove('open');
  requestAnimationFrame(sizeBoard);
}

function flipCard(card) {
  if (lockBoard) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (flipped.length === 2) return;

  startClock();
  card.classList.add('flipped');
  flipped.push(card);

  if (flipped.length === 2) {
    moves++;
    updateUI();
    checkMatch();
  }
}

function checkMatch() {
  const [a, b] = flipped;
  if (a.dataset.symbol === b.dataset.symbol) {
    a.classList.add('matched');
    b.classList.add('matched');
    flipped = [];
    matchedPairs++;
    updateUI();
    if (matchedPairs === totalPairs) {
      endGame();
    }
  } else {
    lockBoard = true;
    a.classList.add('mismatch');
    b.classList.add('mismatch');
    setTimeout(() => {
      a.classList.remove('flipped', 'mismatch');
      b.classList.remove('flipped', 'mismatch');
      flipped = [];
      lockBoard = false;
    }, 700);
  }
}

function endGame() {
  stopClock();
  const best = Number(localStorage.getItem(bestKey(level)) || Infinity);
  const isBest = moves < best;
  if (isBest) {
    localStorage.setItem(bestKey(level), moves);
    bestMovesEl.textContent = moves;
  }
  finalMovesEl.textContent = moves;
  finalTimeEl.textContent = formatTime(seconds);
  newBestEl.textContent = isBest ? 'NEW BEST!' : ' ';
  modal.classList.add('open');
}

document.querySelectorAll('.level').forEach(btn => btn.addEventListener('click', () => {
  level = btn.dataset.level;
  document.querySelector('.level.active').classList.remove('active');
  btn.classList.add('active');
  buildBoard();
}));

startBtn.addEventListener('click', buildBoard);
document.querySelector('#playAgain').addEventListener('click', () => {
  modal.classList.remove('open');
  buildBoard();
});

buildBoard();
