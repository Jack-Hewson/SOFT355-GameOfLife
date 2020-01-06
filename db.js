//contains the database access functions
var schemas = require("./schemas");

//'async' specifies that the function is asynchronous
//'await' will wait for the query to run so a promise is not needed
async function getPlayer(name) {
    return await schemas.Player.findOne({"name": name})
}

async function getBoard(query) {
    return await schemas.Board.findOne(query);
}

async function getBoards() {
    return await schemas.Board.find();
}

async function setPlayer(name,colour) {
    var player = new schemas.Player({
        "name": name,
        "colour":colour,
        clicks : 0 
    })

    player.save();
    return player;
}

async function getTop5Clickers() {
    return await schemas.Player.aggregate([
        { $sort: {clicks:-1}},
        {$limit: 5 }
    ])
}

module.exports.getTop5Clickers = getTop5Clickers;
module.exports.setPlayer = setPlayer;
module.exports.getBoards = getBoards;
module.exports.getPlayer = getPlayer;
module.exports.getBoard = getBoard;