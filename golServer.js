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
    //console.log(boards.layout);
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
    //console.log("RECEIVED LAYOUT: " + layout);

    var board = await logic.saveLayout(gameId, layout);
    response.contentType("application/json");
    response.send({ "gameId": board._id, "layout": board.layout });
})

app.get("/newPlayer/:name/:colour/:id", async function (request, response) {
    var name = request.params.name;
    var colour = request.params.colour;
    var userid = Number(request.params.id);

    var player = await db.setPlayer(name, colour);

    clients.forEach(function each(client) {
        console.log("client id = " + client.id + " and userid = " + userid);
        console.log(client.id === userid)
        if (client.id === userid) {
            console.log("Entering the dragon");
            client.username = name;
        }
    });

    console.log(await db.getPlayer(name));
    response.contentType("application/json");
    response.send({ "name": player.name, "colour":player.colour,"clicks": player.clicks });
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
    
    i++;
    try {
        console.log("Current Turn = " + clients[currentTurn].username);
        //clients[currentTurn].send("IT IS " + clients[currentTurn].username + "'s turn");
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

            while (clients[currentTurn].isConnected === false) {
                currentTurn++;
                if (currentTurn > clients.length - 1)
                    currentTurn = 0;
            }
        }
    }
    catch (error) { }
}, 1000);

wss.on("request", function (request) {    
    console.log("Received request");
    // Store the connection in a variable.
    connection = request.accept(null, request.origin);
    connection.id = id;
    id++;
    clients.push(connection);
    connection.send(JSON.stringify({
        "id": connection.id
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
            var board = new Array();
            height = 20;
            width = 28;
            for (var x = 0; x < obj.inputLayout.length; x++) {
                board = board.concat(obj.inputLayout[x]);
            }
            
            obj.inputLayout = board;

            console.log("obj ID = " + obj._id);

            clients.forEach(function each(client) {
                //console.log("client ID = " + client.id);                
                if (client.id !== obj.id) {
                    console.log("sending to = " + client.id);
                    client.send(JSON.stringify({
                        "playerId": obj.id,
                        "userLayout": obj.inputLayout,
                        "colour": obj.colour
                    }));
                }
                else {
                    console.log("NOT sending to = " + client.id);   
                }
            })
        }

        if ("commitedLayout" in obj) {
            obj = await logic.saveUserLayout(obj._id, obj.commitedLayout);
           // console.log("OBJECT " + obj);
            //console.log(await db.getBoard({ "name": "public" }));
        }

        if ("userLayout" in obj) {
            //console.log("USER LAYOUT " + obj.userLayout);
        }

        if ("message" in obj) {
            console.log("user's colour " + obj.colour);
            clients.forEach(function each(client) {
                console.log("client ID = " + client.id);
                client.send(JSON.stringify({
                    "chatName": obj.name,
                    "chatColour": obj.colour,
                    "chatMessage": obj.message
                }));
            })
        }

        if ("pong" in obj) {
            console.log("PONG RECEIVED FROM " + obj.pong + " " + obj.username);

            clients.forEach(function each(client) {
                if (client.id === obj.pong) {
                    client.isConnected = true;
                    client.username = obj.username;
                }

                console.log("client " + client.id + " : " + client.isConnected);
            });
        }
    });

    connection.on("close", function (message) {

        console.log(connection.id + " lost connection");

        console.log("CONNECTION CLOSED " + message);
        //clients.splice(clients.indexOf(connection.id), 1);

        clients.forEach(function each(client) {
            client.isConnected = false;
            client.send(JSON.stringify({
                "ping": client.id
            }));
        })
    });

    //connection.on("pong", function (message) {
    //    console.log("Pong received from " + connection.id);
    //});

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