const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const WIN_SCORE = 7;

const scoreLeftEl = document.getElementById('scoreLeft');
const scoreRightEl = document.getElementById('scoreRight');
const statusMsg = document.getElementById('statusMsg');
const overlay = document.getElementById('overlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const startBtn = document.getElementById('startButton');
const pauseBtn = document.getElementById('pauseButton');

const PAD_W = 12, PAD_H = 80, PAD_SPEED = 6;
const BALL_R = 9;

let state = 'idle'; // 'idle' | 'playing' | 'paused'
let scoreLeft = 0, scoreRight = 0;
let particles = [];

let leftPad = { x: 18, y: H/2 - PAD_H/2, w: PAD_W, h: PAD_H, color: '#00f2fe' };
let rightPad = { x: W - 18 - PAD_W, y: H/2 - PAD_H/2, w: PAD_W, h: PAD_H, color: '#ff0844' };
let ball = { x: W/2, y: H/2, vx: 5, vy: 3, r: BALL_R, trail: [] };

const keys = new Set();
let mouseY = H/2;
let touchActive = false;

function resetBall(dir = 1) {
  ball.x = W/2; ball.y = H/2;
  const angle = (Math.random() * 0.5 - 0.25);
  const speed = 5;
  ball.vx = dir * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
  ball.trail = [];
}

function resetPads() {
  leftPad.y = H/2 - PAD_H/2;
  rightPad.y = H/2 - PAD_H/2;
}

function startGame() {
  scoreLeft = 0; scoreRight = 0;
  particles = [];
  resetPads(); resetBall(1);
  state = 'playing';
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  pauseBtn.disabled = false;
  pauseBtn.textContent = '⏸';
  updateScoreUI();
  statusMsg.textContent = 'Playing!';
}

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    pauseOverlay.classList.remove('hidden');
    pauseBtn.textContent = '▶';
    statusMsg.textContent = 'Paused';
  } else if (state === 'paused') {
    state = 'playing';
    pauseOverlay.classList.add('hidden');
    pauseBtn.textContent = '⏸';
    statusMsg.textContent = 'Playing!';
  }
}

function updateScoreUI() {
  scoreLeftEl.textContent = scoreLeft;
  scoreRightEl.textContent = scoreRight;
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 4 + 1;
    particles.push({ x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, alpha: 1, color, life: 35 });
  }
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function updatePads() {
  // Left pad: player control (keyboard vs mouse mode)
  if (keys.has('w') || keys.has('arrowup')) {
    leftPad.y -= PAD_SPEED;
  } else if (keys.has('s') || keys.has('arrowdown')) {
    leftPad.y += PAD_SPEED;
  } else if (mouseActive) {
    leftPad.y += (mouseY - (leftPad.y + PAD_H/2)) * 0.12;
  }
  leftPad.y = clamp(leftPad.y, 0, H - PAD_H);

  // Right pad: AI tracking ball
  const center = rightPad.y + PAD_H/2;
  const diff = ball.y - center;
  const ai_speed = 3.8 + Math.min(2, (scoreLeft + scoreRight) * 0.12);
  rightPad.y += clamp(diff, -ai_speed, ai_speed);
  rightPad.y = clamp(rightPad.y, 0, H - PAD_H);
}

