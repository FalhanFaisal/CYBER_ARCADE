const holes = [...document.querySelectorAll('.hole')];
const scoreEl = document.querySelector('#score'), timerEl = document.querySelector('#timer');
const heartsEl = document.querySelector('#hearts'), comboEl = document.querySelector('#combo');
const startBtn = document.querySelector('#startButton'), modal = document.querySelector('#gameOver');
const highScoreEl = document.querySelector('#highScore'), finalScoreEl = document.querySelector('#finalScore');
const newBestEl = document.querySelector('#newBest');
const levels = { easy: 780, medium: 570, hard: 390 };
let playing=false, score=0, time=30, lives=3, combo=1, activeHole=null, moleTimer, clockTimer, level='easy';
let highScore=Number(localStorage.getItem('tapTrapHighScore') || 0); highScoreEl.textContent=highScore;

holes.forEach((hole,i)=>{ 
  hole.innerHTML='<i class="mole"></i><i class="bomb">💣</i>';
  hole.addEventListener('click',event=>{
    if(playing && hole.classList.contains('up')) hit(hole);
  });
});
document.querySelectorAll('.level').forEach(btn=>btn.addEventListener('click',()=>{
  level=btn.dataset.level;
  document.querySelector('.level.active').classList.remove('active');
  btn.classList.add('active');
  if(playing){
    clearInterval(clockTimer); clearTimeout(moleTimer);
    playing=false; score=0; time=30; lives=3; combo=1;
    holes.forEach(hole=>hole.classList.remove('up'));
    updateUI();
    startBtn.textContent='▶ Start Game';
    startBtn.classList.remove('running');
  }
}));
startBtn.addEventListener('click',()=>playing ? endGame() : startGame()); document.querySelector('#playAgain').addEventListener('click',()=>{modal.classList.remove('open');startGame();});

function startGame(){
  clearInterval(clockTimer); clearTimeout(moleTimer); holes.forEach(h=>h.className='hole');
  playing=true;score=0;time=30;lives=3;combo=1;updateUI();startBtn.textContent='■ End Game';startBtn.classList.add('running');
  popMole(); clockTimer=setInterval(()=>{time--;timerEl.textContent=time;if(time<=0)endGame()},1000);
}
function popMole(){
  if(!playing)return; holes.forEach(h=>h.classList.remove('up'));
  let choices=holes.filter(h=>h!==activeHole); activeHole=choices[Math.floor(Math.random()*choices.length)];
  const bomb=Math.random() < (level==='hard'?.22:level==='medium'?.14:.08); activeHole.dataset.type=bomb?'bomb':'mole'; activeHole.classList.add('up');
  moleTimer=setTimeout(popMole,levels[level]);
}
function hit(hole){
  if(!playing||!hole.classList.contains('up'))return;
  hole.classList.remove('up');
  if(hole.dataset.type==='bomb'){score=Math.max(0,score-2);combo=1; lives--; if(lives<=0)endGame();}
  else {score+=combo;combo=Math.min(combo+1,5);}
  updateUI();
}
function updateUI(){scoreEl.textContent=score;timerEl.textContent=time;heartsEl.textContent='❤️'.repeat(lives)+'🖤'.repeat(3-lives);comboEl.textContent=`COMBO ×${combo}`}
function endGame(){
  if(!playing)return;playing=false;clearInterval(clockTimer);clearTimeout(moleTimer);holes.forEach(h=>h.classList.remove('up'));startBtn.textContent='▶ Start Game';startBtn.classList.remove('running');
  const isBest=score>highScore;if(isBest){highScore=score;localStorage.setItem('tapTrapHighScore',highScore);highScoreEl.textContent=highScore} finalScoreEl.textContent=score;newBestEl.textContent=isBest?'NEW HIGH SCORE!':' ';modal.classList.add('open');
}
