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
    response.contentType("application/json");
    response.send({ "gameId": boards._id, "layout": boards.layout });
})

app.get("/newgame", async function (request, response) {
    var board = await logic.newGame();
    response.contentType("application/json");
    response.send({ "gameId": board._id, "layout": board.layout});
})

app.get("/nextTurn/:gameId/:layout", async function (request, response) {
    var gameId = request.params.gameId;
    var layout = request.params.layout;
    var board = await logic.saveLayout(gameId, layout);
    response.contentType("application/json");
    response.send({ "gameId": board._id, "layout": board.layout });
})

app.get("/newPlayer/:name/:colour/:id", async function (request, response) {
    var name = request.params.name;
    var userid = Number(request.params.id);
    var colour = await logic.getColour(request.params.colour);
    var player = await logic.setPlayer(name, colour);

    clients.forEach(function each(client) {
        if (client.id === userid) {
            client.username = name;
        }
    });

    var onlinePlayers = await logic.getOnlinePlayers(clients);

    clients.forEach(function each(client) {
        client.send(JSON.stringify({
            onlinePlayers
        }));
    })
})

// Initialise a HTTP server using the Express app.
var server = http.createServer(app);
// Initialise the web socket instance.
var wss = new WebSocketServer({ httpServer: server });
var connection;
var clients = [];
var id = 1;
var i = 0;
var currentTurn = 0;

set = setInterval(function () {    
    try {
        i++;
        clients.forEach(function each(client) {
            client.send(JSON.stringify({
                "counter": i,
                "userTurn": clients[currentTurn].username
            }));
        })

        if (i >= 5) {
            i = 0;
            currentTurn++;
            if (currentTurn > clients.length - 1)
                currentTurn = 0;

            while1: {
                while (clients[currentTurn].isConnected === false || clients[currentTurn].username === undefined) {
                    if (clients.length === 1)
                        break while1;

                    currentTurn++;
                    if (currentTurn > clients.length - 1)
                        currentTurn = 0;
                }
            }
        }
    }
    catch (error) { }
}, 1000);

wss.on("request", async function (request) {
    console.log("Received request\n");
    // Store the connection in a variable.
    connection = request.accept(null, request.origin);
    connection.id = id;
    connection.isConnected = true;
    id++;
    clients.push(connection);
    connection.send(JSON.stringify({
        "id": connection.id,
        "onlinePlayers": await logic.getOnlinePlayers(clients)
    }))

    // Set up the message event handler.
    connection.on("message", async function (message) {
        var obj = JSON.parse(message.utf8Data);
        var board;

        if ("layout" in obj) {
            obj.layout = await logic.nextGen(obj.layout);
            board = await logic.saveLayout(obj._id, obj.layout);

            clients.forEach(function each(client) {
                client.send(JSON.stringify({
                    _id: board._id,
                    layout: board.layout,
                    colour: obj.userColour
                }))
            })
        }

        if ("inputLayout" in obj) {
            var personalUser = await logic.setClick(obj.username);
            var topClicks = await db.getTop5Clickers()

            obj.inputLayout = await logic.convert1D(obj.inputLayout);

            clients.forEach(function each(client) {         
                if (client.id !== obj.id) {
                    client.send(JSON.stringify({
                        "playerId": obj.id,
                        "userLayout": obj.inputLayout,
                        "colour": obj.colour,
                        "topClicks": topClicks
                    }));
                }
                if (client.username === obj.username) {
                    client.send(JSON.stringify({
                        "personalClick": personalUser.clicks
                    }));
                }

            })
        }
        if ("message" in obj) {
            clients.forEach(function each(client) {
                client.send(JSON.stringify({
                    "chatName": obj.name,
                    "chatColour": obj.colour,
                    "chatMessage": obj.message
                }));
            })
        }

        if ("pong" in obj) {
            clients.forEach(function each(client) {
                if (client.id === obj.pong) {
                    client.isConnected = true;
                    client.username = obj.username;
                }
            });

            connection.send(JSON.stringify({
                "id": connection.id,
                "onlinePlayers": await logic.getOnlinePlayers(clients)
            }))
        }

        if ("typingUser" in obj) {
            clients.forEach(function each(client) {
                if (client.username !== obj.typingUser) {
                    client.send(JSON.stringify({
                        "typingUser": obj.typingUser
                    }))
                }                
            })
        }
    });

    connection.on("close", function (message) {
        clients.forEach(function each(client) {
            client.isConnected = false;
            client.send(JSON.stringify({
                "ping": client.id
            }));
        })
    });

    connection.on("error", function (message) {
        console.log("ERROR " + message);
        console.log("client " + connection.id + " is not connected");
    })
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