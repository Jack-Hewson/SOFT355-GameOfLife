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

app.get("/newgame", async function (request, response) {
    var board = await logic.newGame();
    console.log("Created a new game: " + board._id);
    response.contentType("application/json");
    response.send({ "gameId": board._id });
})

// Initialise a HTTP server using the Express app.
var server = http.createServer(app);
// Initialise the web socket instance.
var wss = new WebSocketServer({ httpServer: server });

wss.on("request", function(request) {
    console.log("Received request");
    // Store the connection in a variable.
    var connection = request.accept(null, request.origin);
    console.log("connection: " + connection);

    // Set up the message event handler.
    connection.on("message", function(message) {
        console.log("Received a message");
        console.log("Received: " + message.utf8Data);
    });

    // Send a message to the client.
    connection.sendUTF("Hello world from the server!");
})

server.listen(port, async function() {
    // Connect to Mongoose.
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log("Connected to DB");

    // Some output for the interested reader...
    console.log("Listening on " + port);
})