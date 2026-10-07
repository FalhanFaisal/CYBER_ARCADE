const snakes = {99:80,92:72,74:53,64:60,49:11,46:25,16:6};
const ladders = {2:38,7:14,8:31,15:26,21:42,28:84,36:44,51:67,71:91,78:98};
const colors = ['#f15b61','#3984e8','#45bb82','#f4b727'];
const board = document.querySelector('#board');
const paths = document.querySelector('#paths');
const setup = document.querySelector('#setup-screen');
const game = document.querySelector('#game-screen');
const setupCard = document.querySelector('.setup-card');
const gameInner = document.querySelector('.game-inner');
const rollButton = document.querySelector('#roll-button');
const dice = document.querySelector('#dice');
const diceCaption = document.querySelector('#dice-caption');
let mode = 'single', players = [], turn = 0, extraTurn = true, moving = false;

function fitToContainer(container, content) {
  if (!container || !content) return;
  content.style.transform = 'none';
  requestAnimationFrame(() => {
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    const naturalW = content.scrollWidth;
    const naturalH = content.scrollHeight;
    const scaleW = naturalW > availW ? availW / naturalW : 1;
    const scaleH = naturalH > availH ? availH / naturalH : 1;
    const scale = Math.min(scaleW, scaleH, 1);
    content.style.transform = scale < 1 ? `scale(${scale})` : 'none';
  });
}

function fitVisibleScreen() {
  if (!setup.classList.contains('hidden')) fitToContainer(setup, setupCard);
  if (!game.classList.contains('hidden')) fitToContainer(game, gameInner);
}

window.addEventListener('resize', fitVisibleScreen);

function rowCol(square){ const row = Math.floor((square - 1) / 10); const col = (square - 1) % 10; return {x: row % 2 ? 95 - col * 10 : 5 + col * 10, y: 95 - row * 10}; }
function buildBoard(){ board.innerHTML=''; for(let row=9;row>=0;row--){const squares=Array.from({length:10},(_,i)=>row%2?row*10+10-i:row*10+1+i);squares.forEach(square=>{const tile=document.createElement('div');tile.className='tile';tile.dataset.square=square;tile.innerHTML=`<span class="number">${square}</span><div class="tokens"></div>`;board.append(tile);});} drawPaths(); }
// Quadratic bezier point + tangent helpers (used to build the tapered snake body)
function bezPoint(a, c, b, t) {
  const mt = 1 - t;
  return { x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y };
}
function bezTangent(a, c, b, t) {
  const mt = 1 - t;
  return { x: 2 * mt * (c.x - a.x) + 2 * t * (b.x - c.x), y: 2 * mt * (c.y - a.y) + 2 * t * (b.y - c.y) };
}

const SNAKE_HUES = ['#5a7d3c', '#7a5a3d', '#3f6b5a'];
const SNAKE_DARK = ['#3a5326', '#4f3a22', '#294a3f'];

function drawLadder(from, to) {
  const a = rowCol(+from), b = rowCol(+to);
  const dx = b.x - a.x, dy = b.y - a.y;
  const angle = Math.atan2(dy, dx);
  const ox = Math.sin(angle) * 1.7, oy = -Math.cos(angle) * 1.7;

  // Two wooden rails, each with a subtle highlight edge for a rounded 3D look
  paths.innerHTML += `
    <line class="ladder-rail" x1="${a.x + ox}" y1="${a.y + oy}" x2="${b.x + ox}" y2="${b.y + oy}"/>
    <line class="ladder-rail" x1="${a.x - ox}" y1="${a.y - oy}" x2="${b.x - ox}" y2="${b.y - oy}"/>
    <line class="ladder-rail-highlight" x1="${a.x + ox}" y1="${a.y + oy}" x2="${b.x + ox}" y2="${b.y + oy}"/>
    <line class="ladder-rail-highlight" x1="${a.x - ox}" y1="${a.y - oy}" x2="${b.x - ox}" y2="${b.y - oy}"/>
  `;

  // Wooden rungs with small dowel-peg dots where they meet the rails
  for (let i = 0.14; i < 0.94; i += 0.15) {
    const x1 = a.x + dx * i + ox, y1 = a.y + dy * i + oy;
    const x2 = a.x + dx * i - ox, y2 = a.y + dy * i - oy;
    paths.innerHTML += `
      <line class="ladder-rung" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
      <circle class="ladder-peg" cx="${x1}" cy="${y1}" r="0.45"/>
      <circle class="ladder-peg" cx="${x2}" cy="${y2}" r="0.45"/>
    `;
  }
}

