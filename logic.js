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

async function convert1D(layout) {
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
    return game;
}

async function removeBoard(id) {
    await db.removeBoard(id);
}

async function getBoard(query) {
    return await db.getBoard(query)
}

async function saveLayout(gameId, layout) {
    try {
        var game = await db.getBoard({ "_id": gameId });
        game.layout = await convert1D(layout);
        await game.save();
    }
    catch (error) {
        console.log(error);
    }
    return game;
}

async function nextGen(layout) {
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

async function setClick(userId) {
    var user = await db.getPlayer(userId);
    user.clicks++;

    await user.save();
    return user;
}

async function removePlayer(name) {
    await db.removePlayer(name);
}

async function getColour(colour) {
    switch (colour) {
        case "red":
            colour = "rgb(255, 0, 0)";
            break;
        case "orange":
            colour = "rgb(255,165,0)";
            break;
        case "yellow":
            colour = "rgb(255,255,0)";
            break;
        case "green":
            colour = "rgb(0,128,0)";
            break;
        case "blue":
            colour = "rgb(0,0,255)";
            break;
        case "purple":
            colour = "rgb(128,0,128)";
            break;
    }
    return colour;
}

function checkUsernameRegEx(name) {
    //Checks username for any other characters except for letters and numbers
    //Return false if there are special characters or spaces
    var valid = /^[a-zA-Z0-9]+$/g.test(name);
    return valid;
}

async function checkUsernamePresent(name) {
    var valid = await db.getPlayer(name);
    if (valid === null)
        return true;
    else
        return false;
}

function checkBlankSpaces(text) {
    return /\s/.test(text);
}

async function setPlayer(name,password, colour) {
    if (checkUsernameRegEx(name) === true && await checkUsernamePresent(name) === true && checkBlankSpaces(password) === false) {

        return await db.setPlayer(name, password, colour);
    }
    else
        return false;
}

async function getPlayerLogin(name, password) {
    var user = await db.getPlayerLogin(name, password);
    if (typeof (user) === "object")
        return user;
    else
        return false;
}

async function getPlayer(name) {
    return await db.getPlayer(name);
}

async function getOnlinePlayers(clients) {
    var onlinePlayers = {
        "name": []
    };

    clients.forEach(function each(client, i) {
        if (client.isConnected === true)
            onlinePlayers.name[i] = client.username;
    })

    return onlinePlayers;
}

module.exports.getPlayerLogin = getPlayerLogin;
module.exports.removePlayer = removePlayer;
module.exports.removeBoard = removeBoard;
module.exports.getBoard = getBoard;
module.exports.getPlayer = getPlayer;
module.exports.setPlayer = setPlayer;
module.exports.getOnlinePlayers = getOnlinePlayers;
module.exports.getColour = getColour;
module.exports.convert1D = convert1D;
module.exports.setClick = setClick;
module.exports.nextGen = nextGen;
module.exports.saveLayout = saveLayout;
module.exports.newGame = newGame;