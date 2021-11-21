window.onload = function() {
    buttonDayNight = document.getElementById("buttonDayNight");
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext('2d');

    biasDayNight = 0; // 0: day, 9: night

    for(let i = 0; i < 3; i++) {
        pushPiece();
    }
    pieceList[0][2] = 2;
    setBoard(); /* debugBoard(); */
    placePieceOnBoard(pieceList[0]);

    createGradient();
    loadImage();
};

var canvas, ctx, grad;
var imgCd;      /* Center, Day   */
var imgCn;      /* Center, Night */
var imgWd = []; /* Wings,  Day   */
var imgWn = []; /* Wings,  Night */

var rmvr = new Image();
rmvr.onload = checkLoad;
rmvr.src = "images/rmvr.png";

var board = [];
var pieceList = []; /* type, pos, ori */
var piece;

var renderState = "game";
var gameCount = 0;
var removeCount;

var toRemove;
var biasDayNight;

var score = 0;

function main() { /* "키 입력 -> 새로운 block 상태 계산 -> 렌더링" 반복 */
    /* var debugTimeStart = performance.now(); */

    if(renderState === "game") {
        gameCount++;
        gameCount = gameCount % 300;
        
        piece = pieceList[0];
        var moveResult;
        var next = false;
        if(gameCount === 0) {userKey.k = 1;}
        
        if(userKey.k > 0) {userKey.k = 0; moveResult = move(piece, [0, 1]); downCount=0; if((!moveResult[0])&&(!moveResult[1])) {next = true;}}
        if(userKey.j > 0) {userKey.j = 0; move(piece, [-1, 0]);}
        if(userKey.l > 0) {userKey.l = 0; move(piece, [1, 0]);}
        if(userKey['n'] > 0) {userKey['n'] = 0; moveResult = move(piece, [-1, 1]); if(moveResult[0]) {gameCount=0;} if((!moveResult[0])&&(!moveResult[1])) {next = true;}}
        if(userKey['.'] > 0) {userKey['.'] = 0; moveResult = move(piece, [1, 1]); if(moveResult[0]) {gameCount=0;} if((!moveResult[0])&&(!moveResult[1])) {next = true;}}
        if(userKey.z > 0) {userKey.z = 0; rotate(piece, 1);}
        if(userKey.x > 0) {userKey.x = 0; rotate(piece, -1);}
        if(userKey.i > 0) {userKey.i = 0; hardDrop(piece, [0, 1]); next = true;}
        
        renderGame();
        
        if(next) {
            switchState(piece);
            pieceList.shift();
            pushPiece();

            if(checkOver()) {
                renderState = "gameover";
            }

            toRemove = checkThree();
            if(toRemove.length > 0) {
                renderState = "remove";
                removeCount = 150;
            }
        }
    }
    
    if(renderState === "remove") {
        renderRemove();
        removeCount--;
        if(removeCount === 0) {
            removeLines();
            score = score + 300;
            renderState = "game";
        }
    }

    if(renderState === "gameover") {
        renderGameover();
    }

    /* var debugTimeEnd = performance.now(); console.log(debugTimeEnd - debugTimeStart); */
}

/* initialize */

function gRI(min, max) { /* https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Math/random */
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}

function pushPiece() {
    pieceList.push([gRI(0, 3), 4, -2, gRI(0, 8)]);
}

/* keyboard */

var userKey = {'i':0, 'j':0, 'k':0, 'l':0, 'n':0, '.':0, 'z':0, 'x':0};
document.addEventListener('keydown', (event) => {if(renderState === "game"){userKey[event.key]++;}});

/* move */

function move(piece, way) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    removePieceFromBoard(piece);
    var newPiece = [type, x + way[0], y + way[1], ori]
    var moved;
    if (available(newPiece)) {
        placePieceOnBoard(newPiece);
        piece[1] = piece[1] + way[0];
        piece[2] = piece[2] + way[1];
        moved = true;
    } else {
        placePieceOnBoard(piece);
        moved = false;
    }
    removePieceFromBoard(piece);
    var testPiece = [type, piece[1], piece[2] + 1, ori];
    var a = available(testPiece);
    placePieceOnBoard(piece);
    return [moved, a]; /* 움직였는가? 다음 턴 아래에 공간이 있는가? */
}