function updateBall() {
  // Trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 12) ball.trail.shift();

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce (top/bottom)
  if (ball.y - BALL_R <= 0) { ball.vy = Math.abs(ball.vy); ball.y = BALL_R; }
  if (ball.y + BALL_R >= H) { ball.vy = -Math.abs(ball.vy); ball.y = H - BALL_R; }

  // Paddle collision: left (Fix corner tunneling & velocity clamp)
  if (ball.vx < 0 &&
      ball.x - BALL_R <= leftPad.x + PAD_W &&
      ball.x + BALL_R >= leftPad.x &&
      ball.y + BALL_R >= leftPad.y && ball.y - BALL_R <= leftPad.y + PAD_H) {
    const hitPos = (ball.y - (leftPad.y + PAD_H/2)) / (PAD_H/2);
    const speed = Math.min(12, Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy) + 0.2);
    ball.vx = Math.max(2.5, Math.abs(speed * Math.cos(hitPos * 1.1)));
    ball.vy = speed * Math.sin(hitPos * 1.1);
    ball.x = leftPad.x + PAD_W + BALL_R;
    spawnParticles(ball.x, ball.y, '#00f2fe');
  }

  // Paddle collision: right
  if (ball.vx > 0 &&
      ball.x + BALL_R >= rightPad.x &&
      ball.x - BALL_R <= rightPad.x + PAD_W &&
      ball.y + BALL_R >= rightPad.y && ball.y - BALL_R <= rightPad.y + PAD_H) {
    const hitPos = (ball.y - (rightPad.y + PAD_H/2)) / (PAD_H/2);
    const speed = Math.min(12, Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy) + 0.2);
    ball.vx = -Math.max(2.5, Math.abs(speed * Math.cos(hitPos * 1.1)));
    ball.vy = speed * Math.sin(hitPos * 1.1);
    ball.x = rightPad.x - BALL_R;
    spawnParticles(ball.x, ball.y, '#ff4e73');
  }

  // Score
  if (ball.x + BALL_R < 0) {
    scoreRight++;
    updateScoreUI();
    spawnParticles(0, ball.y, '#ff0844');
    if (scoreRight >= WIN_SCORE) { endGame('A.I.'); return; }
    resetBall(-1);
  }
  if (ball.x - BALL_R > W) {
    scoreLeft++;
    updateScoreUI();
    spawnParticles(W, ball.y, '#00f2fe');
    if (scoreLeft >= WIN_SCORE) { endGame('YOU'); return; }
    resetBall(1);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.alpha -= 1 / p.life;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawPad(pad) {
  ctx.shadowBlur = 18; ctx.shadowColor = pad.color;
  ctx.fillStyle = pad.color;
  ctx.beginPath();
  ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBall() {
  // Trail
  ball.trail.forEach((t, i) => {
    const alpha = (i / ball.trail.length) * 0.3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, BALL_R * (i / ball.trail.length), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  });
  // Ball
  ctx.shadowBlur = 22; ctx.shadowColor = '#fff';
  const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.5, '#c8f0ff');
  grad.addColorStop(1, '#00f2fe');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawCenterLine() {
  ctx.setLineDash([10, 14]);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function draw() {
  ctx.fillStyle = '#030212';
  ctx.fillRect(0, 0, W, H);
  drawCenterLine();
  drawPad(leftPad);
  drawPad(rightPad);
  drawBall();
  drawParticles();
}

function endGame(winner) {
  state = 'idle';
  pauseBtn.disabled = true;
  overlay.classList.remove('hidden');
  overlay.querySelector('.eyebrow').textContent = winner === 'YOU' ? '🏆 VICTORY!' : '💀 DEFEAT';
  overlay.querySelector('h1').innerHTML = winner === 'YOU' ? `YOU<br><span>WIN!</span>` : `A.I.<br><span>WINS</span>`;
  overlay.querySelector('.overlay-copy').innerHTML = `Final Score: <strong style="color:#00f2fe">${scoreLeft}</strong> &nbsp;—&nbsp; <strong style="color:#ff0844">${scoreRight}</strong>`;
  startBtn.textContent = '▶ Play Again';
  statusMsg.textContent = winner === 'YOU' ? 'You Won!' : 'A.I. Won!';
}

let raf;
function gameLoop() {
  if (state === 'playing') {
    updatePads();
    updateBall();
    updateParticles();
  }
  draw();
  raf = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', togglePause);
pauseBtn.disabled = true;

// Keys
const movementKeys = new Set(['w', 's', 'arrowup', 'arrowdown']);
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (movementKeys.has(k)) touchActive = true;
  if (k === 'p' || k === 'escape') togglePause();
});
document.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  keys.delete(k);
  if (movementKeys.has(k)) {
    const stillHeld = [...movementKeys].some(mk => keys.has(mk));
    if (!stillHeld) touchActive = false;
  }
});

// Mouse
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseY = (e.clientY - rect.top) * H / rect.height;
  const manualControlActive = [...movementKeys].some(mk => keys.has(mk));
  if (!manualControlActive) touchActive = false;
});

// Touch
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  mouseY = (e.touches[0].clientY - rect.top) * H / rect.height;
  leftPad.y = clamp(mouseY - PAD_H/2, 0, H - PAD_H);
  touchActive = true;
}, { passive: false });

// Mobile buttons
function pressBtn(key) { keys.add(key); touchActive = true; }
function releaseBtn(key) {
  keys.delete(key);
  if (!keys.has('arrowup') && !keys.has('arrowdown')) touchActive = false;
}

document.getElementById('upBtn').addEventListener('pointerdown', () => pressBtn('arrowup'));
document.getElementById('upBtn').addEventListener('pointerup', () => releaseBtn('arrowup'));
document.getElementById('upBtn').addEventListener('pointerleave', () => releaseBtn('arrowup'));
document.getElementById('upBtn').addEventListener('pointercancel', () => releaseBtn('arrowup'));
document.getElementById('downBtn').addEventListener('pointerdown', () => pressBtn('arrowdown'));
document.getElementById('downBtn').addEventListener('pointerup', () => releaseBtn('arrowdown'));
document.getElementById('downBtn').addEventListener('pointerleave', () => releaseBtn('arrowdown'));
document.getElementById('downBtn').addEventListener('pointercancel', () => releaseBtn('arrowdown'));

// Prevent stuck keys / stuck controls when the window loses focus (alt-tab, switching apps),
// and auto-pause an in-progress match so the AI can't score while you're away.
window.addEventListener('blur', () => {
  keys.clear();
  touchActive = false;
  if (state === 'playing') togglePause();
});

gameLoop();
