
// ======================
// DOM ELEMENTS
// ======================

const board = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const container = document.querySelector(".container");

// ======================
// FIT TO VIEWPORT (no page scrolling, ever)
// ======================

function fitContainer() {
  if (!container) return;
  container.style.transform = 'none';
  requestAnimationFrame(() => {
    const availW = document.body.clientWidth;
    const availH = document.body.clientHeight;
    const naturalW = container.scrollWidth;
    const naturalH = container.scrollHeight;
    const scaleW = naturalW > availW ? availW / naturalW : 1;
    const scaleH = naturalH > availH ? availH / naturalH : 1;
    const scale = Math.min(scaleW, scaleH, 1);
    container.style.transform = scale < 1 ? `scale(${scale})` : 'none';
  });
}

window.addEventListener('resize', fitContainer);

const statusText = document.getElementById("status");

const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");
const closePopup = document.getElementById("closePopup");

const restartBtn = document.getElementById("restartBtn");
const newGameBtn = document.getElementById("newGameBtn");
const resetScoreBtn = document.getElementById("resetScoreBtn");

const singleBtn = document.getElementById("singleBtn");
const multiBtn = document.getElementById("multiBtn");

const difficulty = document.getElementById("difficulty");
const difficultyBox = document.getElementById("difficultyBox");

const scoreX = document.getElementById("scoreX");
const scoreO = document.getElementById("scoreO");
const scoreDraw = document.getElementById("scoreDraw");

const clickSound = document.getElementById("clickSound");
const winSound = document.getElementById("winSound");
const drawSound = document.getElementById("drawSound");

// ======================
// GAME VARIABLES
// ======================

let boardState = [
    "", "", "",
    "", "", "",
    "", "", ""
];

let currentPlayer = "X";

let gameRunning = true;

let singlePlayer = true;

let aiTimeoutId = null;

// Scores

let scores = JSON.parse(localStorage.getItem("tttScores")) || {

    X: 0,

    O: 0,

    Draw: 0

};

// Winning combinations

const winPatterns = [

    [0,1,2],
    [3,4,5],
    [6,7,8],

    [0,3,6],
    [1,4,7],
    [2,5,8],

    [0,4,8],
    [2,4,6]

];

// ======================
// INITIALIZE
// ======================

updateScoreboard();

statusText.textContent = "X Turn";

fitContainer();

cells.forEach(cell=>{

    cell.addEventListener("click",handleCellClick);

});


    difficultyBox.style.display="flex";

    singleBtn.classList.add("active");

    multiBtn.classList.remove("active");

    newGame();

    fitContainer();

});

multiBtn.addEventListener("click",()=>{

    singlePlayer=false;

    difficultyBox.style.display="none";

    multiBtn.classList.add("active");

    singleBtn.classList.remove("active");

    newGame();

    fitContainer();

});

// ======================
// CELL CLICK
// ======================

function handleCellClick(){

    const index=this.dataset.index;

    if(boardState[index]!=="" || !gameRunning)
        return;

    placeMove(index,currentPlayer);

    if(checkWinner())
        return;

    if(checkDraw())
        return;

    switchPlayer();

    // AI Move

    if(singlePlayer && currentPlayer==="O"){

        board.classList.add("disabled");

        aiTimeoutId = setTimeout(()=>{

            aiMove();

            board.classList.remove("disabled");

        },400);

    }

}

// ======================
// PLACE MOVE
// ======================

function placeMove(index,player){

    boardState[index]=player;

    cells[index].textContent=player;

    cells[index].classList.add(player.toLowerCase());

    playClick();

}

// ======================
// PLAYER SWITCH
// ======================

function switchPlayer(){

    currentPlayer=currentPlayer==="X"?"O":"X";

    statusText.textContent=currentPlayer+" Turn";

}

// ======================
// RESTART
// ======================

function restartGame(){

    if(aiTimeoutId !== null){

        clearTimeout(aiTimeoutId);

        aiTimeoutId = null;

    }

    boardState=[
        "","","",
        "","","",
        "","",""
    ];

    currentPlayer="X";

    gameRunning=true;

    board.classList.remove("disabled");

    statusText.textContent="X Turn";

    cells.forEach(cell=>{

        cell.textContent="";

        cell.className="cell";

    });

}

// ======================
// NEW GAME
// ======================

function newGame(){

    restartGame();

}

// ======================
// SCOREBOARD
// ======================

function updateScoreboard(){

    scoreX.textContent=scores.X;

    scoreO.textContent=scores.O;

    scoreDraw.textContent=scores.Draw;

}

// ======================
// RESET SCORES
// ======================

function resetScores(){

    scores={

        X:0,

        O:0,

        Draw:0

    };

    localStorage.setItem(

        "tttScores",

        JSON.stringify(scores)

    );

    updateScoreboard();

}

// ======================
// GAME RESULTS
// ======================

function checkWinner(){

    for(const pattern of winPatterns){

        const [a,b,c] = pattern;

        if(boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]){

            gameRunning = false;

            pattern.forEach(index => cells[index].classList.add("win"));

            scores[currentPlayer]++;

            localStorage.setItem("tttScores", JSON.stringify(scores));

            updateScoreboard();

            statusText.textContent = currentPlayer + " Wins!";

            popupText.textContent = currentPlayer + " Wins!";

            popup.classList.remove("hidden");

            playWin();

            return true;

        }

    }

    return false;

}

function checkDraw(){

    if(boardState.some(cell => cell === ""))
        return false;

    gameRunning = false;

    scores.Draw++;

    localStorage.setItem("tttScores", JSON.stringify(scores));

    updateScoreboard();

    statusText.textContent = "It's a Draw!";

    popupText.textContent = "It's a Draw!";

    popup.classList.remove("hidden");

    playDraw();

    return true;

}

// ======================
// AI
// ======================

function aiMove(){

    aiTimeoutId = null;

    if(!gameRunning || currentPlayer !== "O")
        return;

    const emptyCells = boardState
        .map((value, index) => value === "" ? index : null)
        .filter(index => index !== null);

    if(emptyCells.length === 0)
        return;

    let move;

    if(difficulty.value === "hard"){

        move = findBestMove();

    }else{

        move = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    }

    placeMove(move, "O");

    if(checkWinner() || checkDraw())
        return;

    switchPlayer();

}

function findBestMove(){

    for(const player of ["O", "X"]){

        for(let index = 0; index < boardState.length; index++){

            if(boardState[index] !== "")
                continue;

            boardState[index] = player;

            const winningMove = winPatterns.some(([a,b,c]) =>
                boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]
            );

            boardState[index] = "";

            if(winningMove)
                return index;

        }

    }

    if(boardState[4] === "")
        return 4;

    const corners = [0,2,6,8].filter(index => boardState[index] === "");

    if(corners.length)
        return corners[Math.floor(Math.random() * corners.length)];

    return boardState.findIndex(cell => cell === "");

}

// ======================
// OPTIONAL AUDIO
// ======================

function playSound(sound){

    if(sound){

        sound.currentTime = 0;

        sound.play().catch(() => {});

    }

}

function playClick(){ playSound(clickSound); }

function playWin(){ playSound(winSound); }

function playDraw(){ playSound(drawSound); }