function rotate(piece, dO) { /* dO 는 delta Orientation */
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3]; /* ; ori = piece[3]으로 하여 한동안 에러가 났었다. */
    removePieceFromBoard(piece);
    var testPiece;
    var placeToMove = [[0,0],[-dO,0],[dO,0],[0,1],[-dO,1],[dO,1],[0,-1],[-dO,-1],[dO,-1]];
    for(let i = 0; i < 9; i++) {
        testPiece = [type, x + placeToMove[i][0], y + placeToMove[i][1], (ori + dO * 2 + 8) % 8]
        if (available(testPiece)) {
            placePieceOnBoard(testPiece);
            piece[1] = piece[1] + placeToMove[i][0];
            piece[2] = piece[2] + placeToMove[i][1];
            piece[3] = (piece[3] + dO * 2 + 8) % 8;
            return true;
        }
    }
    placePieceOnBoard(piece);
    return false;
}

function hardDrop(piece, way) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    newPiece = hardDropPos(piece, way);
    removePieceFromBoard(piece)
    piece[1] = newPiece[1];
    piece[2] = newPiece[2];
    placePieceOnBoard(piece);
    return available([piece[0], piece[1], piece[2]+1, piece[3]]);
}

/* checking */

function checkOver() {
    for(let i = 0; i < 9; i++) {
        for(let j = -3; j < 0; j++) {
            if(board[j+3][i] > 0)
                return true;
        }
    }
    return false;
}

function checkThree() {
    var filledRows = [];
    var check;
    for(let j = 0; j < 16; j++) {
        check = true;
        for(let i = 0; i < 9; i++) {
            if(board[j+3][i] === -1) {
                check = false;
                break;
            }
        }
        filledRows[j] = check;
    }
    var index = [];
    var iA = 0; /* indexAdder */
    while(iA < 14) {
        if(filledRows[iA] && filledRows[iA+1] && filledRows[iA+2]) {
            index.push(iA);
            iA = iA + 3;
        } else {
            iA = iA + 1;
        }
    }
    return index;
}

function removeLines() {
    var l;
    for(let k=0; k < toRemove.length; k++) {
        l = toRemove[k]
        for(let j = l+2; j > -1; j--) {
            for(let i = 0; i < 9; i++) {
                board[j+3][i] = board[j][i];
            }
        }
        for(let j = -1; j > -4; j--) {
            for(let i = 0; i < 9; i++) {
                board[j+3][i] = -1;
            }
        }
    }
}

/* behind the scenes */

function hardDropPos(piece, way) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    removePieceFromBoard(piece);
    var newPiece = [type, x, y, ori];
    var i = 0;
    while(available(newPiece)) {
        i++;
        newPiece = [type, x + way[0] * i, y + way[1] * i, ori];
    }
    placePieceOnBoard(piece);
    return [type, x + way[0] * (i-1), y + way[1] * (i-1), ori];
}

function removePieceFromBoard(piece) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    var occupyData = checkOccupy(piece);
    for(let i = 0; i < 3; i++) {
        board[occupyData[i][1]+3][occupyData[i][0]] = -1;
    }
}

function placePieceOnBoard(piece) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    var occupyData = checkOccupy(piece);
    if (available(piece)) {
        board[occupyData[0][1]+3][occupyData[0][0]] = 0;
        board[occupyData[1][1]+3][occupyData[1][0]] = occupyData[3][0] + 1;
        board[occupyData[2][1]+3][occupyData[2][0]] = occupyData[3][1] + 1;
    }
}

function checkOccupy(piece) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    var angle = [ori % 8, (4 - type + ori) % 8];
    var delta = [[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1],[1,1]];
    return [[x, y], [x + delta[angle[0]][0], y + delta[angle[0]][1]], [x + delta[angle[1]][0], y + delta[angle[1]][1]], angle]; /* occupyData */
}

function available(piece) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    var occupyData = checkOccupy(piece);
    var X, Y;
    for(let i = 0; i < 3; i++) {
        X = occupyData[i][0]
        Y = occupyData[i][1]
        if (!((0 <= X) && (X < 9) && (-3 <= Y) && (Y < 16)))
            return false;
        if (board[Y+3][X] !== -1)
            return false;
    }
    return true;
}

