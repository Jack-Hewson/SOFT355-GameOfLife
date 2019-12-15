var mongoose = require("mongoose");
var schemas = require("./schemas");

var uri = "mongodb+srv://JHewson:Gw2NcW8sDgbbhLb@cluster0-wgihg.gcp.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true });

var board = new schemas.Board({ "layout": [0,0,0,1,0,1,0,1,0,1,0]});
board.save();