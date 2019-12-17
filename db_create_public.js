var mongoose = require("mongoose");
var schemas = require("./schemas");

var uri = "mongodb+srv://JHewson:Gw2NcW8sDgbbhLb@cluster0-wgihg.gcp.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true });

function randomBoard() {
    var board = new Array();
    height = 20;
    width = 28;

    for (var x = 0; x < height * width; x++) {
        board[x] = 0;
    }
    return board;
}


var board = new schemas.Board({"name": "public", "layout": randomBoard()});
board.save();