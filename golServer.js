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
// Initialise a HTTP server using the Express app.
var server = http.createServer(app);
// Initialise the web socket instance.
var wss = new WebSocketServer({ httpServer: server });
var connection;
var clients = [];
var id = 1;
var i = 0;
var currentTurn = 0;

app.get("/", function (request, response) {
    response.status(200).sendFile("/", { root: "client" });
});

//Called when a client enters the page
app.get("/initgame", async function (request, response) {
    //Get the public board
    var boards = await logic.getBoard({ "name": "public" });
    //sends the board layout and its ID to the client
    response.contentType("application/json");
    response.send({ "gameId": boards._id, "layout": boards.layout });
})

//Called when a client wishes to sign in
app.get("/signInPlayer/:name/:password/:userId", async function (request, response) {
    var name = request.params.name;
    var password = request.params.password;
    var userid = Number(request.params.userId);

    //Gets the user's credentials via the API. Returns false if not found
    var user = await logic.getPlayerLogin(name, password);

    //Notifies the client that the user was not found
    if (user === false) {
        response.contentType("application/json");
        response.send({ "success": false });
    }
    else {
        //Sends the credentials to the requesting client
        clients.forEach(function each(client) {
            if (client.id === userid) {
                //sets the client's username to the name of the Player
                client.username = name

                //Updates the user's click scoreboard count
                client.send(JSON.stringify({
                    "personalClick": user.clicks
                }));
            }
        });

        //Gets the list of online players
        var onlinePlayers = await logic.getOnlinePlayers(clients);

        //Updates all clients of the current users online since a client has just joined
        clients.forEach(async function each(client) {
            client.send(JSON.stringify({
                onlinePlayers
            }));
        });

        //Returns the user's credentials to the requesting client
        response.contentType("application/json");
        response.send({ "name": user.name, "colour": user.colour, "clicks": user.clicks });
    }
})

