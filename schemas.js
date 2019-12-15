var mongoose = require("mongoose");

var Board = mongoose.model("Board", {
    layout: [Number]
});

var Player = mongoose.model("Player", {
    name: String,
    clicks: Number
});

module.exports.Player = Player;
module.exports.Board = Board;