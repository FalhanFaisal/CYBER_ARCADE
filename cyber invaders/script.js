const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// UI elements
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startButton');

// Game state
let state = 'idle'; // idle | playing | dead
let score = 0, level = 1, lives = 3;
let best = Number(localStorage.getItem('cyberInvadersBest') || 0);
bestEl.textContent = best;

// Player
const PLAYER_W = 50, PLAYER_H = 28, PLAYER_SPEED = 5;
let player = { x: W/2 - PLAYER_W/2, y: H - 60, w: PLAYER_W, h: PLAYER_H, vx: 0, shield: 0 };

// Bullets
let bullets = [], enemyBullets = [];
const BULLET_SPEED = 9, ENEMY_BULLET_SPEED = 3.5;

// Aliens
let aliens = [];
let alienDir = 1, alienSpeedX = 0.6, alienDropY = 20;
let alienShootTimer = 0, alienShootInterval = 90;

// Particles
let particles = [];

// Keys
const keys = new Set();

// Stars background
const stars = Array.from({length: 80}, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 1.5 + 0.3,
  speed: Math.random() * 0.4 + 0.1,
  alpha: Math.random() * 0.7 + 0.3
}));

function buildAliens(lvl) {
  aliens = [];
  const cols = 11, rows = 5;
  const startX = 60, startY = 60, gapX = 62, gapY = 46;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      aliens.push({
        x: startX + c * gapX,
        y: startY + r * gapY,
        w: 36, h: 24,
        row: r, alive: true,
        points: (rows - r) * 10
      });
    }
  }
  alienDir = 1;
  alienSpeedX = 0.55 + (lvl - 1) * 0.1;
  alienShootInterval = Math.max(35, 90 - (lvl - 1) * 8);
}

function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1, color,
      life: 40 + Math.random() * 20
    });
  }
}

function resetGame() {
  score = 0; level = 1; lives = 3;
  player.x = W/2 - PLAYER_W/2;
  player.vx = 0; player.shield = 0;
  bullets = []; enemyBullets = []; particles = [];
  buildAliens(1);
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - Math.max(0, lives)));
  if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('cyberInvadersBest', best); }
}

function fireBullet() {
  if (state !== 'playing') return;
  if (!bullets.some(b => b.fromPlayer) || bullets.filter(b => b.fromPlayer).length < 3) {
    bullets.push({ x: player.x + PLAYER_W/2 - 2, y: player.y, w: 4, h: 14, fromPlayer: true, color: '#00f2fe' });
  }
}

function alienFire() {
  const alive = aliens.filter(a => a.alive);
  if (!alive.length) return;
  const shooter = alive[Math.floor(Math.random() * alive.length)];
  enemyBullets.push({ x: shooter.x + shooter.w/2 - 2, y: shooter.y + shooter.h, w: 4, h: 12, color: '#ff0844' });
}

function drawStars() {
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fill();
  });
}