//requested when a client wishes to create a new user
app.get("/newPlayer/:name/:colour/:id/:password", async function (request, response) {
    var name = request.params.name;
    var password = request.params.password;
    var userid = Number(request.params.id);
    //Colour needs to be stored as an RGB format
    var colour = await logic.getColour(request.params.colour);
    //Sets the player into the database via the API
    var player = await logic.setPlayer(name, password, colour);
    var success = false

    //logic.setPlayer is returned as "false" if the user was created unsuccessfully
    if (player !== false) {
        success = true;
        //sets the client's username to the name of the Player
        clients.forEach(function each(client) {
            if (client.id === userid) {
                client.username = name;
            }
        });
        //Gets the list of online players
        var onlinePlayers = await logic.getOnlinePlayers(clients);

        //Updates all clients of the current users online since a client has just joined
        clients.forEach(function each(client) {
            client.send(JSON.stringify({
                onlinePlayers
            }));
        })
    }
    //Success of the user creation is sent to the client
    response.contentType("application/json");
    response.send({ "success": success});
})
var set;
//Timer created for how long each player has until their turn is over
set = setInterval(function () {    
    try {
        i++;
        //Current counter and the current user is sent to all clients
        clients.forEach(function each(client) {
            client.send(JSON.stringify({
                "counter": i,
                "userTurn": clients[currentTurn].username
            }));
        })

        //When the counter reaches 5, it is set back to 0
        if (i >= 5) {
            i = 0;
            //The user whose turn it is is changed to the next player in the array
            currentTurn++;

            //If there is no next user in the array then go back to the start of the array
            if (currentTurn > clients.length - 1)
                currentTurn = 0;

            while1: {
                //Checks if the current player is connected and if they have signed in, if not then go to the next user
                while (clients[currentTurn].isConnected === false || clients[currentTurn].username === undefined) {
                    //If there is only 1 client connected then step out of this while-loop
                    if (clients.length === 1)
                        break while1;

                    //Iterate until a connected user is found
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
    // Store the connection in a variable.
    connection = request.accept(null, request.origin);

    //Current connection is given an ID so it can be distinguished
    connection.id = id;
    //Connection of this client is set to true
    connection.isConnected = true;
    //ID count is incremented by 1
    id++;
    //Current connected client is pushed to the "clients" array containg all the clients
    clients.push(connection);

    //Connected user is updated with their ID, the onlineplayers, and the scoreboard
    var topClicks = await db.getTop5Clickers()
    connection.send(JSON.stringify({
        "id": connection.id,
        "onlinePlayers": await logic.getOnlinePlayers(clients),
        "topClicks": topClicks
    }))

    // Set up the message event handler.
    connection.on("message", async function (message) {
        var obj = JSON.parse(message.utf8Data);
        var board;

        //If the client sends a websocket message with "layout" then it means an update
        //of the layout is ready
        if ("layout" in obj) {
            //API calculates the next generation of the game of life grid with the sent grid
            obj.layout = await logic.nextGen(obj.layout);
            //Next generation is saved to the database
            board = await logic.saveLayout(obj._id, obj.layout);

            //New layout is sent to all clients
            clients.forEach(function each(client) {
                client.send(JSON.stringify({
                    _id: board._id,
                    layout: board.layout,
                    colour: obj.userColour
                }))
            })
        }

        //Websocket message sent everytime the current user who's turn it is has clicked on the canvas
        if ("inputLayout" in obj) {
            //User's click count is incremented by 1
            var personalUser = await logic.setClick(obj.username);
            //Top 5 clickers may have changed so it is retrieved from the database
            var topClicks = await db.getTop5Clickers()

            //The user's click layout must be converted to a 1D array before being sent
            obj.inputLayout = await logic.convert1D(obj.inputLayout);

            //User's click layout is sent to everyone as well as an update to the scoreboard
            clients.forEach(function each(client) {         
                if (client.id !== obj.id) {
                    client.send(JSON.stringify({
                        "playerId": obj.id,
                        "userLayout": obj.inputLayout,
                        "colour": obj.colour,
                        "topClicks": topClicks
                    }));
                }

                //User's personal click score is also sent
                if (client.username === obj.username) {
                    client.send(JSON.stringify({
                        "personalClick": personalUser.clicks
                    }));
                }

            })
        }

        //Sent by the client/s when there is a new message sent
        if ("message" in obj) {
            //Message is sent to all clients with the sender's name and their colour
            clients.forEach(function each(client) {
                client.send(JSON.stringify({
                    "chatName": obj.name,
                    "chatColour": obj.colour,
                    "chatMessage": obj.message
                }));
            })
        }

        //Server sends "ping" to all users when there's a disconnection, clients that "pong"
        //back are confirmed as still having connection
        if ("pong" in obj) {
            clients.forEach(function each(client) {
                //The client sends "pong" along with its ID
                if (client.id === obj.pong) {
                    client.isConnected = true;
                    client.username = obj.username;
                }
            });
        }

        //Sent when a user is typing a message
        if ("typingUser" in obj) {
            //Sends to all clients except for the typing client.
            //Notifies the clients that this client is typing
            clients.forEach(function each(client) {
                if (client.username !== obj.typingUser) {
                    client.send(JSON.stringify({
                        "typingUser": obj.typingUser
                    }))
                }                
            })
        }
    });

    //If there is a disconnection then the server is notified but it is
    //not knonwn which client has disconnected...
    connection.on("close", function () {
        //Every client is set as not connected until they can prove it
        clients.forEach(function each(client) {
            client.isConnected = false;
            //a "ping" is sent to all clients and they are expected to reply with 
            //"pong"
            client.send(JSON.stringify({
                "ping": client.id
            }));
        })

        //After 1 second, the online player list is updated. 1 second is waited to give
        //all the online clients a chance to "pong" back
        setTimeout(function () {
            clients.forEach(async function each(client) {
                client.send(JSON.stringify({
                    "id": connection.id,
                    "onlinePlayers": await logic.getOnlinePlayers(clients)
                }))
            })
        }, 1000);
    });

    connection.on("error", function (message) {
        console.log("ERROR " + message);
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