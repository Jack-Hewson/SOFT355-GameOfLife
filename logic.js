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

async function newGame() {
    //generate a random grid
    var board = randomBoard();
    
    var game = new schemas.Board({
        layout: board
    });

    //console.log(game);
    await game.save();
    //console.log("saved");
    return game;
}

async function saveLayout(gameId, layout) {
    //console.log("THIS IS THE LAYOUT " + layout);
    var game = await db.getBoard(gameId);
    //console.log(game);
    game.layout = randomBoard();

    await game.save();
    //console.log("UPDATED LAYOUT " + game.layout);
    return game;
}

module.exports.saveLayout = saveLayout;
module.exports.newGame = newGame;