function drawPlayer() {
  const x = player.x, y = player.y;
  // Engine glow
  ctx.shadowBlur = 20; ctx.shadowColor = '#00f2fe';
  // Body
  ctx.fillStyle = '#00f2fe';
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W/2, y);
  ctx.lineTo(x + PLAYER_W, y + PLAYER_H);
  ctx.lineTo(x + PLAYER_W * 0.7, y + PLAYER_H - 8);
  ctx.lineTo(x + PLAYER_W/2, y + PLAYER_H);
  ctx.lineTo(x + PLAYER_W * 0.3, y + PLAYER_H - 8);
  ctx.lineTo(x, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();
  // Cockpit
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_W/2, y + 12, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Shield flash
  if (player.shield > 0) {
    ctx.strokeStyle = `rgba(255,200,0,${player.shield / 60})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + PLAYER_W/2, y + PLAYER_H/2, PLAYER_W/2 + 8, PLAYER_H/2 + 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    player.shield--;
  }
}

function drawAlien(a) {
  if (!a.alive) return;
  const colors = ['#ff0844','#ff6b35','#b92bcf','#6952d7','#43e97b'];
  const col = colors[a.row % colors.length];
  ctx.shadowBlur = 10; ctx.shadowColor = col;
  ctx.fillStyle = col;
  // Alien body — simple pixel-art like shape
  const x = a.x, y = a.y, w = a.w, h = a.h;
  ctx.fillRect(x + 6, y, w - 12, h);
  ctx.fillRect(x + 2, y + 4, w - 4, h - 4);
  // Legs
  ctx.fillRect(x, y + h - 10, 6, 10);
  ctx.fillRect(x + w - 6, y + h - 10, 6, 10);
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 8, y + 5, 6, 6);
  ctx.fillRect(x + w - 14, y + 5, 6, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 10, y + 7, 3, 3);
  ctx.fillRect(x + w - 12, y + 7, 3, 3);
  ctx.shadowBlur = 0;
}

function drawBullet(b) {
  ctx.shadowBlur = 12; ctx.shadowColor = b.color;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function update() {
  if (state !== 'playing') return;

  // Player movement
  const goLeft = keys.has('arrowleft') || keys.has('a');
  const goRight = keys.has('arrowright') || keys.has('d');
  if (goLeft) player.x = Math.max(0, player.x - PLAYER_SPEED);
  if (goRight) player.x = Math.min(W - PLAYER_W, player.x + PLAYER_SPEED);

  // Move player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y -= BULLET_SPEED;
    if (b.y + b.h < 0) { bullets.splice(i, 1); continue; }
    // Hit alien?
    let hitAlien = false;
    for (const a of aliens) {
      if (!a.alive) continue;
      if (b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) {
        a.alive = false;
        score += a.points;
        spawnParticles(a.x + a.w/2, a.y + a.h/2, '#ff0844');
        bullets.splice(i, 1);
        hitAlien = true;
        break;
      }
    }
    if (!hitAlien) continue;
    updateUI();
    // Level up
    if (!aliens.some(a => a.alive)) {
      level++;
      bullets = []; enemyBullets = [];
      buildAliens(level);
      updateUI();
    }
  }

  // Enemy bullets
  alienShootTimer++;
  if (alienShootTimer >= alienShootInterval) {
    alienFire();
    alienShootTimer = 0;
  }
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.y += ENEMY_BULLET_SPEED;
    if (b.y > H) { enemyBullets.splice(i, 1); continue; }
    // Hit player?
    if (player.shield <= 0 &&
      b.x < player.x + PLAYER_W && b.x + b.w > player.x &&
      b.y < player.y + PLAYER_H && b.y + b.h > player.y) {
      enemyBullets.splice(i, 1);
      lives--;
      player.shield = 60;
      spawnParticles(player.x + PLAYER_W/2, player.y, '#f6d365', 12);
      updateUI();
      if (lives <= 0) { state = 'dead'; showGameOver(); }
    }
  }

  // Move aliens
  let edgeHit = false;
  const aliveAliens = aliens.filter(a => a.alive);
  aliveAliens.forEach(a => { a.x += alienSpeedX * alienDir; });
  for (const a of aliveAliens) {
    if (a.x + a.w >= W - 10 || a.x <= 10) { edgeHit = true; break; }
  }
  if (edgeHit) {
    alienDir *= -1;
    aliveAliens.forEach(a => { a.y += alienDropY; });
    // Check if reached player
    if (aliveAliens.some(a => a.y + a.h >= player.y)) {
      state = 'dead'; showGameOver();
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.05;
    p.alpha -= 1 / p.life;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // Background
  ctx.fillStyle = '#030212';
  ctx.fillRect(0, 0, W, H);
  drawStars();
  // Ground line
  ctx.strokeStyle = 'rgba(0,242,254,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
  // Draw game elements
  aliens.forEach(drawAlien);
  bullets.forEach(drawBullet);
  enemyBullets.forEach(drawBullet);
  drawParticles();
  drawPlayer();
}

function showGameOver() {
  overlay.classList.remove('hidden');
  overlay.querySelector('.eyebrow').textContent = 'MISSION FAILED';
  overlay.querySelector('h1').innerHTML = `GAME<br><span>OVER</span>`;
  overlay.querySelector('.overlay-copy').innerHTML = `Final Score: <strong style="color:#00f2fe">${score}</strong> &nbsp;|&nbsp; Level: <strong style="color:#b92bcf">${level}</strong>${score === best && score > 0 ? '<br>🏆 New High Score!' : ''}`;
  startBtn.textContent = '▶ Play Again';
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
  cancelAnimationFrame(raf);
  gameLoop();
});

// Keyboard
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === ' ' && state === 'playing') { e.preventDefault(); fireBullet(); }
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

// Mobile controls
const leftBtnEl = document.getElementById('leftBtn');
const rightBtnEl = document.getElementById('rightBtn');
leftBtnEl.addEventListener('pointerdown', () => keys.add('arrowleft'));
leftBtnEl.addEventListener('pointerup', () => keys.delete('arrowleft'));
leftBtnEl.addEventListener('pointerleave', () => keys.delete('arrowleft'));
leftBtnEl.addEventListener('pointercancel', () => keys.delete('arrowleft'));

rightBtnEl.addEventListener('pointerdown', () => keys.add('arrowright'));
rightBtnEl.addEventListener('pointerup', () => keys.delete('arrowright'));
rightBtnEl.addEventListener('pointerleave', () => keys.delete('arrowright'));
rightBtnEl.addEventListener('pointercancel', () => keys.delete('arrowright'));
document.getElementById('fireBtn').addEventListener('click', fireBullet);

// Tap canvas to fire
canvas.addEventListener('pointerdown', () => { if (state === 'playing') fireBullet(); });

// Initial draw
draw();