function drawSnake(from, to, i) {
  const a = rowCol(+from), b = rowCol(+to);
  const ctrl = { x: (a.x + b.x) / 2 + (i % 2 ? 8 : -8), y: (a.y + b.y) / 2 };
  const hue = SNAKE_HUES[i % SNAKE_HUES.length];
  const dark = SNAKE_DARK[i % SNAKE_DARK.length];

  // Sample the curve and build a tapered ribbon (thick near the head, thin at the tail)
  const steps = 18, headW = 4.2, tailW = 1.4;
  const left = [], right = [], centre = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const p = bezPoint(a, ctrl, b, t);
    const tan = bezTangent(a, ctrl, b, t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const nx = -tan.y / len, ny = tan.x / len;
    const w = headW + (tailW - headW) * t;
    left.push({ x: p.x + nx * w / 2, y: p.y + ny * w / 2 });
    right.push({ x: p.x - nx * w / 2, y: p.y - ny * w / 2 });
    centre.push(p);
  }
  const toStr = pts => pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ');
  const bodyPath = `M ${toStr(left)} L ${toStr(right.slice().reverse())} Z`;
  paths.innerHTML += `<path class="snake-body-shape" fill="${hue}" stroke="${dark}" d="${bodyPath}"/>`;

  // Scale texture
  for (let s = 2; s < steps; s += 3) {
    const t = s / steps;
    const p = centre[s];
    const tan = bezTangent(a, ctrl, b, t);
    const ang = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
    const w = headW + (tailW - headW) * t;
    paths.innerHTML += `<ellipse class="snake-scale" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" rx="${(w * 0.32).toFixed(2)}" ry="${(w * 0.5).toFixed(2)}" transform="rotate(${ang.toFixed(1)} ${p.x.toFixed(2)} ${p.y.toFixed(2)})"/>`;
  }

  // Pale belly stripe along the centreline
  paths.innerHTML += `<path class="snake-belly" d="M ${toStr(centre)}"/>`;

  // Head, eyes and a forked tongue pointing away from the body
  const headTan = bezTangent(a, ctrl, b, 0);
  const hlen = Math.hypot(headTan.x, headTan.y) || 1;
  const dirX = -headTan.x / hlen, dirY = -headTan.y / hlen; // snout points away from body
  const nx = -dirY, ny = dirX;
  const headAngle = (Math.atan2(dirY, dirX) * 180) / Math.PI;

  paths.innerHTML += `<ellipse class="snake-head" fill="${hue}" stroke="${dark}" cx="${a.x}" cy="${a.y}" rx="2.3" ry="2" transform="rotate(${headAngle.toFixed(1)} ${a.x} ${a.y})"/>`;

  const eyeBase = { x: a.x + dirX * 0.6, y: a.y + dirY * 0.6 };
  [1, -1].forEach(sign => {
    const ex = eyeBase.x + nx * 1.1 * sign, ey = eyeBase.y + ny * 1.1 * sign;
    paths.innerHTML += `<circle class="snake-eye" cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="0.55"/><circle class="snake-pupil" cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="0.22"/>`;
  });

  const tongueBase = { x: a.x + dirX * 1.9, y: a.y + dirY * 1.9 };
  const tongueTip = { x: a.x + dirX * 3, y: a.y + dirY * 3 };
  const forkA = { x: tongueTip.x + nx * 0.5, y: tongueTip.y + ny * 0.5 };
  const forkB = { x: tongueTip.x - nx * 0.5, y: tongueTip.y - ny * 0.5 };
  paths.innerHTML += `<path class="snake-tongue" d="M ${tongueBase.x.toFixed(2)} ${tongueBase.y.toFixed(2)} L ${tongueTip.x.toFixed(2)} ${tongueTip.y.toFixed(2)} M ${tongueTip.x.toFixed(2)} ${tongueTip.y.toFixed(2)} L ${forkA.x.toFixed(2)} ${forkA.y.toFixed(2)} M ${tongueTip.x.toFixed(2)} ${tongueTip.y.toFixed(2)} L ${forkB.x.toFixed(2)} ${forkB.y.toFixed(2)}"/>`;
}

