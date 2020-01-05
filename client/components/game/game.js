var gameModule = angular.module("game", ["ngRoute"]);

function GameOfLife() {
    this.initEmpty = function (width, height) {
        this.board = new Array(height);
        for (var x = 0; x < height; x++) {
            this.board[x] = new Array(width);
            for (var y = 0; y < width; y++) {
                this.board[x][y] = 0;
            }
        }
    }
    this.initLoad = function (width, height, layout) {
        this.board = [];

        var i, k;

        for (i = 0, k = -1; i < layout.length; i++) {
            if (i % width === 0) {
                k++;
                this.board[k] = [];
            }
            this.board[k].push(layout[i]);
        }
    }

    this.print = function (ctx, w, h, colour) {
        
        //iterates through the rows and then the columns of the matrix
        for (var x = 0; x < this.board.length; x++) {//x and y must be reversed to align with what you see on the grid
            for (var y = 0; y < this.board[x].length; y++) {
                //Checks if the current block is even valid (must be 1)
                //console.log("BOARD IS " + this.board[x][y]);
                if (this.board[x][y] == 1) {
                    ctx.fillStyle = colour;
                    //Fills in the square to be either orange(alive) or white(dead)
                    ctx.fillRect(y * h, x * w, h, w);
                    //Sets the black grid
                    ctx.strokeRect(y * h, x * w, h, w);
                }//if not 1 then make it dead (white)
                else if (this.board[x][y] == -1) {
                    ctx.clearRect(y * h, x * w, h, w);
                    ctx.strokeRect(y * h, x * w, h, w);
                }
                else if (colour == "#ffa500") {
                    //ctx.clearRect(y * h, x * w, h, w);
                    //ctx.strokeRect(y * h, x * w, h, w);
                    ctx.fillStyle = "white";

                    //Creates the grid lines
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "black";
                    //Fills in the square to be either orange(alive) or white(dead)
                    ctx.fillRect(y * h, x * w, h, w);
                    //Sets the black grid
                    ctx.strokeRect(y * h, x * w, h, w);
                    //return;
                }
                else {
                    ctx.clearRect(y * h, x * w, h, w);
                    ctx.strokeRect(y * h, x * w, h, w);
                }
            }
        }
    }
}

function getMousePosition(c, event) {
    let rect = c.canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    //console.log("Coordinate x: " + x, "Coordinate y: " + y);
    return [x, y];    
}

function determineXY(c, x, y) {
    //canvas is split into 25x25 blocks so coords are divided by 25 each
    //1 is subtracted due to blocks starting at [0,0]
    x = Math.ceil(x / (25)) - 1;
    y = Math.ceil(y / (25)) - 1;
   // console.log("grid x: " + x, "grid y: " + y);
    var old = JSON.parse(JSON.stringify(c.board));
    c.board[y][x] ^= 1;
    var change = [];
    for (var i = 0; i <= c.board.length - 1; i++) {
        for (var j = 0; j <= c.board[i].length - 1; j++) {
            change.push(c.board[i][j]- old[i][j]);
        }        
    }
    return change;
}

function addToInputCanvas(inputCanvas, change) {
   // console.log(inputCanvas.board);
   // console.log(change);

    var current = JSON.parse(JSON.stringify(inputCanvas.board));
    inputCanvas = processCanvas(inputCanvas, change);
    //console.log("board length " + inputCanvas.board.length);
    //console.log("board length[i]" + inputCanvas.board[i].length);

    for (var i = 0; i <= inputCanvas.board.length - 1; i++) {
        for (var j = 0; j <= inputCanvas.board[i].length - 1; j++) {
            if (inputCanvas.board[i][j] == 1) {
               // console.log(inputCanvas.board[i][j] + " is 1");
                current[i][j] = 1;
            }
            else if (inputCanvas.board[i][j] == -1) {
               // console.log(inputCanvas.board[i][j] + " is -1");
                current[i][j] = 0;
            }
        }
    }
    inputCanvas.board = current;
    //console.log("current " + inputCanvas.board);
    return inputCanvas;
}

function processCanvas(canvas, layout) {
    var width = document.getElementById("canvas").width;
    var height = document.getElementById("canvas").height
    var gridRows = Math.round(width / 25);
    var gridCol = Math.round(height / 25);
    canvas.initLoad(gridRows, gridCol, layout);
    return canvas;
}

