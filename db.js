//contains the database access functions
var schemas = require("./schemas");
var bcrypt = require('bcrypt-nodejs');

//'async' specifies that the function is asynchronous
//'await' will wait for the query to run so a promise is not needed

async function getPlayer(name) {
    return await schemas.Player.findOne({ "name": name });
}

async function removePlayer(name) {
    return await schemas.Player.deleteOne({ "name": name });
}

async function getBoard(query) {
    return await schemas.Board.findOne(query);
}

async function getBoards() {
    return await schemas.Board.find();
}

async function removeBoard(id) {
    await schemas.Board.deleteOne({_id: id});
}

//Retrieves the player and compares the user's password with the password the client provided
async function getPlayerLogin(name, password) {
    var user = await schemas.Player.findOne({ "name": name });
    try {
        //compares the stored encrypted password with the client's pasword
        if (bcrypt.compareSync(password, user.password) === true)
            return user;
    }
    catch (error) {
        return false;
    }        
}

//Adds the new player into the database and encrypts the password
async function setPlayer(name, password, colour) {
    var player = new schemas.Player({
        "name": name,
        "colour": colour,
        clicks : 0 
    })

    player.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    await player.save();
    return player;
}

//Retrieves the users in the database with the top 5 clicks
async function getTop5Clickers() {
    return await schemas.Player.aggregate([
        {$sort: {clicks:-1}},
        {$limit: 5}
    ])
}


module.exports.getPlayerLogin = getPlayerLogin;
module.exports.removePlayer = removePlayer;
module.exports.removeBoard = removeBoard;
module.exports.getTop5Clickers = getTop5Clickers;
module.exports.setPlayer = setPlayer;
module.exports.getBoards = getBoards;
module.exports.getPlayer = getPlayer;
module.exports.getBoard = getBoard;