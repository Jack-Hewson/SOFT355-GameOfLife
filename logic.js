var schemas = require("./schemas");
var db = require("./db");

function randomBoard() {
    var board = new Array();

    return board = [1, 2, 3, 4, 5];
}

async function newGame() {
    //generate a random grid
    var board = randomBoard();
    
    var game = new schemas.Board({
        layout: [1,2,3,4,5]
    });
    console.log(game);
    await game.save();
    console.log("saved");
    return game;
}

module.exports.newGame = newGame;