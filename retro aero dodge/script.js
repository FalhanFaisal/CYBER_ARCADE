const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startButton');

let best = Number(localStorage.getItem('aeroDodgeBest') || 0);
bestEl.textContent = best;

const GRAVITY = 0.38;
const FLAP_POWER = -7.5;
const PIPE_W = 52;
const PIPE_GAP = 155;
const PIPE_SPEED = 2.8;

let state = 'idle';
let score = 0;
let rocket = { x: 90, y: H/2, vy: 0, r: 18, rotation: 0 };
let pipes = [];
let particles = [];
let pipeTimer = 0;
let stars = Array.from({length: 60}, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: Math.random() * 1.4 + 0.2, speed: Math.random() * 0.8 + 0.3, alpha: Math.random() * 0.8 + 0.2
}));
let frameCount = 0;

function resetGame() {
  rocket = { x: 90, y: H/2, vy: 0, r: 18, rotation: 0 };
  pipes = [];
  particles = [];
  pipeTimer = 0;
  score = 0;
  frameCount = 0;
  scoreEl.textContent = 0;
}

function flap() {
  if (state === 'idle') return;
  if (state === 'dead') return;
  rocket.vy = FLAP_POWER;
}

function spawnPipe() {
  const minY = 80, maxY = H - 80 - PIPE_GAP;
  const topH = Math.floor(Math.random() * (maxY - minY) + minY);
  const colors = ['#b92bcf','#00f2fe','#ff0844','#43e97b','#f6d365'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  pipes.push({
    x: W + 10,
    topH,
    botY: topH + PIPE_GAP,
    botH: H - topH - PIPE_GAP,
    scored: false,
    color
  });
}

function spawnParticles(x, y) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 5 + 1;
    const colors = ['#ff0844', '#f6d365', '#b92bcf', '#fff'];
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      alpha: 1, color: colors[Math.floor(Math.random() * colors.length)],
      life: 40 + Math.random() * 20
    });
  }
}

function checkCollision() {
  const rx = rocket.x, ry = rocket.y, rr = rocket.r - 4;
  // Wall
  if (ry - rr < 0 || ry + rr > H) return true;
  // Pipes (including 5px cap overhangs)
  for (const p of pipes) {
    if (rx + rr > p.x - 5 && rx - rr < p.x + PIPE_W + 5) {
      if (ry - rr < p.topH || ry + rr > p.botY) return true;
    }
  }
  return false;
}

function drawStars() {
  stars.forEach(s => {
    s.x -= s.speed * (state === 'playing' ? 1 : 0.3);
    if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fill();
  });
}

function drawPipe(p) {
  const colors = [p.color, '#fff'];
  // Top pipe
  ctx.shadowBlur = 10; ctx.shadowColor = p.color;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.roundRect(p.x, 0, PIPE_W, p.topH - 10, [0, 0, 8, 8]);
  ctx.fill();
  // Top cap
  ctx.fillStyle = colors[1];
  ctx.globalAlpha = 0.15;
  ctx.fillRect(p.x + 4, 0, PIPE_W - 8, p.topH - 10);
  ctx.globalAlpha = 1;
  // Cap overhang
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x - 5, p.topH - 20, PIPE_W + 10, 20);

  // Bottom pipe
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.roundRect(p.x, p.botY + 20, PIPE_W, p.botH - 10, [8, 8, 0, 0]);
  ctx.fill();
  ctx.fillRect(p.x - 5, p.botY, PIPE_W + 10, 20);
  // Bottom highlight
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#fff';
  ctx.fillRect(p.x + 4, p.botY + 20, PIPE_W - 8, p.botH - 10);
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 0;
}

function drawRocket() {
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  // Clamp rotation
  rocket.rotation = Math.min(Math.PI/3, Math.max(-Math.PI/3, rocket.vy * 0.07));
  ctx.rotate(rocket.rotation);

  // Engine flame
  if (state === 'playing') {
    const flameLen = 12 + Math.random() * 10;
    const grad = ctx.createLinearGradient(0, 14, 0, 14 + flameLen);
    grad.addColorStop(0, 'rgba(255,180,0,0.9)');
    grad.addColorStop(0.5, 'rgba(255,80,0,0.6)');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 14 + flameLen/2, 7, flameLen/2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body
  ctx.shadowBlur = 15; ctx.shadowColor = '#f6d365';
  ctx.fillStyle = '#f6d365';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(10, 12);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();

  // Nose tip
  ctx.fillStyle = '#ff0844';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(5, -6);
  ctx.lineTo(-5, -6);
  ctx.closePath();
  ctx.fill();

  // Window
  ctx.fillStyle = 'rgba(0,242,254,0.8)';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawScore() {
  ctx.font = `bold 38px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText(score, W/2, 60);
}

function update() {
  if (state !== 'playing') return;
  frameCount++;

  // Physics
  rocket.vy += GRAVITY;
  rocket.y += rocket.vy;

  // Spawn pipes
  pipeTimer++;
  if (pipeTimer >= 90) { spawnPipe(); pipeTimer = 0; }

  // Move pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= PIPE_SPEED;
    if (!pipes[i].scored && pipes[i].x + PIPE_W < rocket.x) {
      pipes[i].scored = true;
      score++;
      scoreEl.textContent = score;
      if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('aeroDodgeBest', best); }
    }
    if (pipes[i].x + PIPE_W < 0) pipes.splice(i, 1);
  }

  // Particles (trail)
  if (frameCount % 3 === 0) {
    particles.push({
      x: rocket.x - 10 * Math.cos(rocket.rotation),
      y: rocket.y + 14,
      vx: (Math.random() - 0.5) * 1.5 - 1.5,
      vy: Math.random() * 1.5 + 0.5,
      alpha: 0.7, color: Math.random() > 0.5 ? '#ff6600' : '#f6d365',
      life: 18
    });
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.alpha -= 1 / p.life;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Collision
  if (checkCollision()) {
    state = 'dead';
    spawnParticles(rocket.x, rocket.y);
    showGameOver();
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#030212';
  ctx.fillRect(0, 0, W, H);
  drawStars();
  pipes.forEach(drawPipe);
  drawParticles();
  if (state !== 'dead') drawRocket();
  drawScore();
}

function showGameOver() {
  overlay.classList.remove('hidden');
  overlay.querySelector('.eyebrow').textContent = '💥 CRASHED!';
  overlay.querySelector('h1').innerHTML = `GAME<br><span>OVER</span>`;
  overlay.querySelector('.overlay-copy').innerHTML = `Score: <strong style="color:#f6d365">${score}</strong> &nbsp;|&nbsp; Best: <strong style="color:#00f2fe">${best}</strong>${score === best && score > 0 ? '<br>🏆 New Record!' : ''}`;
  startBtn.textContent = '▶ Try Again';
}

let raf;
function gameLoop() {
  update();
  draw();
  raf = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', () => {
  resetGame();
  state = 'playing';
  overlay.classList.add('hidden');
});

// Flap controls
document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});
canvas.addEventListener('pointerdown', () => flap());

gameLoop();
