//contains the database access functions
var schemas = require("./schemas");

//'async' specifies that the function is asynchronous
//'await' will wait for the query to run so a promise is not needed
async function getPlayer(name) {
    await schemas.Player.findOne({"name": name})
}

async function getBoard(id) {e
    await schemas.Board.findOne({ _id: id });
}

module.exports.getPlayer = getPlayer;
module.exports.getBoard = getBoard;