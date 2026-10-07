const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const ui = { score: document.querySelector('#score'), lives: document.querySelector('#lives'), level: document.querySelector('#level'), overlay: document.querySelector('#overlay'), start: document.querySelector('#startButton'), pause: document.querySelector('#pauseButton') };
const W = canvas.width, H = canvas.height;
const MAX_LEVEL = 20;
let score, lives, level, paddle, ball, bricks, running = false, paused = false, nextLevelReady = false, animation;
const keys = {};

function resetGame() { score = 0; lives = 3; level = 1; paddle = { x: W / 2 - 68, y: H - 42, w: 136, h: 14, speed: 9 }; makeBricks(); resetBall(); updateUI(); }
function makeBricks() { const colors = ['#a875ff', '#6e88ff', '#42d9ff', '#55e6b4', '#ffd45a', '#ff789a', '#ff9d5a']; const layouts = [() => true, (r, c) => r > 0 || c > 1 && c < 8, (r, c) => r < 3 || c === 0 || c === 9, (r, c) => r === 0 || r === 4 || c === 0 || c === 9 || (r === 2 && c > 2 && c < 7), (r, c) => (r + c) % 2 === 0 || r === 0 || r === 4]; const pattern = layouts[(level - 1) % layouts.length]; const shift = Math.floor((level - 1) / layouts.length); bricks = []; const cols = 10, rows = 5, gap = 8, bw = 72, bh = 21, startX = (W - (cols * bw + (cols - 1) * gap)) / 2; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (pattern(r, (c + shift * 2) % cols)) bricks.push({ x: startX + c * (bw + gap), y: 60 + r * (bh + gap), w: bw, h: bh, color: colors[(r + level - 1) % colors.length], alive: true }); }
function resetBall() { const speed = 4.2 + (level - 1) * .25; ball = { x: W / 2, y: H - 64, r: 8, dx: speed * (Math.random() > .5 ? 1 : -1), dy: -speed, stuck: true }; }
function updateUI() { ui.score.textContent = String(score).padStart(4, '0'); ui.level.textContent = String(level).padStart(2, '0'); ui.lives.textContent = '♥ '.repeat(lives).trim(); }
function start() { resetGame(); play(); }
function play() { running = true; paused = false; nextLevelReady = false; ui.overlay.classList.add('hidden'); ui.pause.disabled = false; ui.pause.textContent = 'Ⅱ'; cancelAnimationFrame(animation); loop(); }
function finish(title, text, copy = `Final score: <b>${score}</b><br>Ready for another round?`) { running = false; ui.pause.disabled = true; ui.overlay.classList.remove('hidden'); ui.overlay.querySelector('.eyebrow').textContent = title; ui.overlay.querySelector('h1').innerHTML = text; ui.overlay.querySelector('.overlay-copy').innerHTML = copy; ui.start.innerHTML = 'Play again <span>→</span>'; }
function completeLevel() { if (level === MAX_LEVEL) return finish('ALL LEVELS CLEARED', 'YOU ARE A <span>CHAMPION!</span>'); running = false; nextLevelReady = true; ui.pause.disabled = true; ui.overlay.classList.remove('hidden'); ui.overlay.querySelector('.eyebrow').textContent = `LEVEL ${level} COMPLETE`; ui.overlay.querySelector('h1').innerHTML = `GET <span>READY.</span>`; ui.overlay.querySelector('.overlay-copy').innerHTML = `Level ${level + 1} has a faster ball and a new brick formation.`; ui.start.innerHTML = `Level ${level + 1} <span>→</span>`; }
function advanceLevel() { level++; makeBricks(); resetBall(); updateUI(); play(); }
function togglePause() { if (!running) return; paused = !paused; ui.pause.textContent = paused ? '▶' : 'Ⅱ'; if (!paused) loop(); }
function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
function update() { if (keys.ArrowLeft) paddle.x -= paddle.speed; if (keys.ArrowRight) paddle.x += paddle.speed; paddle.x = clamp(paddle.x, 0, W - paddle.w); if (ball.stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - ball.r - 2; return; } ball.x += ball.dx; ball.y += ball.dy; if (ball.x + ball.r > W || ball.x - ball.r < 0) { ball.dx *= -1; ball.x = clamp(ball.x, ball.r, W - ball.r); } if (ball.y - ball.r < 0) ball.dy *= -1;
  if (ball.dy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h && ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r) { const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); ball.dx = hit * 6.1; ball.dy = -Math.max(4.1, Math.abs(ball.dy)); ball.y = paddle.y - ball.r; }
  for (const b of bricks) if (b.alive && ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
    b.alive = false; score += 10; updateUI();
    const overlapX = Math.min((ball.x + ball.r) - b.x, (b.x + b.w) - (ball.x - ball.r));
    const overlapY = Math.min((ball.y + ball.r) - b.y, (b.y + b.h) - (ball.y - ball.r));
    if (overlapX < overlapY) ball.dx *= -1; else ball.dy *= -1;
    break;
  }
  if (!bricks.some(b => b.alive)) completeLevel(); if (ball.y - ball.r > H) { lives--; updateUI(); if (!lives) finish('GAME OVER', 'OUT OF <span>LIVES.</span>'); else resetBall(); }
}
function rounded(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function draw() { ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#061a36'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#77a3d812'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  bricks.forEach(b => { if (!b.alive) return; ctx.shadowBlur = 14; ctx.shadowColor = b.color; rounded(b.x, b.y, b.w, b.h, 5); ctx.fillStyle = b.color; ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff45'; rounded(b.x + 3, b.y + 3, b.w - 6, 5, 3); ctx.fill(); });
  ctx.shadowBlur = 20; ctx.shadowColor = '#42d9ff'; rounded(paddle.x, paddle.y, paddle.w, paddle.h, 7); ctx.fillStyle = '#42d9ff'; ctx.fill(); ctx.shadowBlur = 0; const glow = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 12); glow.addColorStop(0, '#fff'); glow.addColorStop(.35, '#d9faff'); glow.addColorStop(1, '#42d9ff'); ctx.fillStyle = glow; ctx.shadowBlur = 19; ctx.shadowColor = '#42d9ff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
function loop() { if (!running || paused) return; update(); draw(); animation = requestAnimationFrame(loop); }
document.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ' || e.code === 'Space') { if (e.repeat) return; e.preventDefault(); if (ball?.stuck && running) ball.stuck = false; else togglePause(); } }); document.addEventListener('keyup', e => keys[e.key] = false); canvas.addEventListener('pointermove', e => { const rect = canvas.getBoundingClientRect(); paddle.x = clamp((e.clientX - rect.left) * W / rect.width - paddle.w / 2, 0, W - paddle.w); }); canvas.addEventListener('pointerdown', () => { if (running && ball.stuck) ball.stuck = false; }); ui.start.addEventListener('click', () => nextLevelReady ? advanceLevel() : start()); ui.pause.addEventListener('click', togglePause); resetGame(); draw();
