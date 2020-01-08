var mongoose = require("mongoose");
var bcrypt = require('bcrypt-nodejs');

var Board = mongoose.model("Board", {
    name: String,
    layout: [Number],
    inputLayout: [Number]
});

var Player = mongoose.model("Player", {
    name: String,
    password: String,
    colour: String,
    clicks: Number
});

module.exports.Player = Player;
module.exports.Board = Board;