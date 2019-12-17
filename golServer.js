//BASE EXPRESS APP TO SERVE THE GAME TO THE CLIENT
var express = require("express");
var mongoose = require("mongoose");
var WebSocketServer = require("websocket").server;
var http = require("http");
var db = require("./db");
var logic = require("./logic");

var uri = "mongodb+srv://JHewson:Gw2NcW8sDgbbhLb@cluster0-wgihg.gcp.mongodb.net/test?retryWrites=true&w=majority";
var port = 9000;

var app = express();
app.use(express.static("client"));

app.get("/", function (request, response) {
    response.status(200).sendFile("/", { root: "client" });
});

app.get("/initgame", async function (request, response) {
    var boards = await db.getBoard({ "name": "public" });
    console.log(boards.layout);
    response.contentType("application/json");
    response.send({ "gameId": boards._id, "layout": boards.layout });
    //var id = [];
    //boards.forEach(function (t) {
    //    id.push(t);
    //})
    //console.log(id);
    //response.contentType("application/json");
    //response.send({ "gameId": boards._id, "layout": boards.layout });
})

app.get("/newgame", async function (request, response) {
    var board = await logic.newGame();
    console.log("Created a new game: " + board._id);
    response.contentType("application/json");
    response.send({ "gameId": board._id, "layout": board.layout});
    //var boards = await db.getBoards();
    //console.log("BOARDS: " + boards);
})

app.get("/nextTurn/:gameId/:layout", async function (request, response) {
    var gameId = request.params.gameId;
    var layout = request.params.layout;
    console.log("RECEIVED LAYOUT: " + layout);

    var board = await logic.saveLayout(gameId, layout);
    response.contentType("application/json");
    response.send({ "gameId": board._id, "layout": board.layout });
})

// Initialise a HTTP server using the Express app.
var server = http.createServer(app);
// Initialise the web socket instance.
var wss = new WebSocketServer({ httpServer: server });
var connection;
var clients = [];
wss.on("request", function (request) {
    
    console.log("Received request");
    // Store the connection in a variable.
    connection = request.accept(null, request.origin);
    clients.push(connection);
    //console.log(clients);
    // Set up the message event handler.
    connection.on("message", async function (message) {
        var obj = JSON.parse(message.utf8Data);
        var board;
        //console.log(obj._id);

        if ("layout" in obj) {
            //console.log("Old layout " + obj.layout);
            board = await logic.saveLayout(obj._id, obj.layout);
            console.log("SERVER UPDATED " + board);

            clients.forEach(function each(client) {
                    client.send(JSON.stringify({
                        _id: board._id,
                        layout: board.layout
                    }))
            })

            //clients.forEach(function (client) {
            //    console.log(client);
            //    client.send(JSON.stringify({
            //        //_id: board._id,
            //        layout: board.layout
            //    }))
            //})
        }
    });
})

server.listen(port, async function() {
    await mongoose.connect(uri, {
    // Connect to Mongoose.
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to DB");

    // Some output for the interested reader...
    console.log("Listening on " + port);
})