gameModule.component("game", {
    templateUrl: "components/game/game.template.html",

    controller: function GameController($scope, $http) {
        //Initialise the websocket connection
        var socket = new WebSocket("ws://localhost:9000/");        
        var canvas = new GameOfLife();
        var inputCanvas = new GameOfLife();
        var userId;
        inputCanvas.canvas = document.getElementById('inputCanvas');
        inputCanvas.ctx = inputCanvas.canvas.getContext('2d');
        canvas.canvas = document.getElementById('canvas');
        canvas.ctx = canvas.canvas.getContext('2d');
        var width = document.getElementById("canvas").width;
        var height = document.getElementById("canvas").height
        var gridRows = Math.round(width / 25);
        var gridCol = Math.round(height / 25);

        socket.onmessage = function (event) {
            //console.log("MESSAGE FROM SERVER RECEIVED");
            //console.log(event.data);

            try {
                var eventObject = JSON.parse(event.data)

                if ("ping" in eventObject) {
                    socket.send(JSON.stringify({
                        "pong": eventObject.ping,
                        "username": $('#userId').text()
                    }));
                }

                if ("layout" in eventObject) {
                    canvas = processCanvas(canvas, eventObject.layout);
                    console.log("Message from server: '" + eventObject._id + "'");
                    canvas.print(canvas.ctx, 25, 25, "#ffa500");
                    inputCanvas.initEmpty(gridRows, gridCol);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                if ("id" in eventObject) {
                    userId = eventObject.id;
                    console.log("User ID = " + eventObject.id);
                }

                if ("userLayout" in eventObject) {
                    //console.log("Player " + eventObject.playerId + " has done this " + eventObject.userLayout);
                    //console.log(eventObject.userLayout);
                    inputCanvas = processCanvas(inputCanvas, eventObject.userLayout);
                    //console.log(inputCanvas.board);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                if ("chatName" in eventObject) {
                    console.log(eventObject.chatColour);
                    //document.getElementById("chat").innerHTML += eventObject.chatName.fontcolor(eventObject.chatColour) + ": " + eventObject.chatMessage + "<br>";
                    $('#chat')
                        .append($('<span>').css('color', eventObject.chatColour).text(eventObject.chatName))
                        .append($('<span>').text(": " + eventObject.chatMessage))
                        .append($('<br>'));
                }

                if ("counter" in eventObject) {
                    $('#counter').text(eventObject.counter);
                    $('#userTurn').text("It is currently " + eventObject.userTurn + "'s turn");

                    if (eventObject.userTurn !== $('#userId').text()) {
                        console.log("This client should not be clicking");
                        $('#canvas').css({ "pointer-events": "none" });
                        //pointer - events: none;
                    }
                    else {
                        console.log("This client SHOULD be clicking");
                        $('#canvas').css({ "pointer-events": "auto" });

                        if (eventObject.counter >= 5) {
                            setTimeout(function () {
                                socket.send(JSON.stringify({
                                    _id: $("#gameId").html(),
                                    layout: canvas.board,
                                    userLayout: inputCanvas.board,
                                    userColour: document.getElementById("userId").style.color
                                }))
                            }, 1000);
                        }
                    }


                }
            }
            catch (error) {
                console.log("error " + error);
                console.log("error websocket received = " + event.data);
            }
        }

        socket.onclose = function() { 
            socket.send("BYE BYE");
        }

        //Add functions to the scope
        $scope.initGame = function () {
            $http.get("/initgame").then(function (response) {
                $("#openBoards").html(response.data["gameId"]);
                $("#gameId").html(response.data["gameId"]);
                canvas = processCanvas(canvas, response.data["layout"]);
                console.log(canvas);
                canvas.print(canvas.ctx, 25, 25, "#ffa500");
                inputCanvas.initEmpty(gridRows, gridCol);

                canvas.canvas.addEventListener("mousedown", function (e) {
                    [x, y] = getMousePosition(canvas, e);
                    layout = determineXY(canvas, x, y);
                    inputCanvas = addToInputCanvas(inputCanvas, layout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, "#0000ff");

                    socket.send(JSON.stringify({
                        _id: $("#gameId").html(),
                        "username": $("#userId").text(),
                        "inputLayout": inputCanvas.board,
                        "colour": document.getElementById("userId").style.color
                    }));
                });
            })          
        }
        /*
        $scope.newGame = function () {
            //Initialise a new game
            $http.get("/newgame").then(function (response) {
                $("#gameId").html(response.data["gameId"]);

                //socket.send("Hello world from the angularJS client: gameId is '" + response.data["layout"] + "'");
                processCanvas(canvas, response.data["layout"]);
                canvas.print(canvas.ctx, 25, 25, "#ffa500");
            });
        }
        */
        /*
        $scope.nextTurn = function () {
            $("#next").attr("disable", true);
            var layout = canvas.board;
            //console.log("CANVAS " + layout);
            //var uri = "/nextTurn/" + gameId + "/" + layout;

            //$http.get(uri).then(function (response) {
            //    console.log(response);
            //})

            socket.send(JSON.stringify({
                _id: $("#gameId").html(),
                layout: canvas.board,
                userLayout: inputCanvas.board,
                userColour: document.getElementById("userId").style.color
            }))
        }
        */
        /*
        $scope.commit = function () {
            console.log("COMMITED " + inputCanvas.board);
            socket.send(JSON.stringify({
                _id: $("#gameId").html(),
                "commitedLayout": inputCanvas.board
            }));
        }
        */
        $scope.newPlayer = function () {
            //Get the modal
            var modal = document.getElementById("userModal");

            //get the <span> element that closes the modal
            var span = document.getElementsByClassName("close")[0];

            //get the submit button
            var submit = document.getElementById("submitPlayer");
            
            modal.style.display = "block";

            //close the modal when close is clicked 
            span.onclick = function () {
                modal.style.display = "none";
            }

            submit.onclick = function () {
                var name = document.getElementsByName("playerName")[0].value;
                var colour = document.getElementsByName("playerColour")[0].value;
                var username = document.getElementById("userId");

                username.innerHTML = name;
                username.style.color = colour;

                $http.get("/newPlayer/" + name + "/" + colour + "/" + userId).then(function (response) {
                    $("#onlinePlayers").html(response.data["name"] + " - clicks: " + response.data["click"]);
                })

                modal.style.display = "none";
            }

            //close the modal when the user clicks anywhere else
            window.onclick = function (event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            }
        }

        $scope.sendMessage = function () {
            var userId = document.getElementById("userId");
            var message = document.getElementsByName("message")[0].value;

            console.log("colour is " + userId.style.color);

            socket.send(JSON.stringify({
                _id: $("#gameId").html(),
                name: userId.innerHTML,
                colour: userId.style.color,
                message: message
            }));
        }
    }
})