/* ctx load */

function loadImage() {
    imgCd = new Image();
    imgCd.onload = checkLoad;
    imgCd.src = "images/cd.png";
    
    imgCn = new Image();
    imgCn.onload = checkLoad;
    imgCn.src = "images/cn.png";
    
    for(let i=0; i < 8; i++) {
        imgWd[i] = new Image();
        imgWd[i].onload = checkLoad;
        imgWd[i].src = "images/wd_" + i + ".png";
    
        imgWn[i] = new Image();
        imgWn[i].onload = checkLoad;
        imgWn[i].src = "images/wn_" + i + ".png";
    }
}

var count = 12; // blocks(10) + rmvr(1) + font(1)

function checkLoad() {
    count = count - 1;
    if(count === 0) {
        setInterval(main, 5); /* 얼마나 빨리 화면이 바뀌는지 결정 */
    }
}

function createGradient() {
    grad = ctx.createLinearGradient(0, 0, 0, 40 * 16);
    grad.addColorStop(0, "#CCC");
    grad.addColorStop(1, "#333");
}

function switchState(piece) {
    var type = piece[0], x = piece[1], y = piece[2], ori = piece[3];
    var occupyData = checkOccupy(piece);
    for(let i = 0; i < 3; i++) {
        X = occupyData[i][0]
        Y = occupyData[i][1]
        if ((0 <= board[Y+3][X])&&(board[Y+3][X] < 9)) {
            board[Y+3][X] = board[Y+3][X] + 9;
        } else if ((9 <= board[Y+3][X])&&(board[Y+3][X] < 18)) {
            board[Y+3][X] = board[Y+3][X] - 9;
        }
    }
}

function setBoard() {
    for(let i = -3; i < 16; i++) {
        board[i+3] = [];
        for(let j = 0; j < 9; j++) {
            board[i+3][j] = -1;
        }
    }
}

function debugBoard() {
    board = [[-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [ 0, 1,-1,-1,-1,-1,-1,-1,-1],
             [ 7,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1],
             [-1,-1,-1,-1,-1,-1,-1,-1,-1]];
}

/* ctx coordinates */

var padding = 310;

function renderGame() {
    ctx.clearRect(0, 0, 380 + padding * 2, 660); /* 추후 바뀔 수 있음 */
    drawGradient();
    drawTriangle(piece);
    placeBlocks();
    drawGrid();
    drawScore();
    drawBorder();
}

function renderRemove() {
    ctx.clearRect(0, 0, 380 + padding * 2, 660);
    drawGradient();
    placeBlocks();
    placeRemove();
    drawGrid();
    drawScore();
    drawBorder();
}

function renderGameover() {
    ctx.clearRect(0, 0, 380 + padding * 2, 660);
    drawGradient();
    placeBlocks();
    drawGrid();
    drawBorder();
    drawEnding();
}

function drawGradient() {
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(10 + padding, 10, 40*9, 40*16);
    ctx.restore();
}

function placeBlocks() {
    ctx.save();
    var imgToDraw;
    var boardTile;
    for(let i=0; i < 16; i++) {
        for(let j=0; j < 9; j++) {
            boardTile = board[i+3][j];
            if(boardTile > -1) {
                boardTile = (boardTile + biasDayNight) % 18
                if (boardTile == 0) {
                    imgToDraw = imgCd;
                } else if ((1 <= boardTile) && (boardTile < 9)) {
                    imgToDraw = imgWd[boardTile - 1];
                } else if (boardTile == 9) {
                    imgToDraw = imgCn;
                } else if ((10 <= boardTile) && (boardTile < 18)) {
                    imgToDraw = imgWn[boardTile - 10];
                }
                ctx.drawImage(imgToDraw, 10 + 40 * j + padding, 10 + 40 * i);
            }
        }
    }
    ctx.restore();
}

function placeRemove() {
    ctx.save();
    ctx.fillStyle = "#00F";
    for(let i=0; i < toRemove.length; i++) {
        ctx.drawImage(rmvr, -45 + padding, 10 + 40* toRemove[i] + 10);
    }
    ctx.restore();
}

function drawGrid() {
    ctx.save();
    if(biasDayNight === 0)
        ctx.strokeStyle = "#000";
    else
        ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    for(let i=1; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + padding, 10 + 40*i)
        ctx.lineTo(10 + 40*9 + padding, 10 + 40*i)
        ctx.stroke();
    }
    for(let j=1; j < 9; j++) {
        ctx.beginPath();
        ctx.moveTo(10 + 40*j + padding, 10)
        ctx.lineTo(10 + 40*j + padding, 10 + 40*16)
        ctx.stroke();
    }
    ctx.restore();
}

