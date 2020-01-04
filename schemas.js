var mongoose = require("mongoose");

var Board = mongoose.model("Board", {
    name: String,
    layout: [Number],
    inputLayout: [Number]
});

var Player = mongoose.model("Player", {
    name: String,
    colour: String,
    clicks: Number
});

module.exports.Player = Player;
module.exports.Board = Board;