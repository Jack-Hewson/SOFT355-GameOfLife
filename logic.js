var schemas = require("./schemas");
var db = require("./db");

//Not used but which generate a random layout of alive (1) and dead (0) cells
function randomBoard() {
    var board = new Array();
    height = 20;
    width = 28;

    for (var x = 0; x < height * width; x++) {
        board[x] = Math.round(Math.random());
    }
    return board;
}

//Converts the layout into a 1D array to be sent to the clients
async function convert1D(layout) {
    var board = new Array();
    height = 20;
    width = 28;

    for (var x = 0; x < layout.length; x++) {
        board = board.concat(layout[x]);
    }
    return board;
}

//Not used but will create a new board in the database with a random layout
async function newGame() {
    //generate a random grid
    var board = randomBoard();
    
    var game = new schemas.Board({
        layout: board
    });
    
    await game.save();
    return game;
}

//Only used during test. Calls on the database to remove the specific board
async function removeBoard(id) {
    await db.removeBoard(id);
}

//Retrieves the board with the specific query. "query" is used since sometimes
//it is called by the board's name (e.g "public") or by its objectid
async function getBoard(query) {
    return await db.getBoard(query);
}

//Saves the layout of the board
async function saveLayout(gameId, layout) {
    try {
        //Board is retrieved from the database
        var game = await db.getBoard({ "_id": gameId });
        //new layout is added to the board
        game.layout = await convert1D(layout);
        //changes are saved
        await game.save();
    }
    catch (error) {
        console.log(error);
    }
    return game;
}

//next Generation of the layout is calculated
async function nextGen(layout) {
    //array is created of the layout's length
    boardNext = new Array(layout.length);

    //board layout is a matrix so the array needs arrays added to it
    for (var i = 0; i < layout.length; i++) {
        boardNext[i] = new Array(layout[i].length);
    }

    //Iterates through each grid block
    for (var x = 0; x < layout.length; x++) {
        for (var y = 0; y < layout[x].length; y++) {
            //neighbour counter
            var n = 0;
            //checks the 8 neighbours around each block
            for (var dx = -1; dx <= 1; dx++) {
                for (var dy = -1; dy <= 1; dy++) {
                    //if the dx and dy values are 0 then it means it is on the block's position
                    if (dx === 0 && dy === 0) { }                    
                    else if (typeof layout[x + dx] !== 'undefined' && typeof layout[x + dx][y + dy] !== 'undefined' && layout[x + dx][y + dy]) {
                        n++;
                    }
                }
            }
            var currentBlock;

            //If 0 or 1 neighbours, cell dies
            if (n == 0 || n == 1)
                currentBlock = 0;
            //if 2 neightbours, cells stays the same
            else if (n == 2) {
                currentBlock = layout[x][y];
            }
            //If 3 neighbours, cells is "born"
            else if (n == 3)
                currentBlock = 1;
            //cell dies in any other state
            else
                currentBlock = 0;

            //matrix updated
            boardNext[x][y] = currentBlock;
        }
    }
    return boardNext;
}

//Increments the user's click counter by 1
async function setClick(userId) {
    //gets the player from the database
    var user = await db.getPlayer(userId);
    //Their click value is incremented by 1
    user.clicks++;
    //user is saved into the databse
    await user.save();
    return user;
}

//Calls on the database to remove the player
async function removePlayer(name) {
    await db.removePlayer(name);
}

//Called when the colour's RGB value is needed
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

//Checks username for any other characters except for letters and numbers
//Return false if there are special characters or spaces
function checkUsernameRegEx(name) {
    var valid = /^[a-zA-Z0-9]+$/g.test(name);
    return valid;
}

//Used for user registeration, check if the username is already in the database
async function checkUsernamePresent(name) {
    var valid = await db.getPlayer(name);
    if (valid === null)
        return true;
    else
        return false;
}

//Checks the username for any white spaces
function checkBlankSpaces(text) {
    return /\s/.test(text);
}

//Adds the new player into the database if it passes the above regEx tests and the username is not already used
async function setPlayer(name,password, colour) {
    if (checkUsernameRegEx(name) === true && await checkUsernamePresent(name) === true && checkBlankSpaces(password) === false) {

        return await db.setPlayer(name, password, colour);
    }
    else
        return false;
}

//Retrieves the player from the database
async function getPlayerLogin(name, password) {
    var user = await db.getPlayerLogin(name, password);
    //If "user" is not an object then it wasn't retrieved from the database
    //meaning it is not in the databse
    if (typeof (user) === "object")
        return user;
    else
        return false;
}

//Calls on the database to retrieve the player with the given name
async function getPlayer(name) {
    return await db.getPlayer(name);
}

//Takes the list of clients and determines which ones are online
async function getOnlinePlayers(clients) {
    //Javascript object created that will be sent to the clients
    var onlinePlayers = {
        "name": []
    };

    //Every client that "isConnected === true" is added to the object
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