function drawBorder() {
    ctx.save();
    if(biasDayNight === 0)
        ctx.strokeStyle = "#000";
    else
        ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.strokeRect(5 + 1 + padding, 5 + 1, 40 * 9 + 10 - 2, 40 * 16 + 10 - 2);
    ctx.restore();
}

function drawEnding() {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0 + padding, 0, 380, 660);
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.font = "60px Cafe24SsurroundAir"
    ctx.fillText("끝", padding + 380 / 2, 240);
    ctx.font = "30px Cafe24SsurroundAir"
    ctx.fillText("점수: " + score, padding + 380 / 2, 660 - 240);
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.fillStyle = "rgb(59, 134, 202)";
    ctx.font = "30px Cafe24SsurroundAir"
    ctx.fillText("점수: " + score, padding + 380 + 5, 30);
    ctx.restore();
}

function drawTriangle(piece) {
    ctx.save();
    var occupyData;

    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;

    var down = hardDropPos(piece, [0, 1]);
    occupyData = checkOccupy(down);
    for(let i = 0; i < 3; i++) {
        X = occupyData[i][0]
        Y = occupyData[i][1]
        ctx.fillStyle = "rgb(59, 134, 202)";
        ctx.beginPath();
        ctx.moveTo(padding + 40 * X + 10 + 11, 40 * Y + 10 + 5);
        ctx.lineTo(padding + 40 * X + 10 + 29, 40 * Y + 10 + 5);
        ctx.lineTo(padding + 40 * X + 10 + 20, 40 * Y + 10 + 5 + 9);
        ctx.lineTo(padding + 40 * X + 10 + 11, 40 * Y + 10 + 5);
        ctx.fill();
        ctx.stroke();
    }
    var dl = hardDropPos(piece, [-1, 1]);
    occupyData = checkOccupy(dl);
    for(let i = 0; i < 3; i++) {
        X = occupyData[i][0]
        Y = occupyData[i][1]
        ctx.fillStyle = "rgb(158, 77, 182)";
        ctx.beginPath();
        ctx.moveTo(padding + 40 * X + 10 + 5, 40 * Y + 10 + 23);
        ctx.lineTo(padding + 40 * X + 10 + 5, 40 * Y + 10 + 35);
        ctx.lineTo(padding + 40 * X + 10 + 5 + 12, 40 * Y + 10 + 35);
        ctx.lineTo(padding + 40 * X + 10 + 5, 40 * Y + 10 + 23);
        ctx.fill();
        ctx.stroke();
    }

    var dr = hardDropPos(piece, [1, 1]);
    occupyData = checkOccupy(dr);
    for(let i = 0; i < 3; i++) {
        X = occupyData[i][0]
        Y = occupyData[i][1]
        ctx.fillStyle = "rgb(120, 88, 187)";
        ctx.beginPath();
        ctx.moveTo(padding + 40 * X + 10 + 35, 40 * Y + 10 + 23);
        ctx.lineTo(padding + 40 * X + 10 + 35, 40 * Y + 10 + 35);
        ctx.lineTo(padding + 40 * X + 10 + 35 - 12, 40 * Y + 10 + 35);
        ctx.lineTo(padding + 40 * X + 10 + 35, 40 * Y + 10 + 23);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function switchDayNight() {
    if(biasDayNight === 0)
        biasDayNight = 9;
    else
        biasDayNight = 0;

    if(biasDayNight === 0)
        document.body.style.background = "#FFF";
    else
        document.body.style.background = "#000";

    if(biasDayNight === 0)
        buttonDayNight.innerText = "밤";
    else
        buttonDayNight.innerText = "낮";

}

function template() {
    ctx.save();
    ctx.restore();
}