function drawPaths() {
  paths.innerHTML = '';
  Object.entries(ladders).forEach(([from, to]) => drawLadder(from, to));
  Object.entries(snakes).forEach(([from, to], i) => drawSnake(from, to, i));
}
function createPlayers(){const total=mode==='single'?2:+mode;players=Array.from({length:total},(_,i)=>({name:mode==='single'&&i===1?'Computer':`Player ${i+1}`,position:0,color:colors[i],computer:mode==='single'&&i===1}));}
function render(){document.querySelector('#turn-title').textContent=`${players[turn].name}'s turn`;document.querySelector('#status-pill').textContent=players[turn].computer?'Computer is thinking…':'Roll the dice!';rollButton.disabled=moving||players[turn].computer;document.querySelector('#players').innerHTML=players.map((p,i)=>`<div class="player-card ${i===turn?'active':''}"><span class="player-dot" style="background:${p.color}"></span>${p.name}<span class="player-position">${p.position||'Start'}</span></div>`).join('');document.querySelectorAll('.tokens').forEach(x=>x.innerHTML='');players.forEach((p,i)=>{if(p.position){const target=document.querySelector(`[data-square="${p.position}"] .tokens`);target.innerHTML+=`<span class="token" title="${p.name}" style="background:${p.color}"></span>`;}});}
function startGame(){extraTurn=document.querySelector('#extra-turn').checked;createPlayers();turn=0;moving=false;dice.textContent='?';diceCaption.textContent='Your lucky roll is waiting.';setup.classList.add('hidden');game.classList.remove('hidden');render();fitVisibleScreen();}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function takeTurn(){if(moving)return;moving=true;render();dice.classList.add('rolling');dice.textContent='🎲';await wait(550);const roll=Math.floor(Math.random()*6)+1;dice.classList.remove('rolling');dice.textContent=roll;const p=players[turn];diceCaption.textContent=`${p.name} rolled a ${roll}!`;let destination=p.position+roll;if(destination<=100){for(let s=p.position+1;s<=destination;s++){p.position=s;render();await wait(100);}if(ladders[p.position]){const end=ladders[p.position];diceCaption.textContent=`🪜 ${p.name} climbs to ${end}!`;await wait(500);p.position=end;}else if(snakes[p.position]){const end=snakes[p.position];diceCaption.textContent=`🐍 Oh no! ${p.name} slides to ${end}.`;await wait(500);p.position=end;}}else diceCaption.textContent=`Need an exact roll — ${p.name} stays put.`;render();if(p.position===100){await wait(400);document.querySelector('#winner-name').textContent=`${p.name} wins!`;document.querySelector('#winner-message').textContent=`They reached square 100 with a perfect finish.`;document.querySelector('#winner-dialog').showModal();moving=false;return;}const again=extraTurn&&roll===6;if(!again)turn=(turn+1)%players.length;moving=false;render();if(again)diceCaption.textContent=`A 6! ${p.name} rolls again.`;if(players[turn].computer){await wait(950);takeTurn();}}
document.querySelectorAll('.mode-choice').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('.mode-choice').forEach(x=>x.classList.toggle('active',x===button));}));
document.querySelector('#start-game').addEventListener('click',startGame);rollButton.addEventListener('click',takeTurn);document.querySelector('#restart-game').addEventListener('click',startGame);document.querySelector('#new-game').addEventListener('click',()=>{document.querySelector('#winner-dialog').close();game.classList.add('hidden');setup.classList.remove('hidden');fitVisibleScreen();});document.querySelector('#play-again').addEventListener('click',()=>{document.querySelector('#winner-dialog').close();startGame();});document.querySelector('#back-to-menu').addEventListener('click',()=>{document.querySelector('#winner-dialog').close();game.classList.add('hidden');setup.classList.remove('hidden');fitVisibleScreen();});document.querySelector('#rules-button').addEventListener('click',()=>document.querySelector('#rules-dialog').showModal());document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.querySelector(`#${button.dataset.close}`).close()));buildBoard();fitVisibleScreen();
