var schemas = require("./schemas");
var db = require("./db");

function randomBoard() {
    var board = new Array();
    height = 20;
    width = 28;

    for (var x = 0; x < height * width; x++) {
        board[x] = Math.round(Math.random());
    }
    return board;
}

function convert1D(layout) {
    var board = new Array();
    height = 20;
    width = 28;

    for (var x = 0; x < layout.length; x++) {
        board = board.concat(layout[x]);
    }
    return board;
}

async function newGame() {
    //generate a random grid
    var board = randomBoard();
    
    var game = new schemas.Board({
        layout: board
    });
    
    await game.save();
    console.log("saved");

    return game;
}

async function saveLayout(gameId, layout) {
    console.log("SAVE LAYOUT RUNNNIG");
    var game = await db.getBoard({ "_id": gameId });
    
    game.layout = convert1D(layout);

    await game.save();
    return game;
}

async function saveUserLayout(gameId, layout) {
    console.log("SAVE USER-LAYOUT RUNNNIG");
    var game = await db.getBoard({ "_id": gameId });
    //game.inputLayout = convert1D(layout);
    var tempLayout;
    console.log("GAME VALUE IS..." + game);
    var test = game.inputLayout;
    tempLayout = convert1D(layout);
    console.log("temp " + tempLayout);

    for (var x = 0; x < game.layout.length; x++) {        
        if (test[x] == 0 && tempLayout[x] == 1) {
           console.log("x: " + x);
            console.log("game = " + test[x]);
           console.log("temp = " + tempLayout[x]);
            test[x] = 1;
       }
    }
    console.log("NEW TEST " + test.length);
    console.log("GAME LENGTH " + game.inputLayout.length);
    game.inputLayout = test;
    //console.log(game.inputLayout);
    await game.save;
    return game;
}

async function nextGen(layout) {
    console.log("Calculating next generation");
    
    boardNext = new Array(layout.length);

    for (var i = 0; i < layout.length; i++) {
        boardNext[i] = new Array(layout[i].length);
    }

    for (var x = 0; x < layout.length; x++) {
        for (var y = 0; y < layout[x].length; y++) {
            var n = 0;
            for (var dx = -1; dx <= 1; dx++) {
                for (var dy = -1; dy <= 1; dy++) {
                    if (dx == 0 && dy == 0) { }
                    else if (typeof layout[x + dx] !== 'undefined' && typeof layout[x + dx][y + dy] !== 'undefined' && layout[x + dx][y + dy]) {
                        n++;
                    }
                }
            }
            var currentBlock = layout[x][y];

            if (n == 0 || n == 1)
                currentBlock = 0;
            else if (n == 2) { }
            else if (n == 3)
                currentBlock = 1;
            else
                currentBlock = 0;

            boardNext[x][y] = currentBlock;
        }
    }

    return boardNext;
}

module.exports.saveUserLayout = saveUserLayout;
module.exports.nextGen = nextGen;
module.exports.saveLayout = saveLayout;
module.exports.newGame = newGame;