//contains the database access functions
var schemas = require("./schemas");

//'async' specifies that the function is asynchronous
//'await' will wait for the query to run so a promise is not needed
async function getPlayer(name) {
    await schemas.Player.findOne({"name": name})
}

async function getBoard(query) {
    return await schemas.Board.findOne(query);
}

async function getBoards() {
    return await schemas.Board.find();
}

async function setPlayer(name) {
    var player = new schemas.Player({
        "name" : name,
        clicks : 0 
    })

    console.log(player);
    player.save();
    return player;
}

module.exports.setPlayer = setPlayer;
module.exports.getBoards = getBoards;
module.exports.getPlayer = getPlayer;
module.exports.getBoard = getBoard;