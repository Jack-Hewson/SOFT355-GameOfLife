//contains the database access functions
var schemas = require("./schemas");

//'async' specifies that the function is asynchronous
//'await' will wait for the query to run so a promise is not needed
async function getPlayer(name) {
    await schemas.Player.findOne({"name": name})
}

async function getBoard(query) {
    //console.log("DB " + id);
    return await schemas.Board.findOne(query);
}

async function getBoards() {
    return await schemas.Board.find();
}

module.exports.getBoards = getBoards;
module.exports.getPlayer = getPlayer;
module.exports.getBoard = getBoard;