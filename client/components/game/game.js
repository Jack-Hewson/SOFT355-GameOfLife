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
                if (this.board[x][y]) {
                    ctx.fillStyle = colour;
                }//if not 1 then make it dead (white)
                else {
                    ctx.fillStyle = "rgba(255,255,255,0)";
                    //Creates the grid lines
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "black";
                }

                //Sets the black grid
                ctx.strokeRect(y * h, x * w, h, w);

                //Fills in the square to be either orange(alive) or white(dead)
                ctx.fillRect(y * h, x * w, h, w);
            }
        }
    }
}

function getMousePosition(c, event) {
    let rect = c.canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    return [x, y];
    console.log("Coordinate x: " + x, "Coordinate y: " + y);
}

function determineXY(c, x, y) {
    c.ctx = c.canvas.getContext('2d');

    //canvas is split into 25x25 blocks so coords are divided by 25 each
    //1 is subtracted due to blocks starting at [0,0]
    x = Math.ceil(x / (25)) - 1;
    y = Math.ceil(y / (25)) - 1;
    console.log("grid x: " + x, "grid y: " + y);
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

function processCanvas(canvas, layout) {
    var width = document.getElementById("canvas").width;
    var height = document.getElementById("canvas").height
    var gridRows = Math.round(width / 25);
    var gridCol = Math.round(height / 25);
    canvas.initLoad(gridRows, gridCol, layout);
    canvas.canvas = document.getElementById('canvas');
    canvas.ctx = canvas.canvas.getContext('2d');
    //console.log(canvas.board);
    canvas.print(canvas.ctx, 25, 25,"#ffa500");
    return canvas;
}

function proccessUserCanvas(canvas, layout) {
    var width = document.getElementById("inputCanvas").width;
    var height = document.getElementById("inputCanvas").height
    var gridRows = Math.round(width / 25);
    var gridCol = Math.round(height / 25);
    canvas.initLoad(gridRows, gridCol, layout);
    canvas.canvas = document.getElementById('inputCanvas');
    canvas.ctx = canvas.canvas.getContext('2d');
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

        socket.onmessage = function (event) {
            console.log("MESSAGE FROM SERVER RECEIVED");
            //console.log(event.data);

            try {
                var eventObject = JSON.parse(event.data)

                if ("layout" in eventObject) {
                    processCanvas(canvas, eventObject.layout);
                    console.log("Message from server: '" + eventObject._id + "'");
                }

                if ("id" in eventObject) {
                    userId = eventObject.id;
                    console.log("User ID = " + eventObject.id);
                }

                if ("userLayout" in eventObject) {
                    console.log("Player " + eventObject.playerId + " has done this " + eventObject.userLayout);
                    inputCanvas = proccessUserCanvas(inputCanvas, eventObject.userLayout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, "#0000ff");
                }
            }
            catch (error) {
                console.log("error " + error);
            }
        }        

        //Add functions to the scope
        $scope.initGame = function () {
            $http.get("/initgame").then(function (response) {
                $("#openBoards").html(response.data["gameId"]);
                $("#gameId").html(response.data["gameId"]);
                canvas = processCanvas(canvas, response.data["layout"]);

                canvas.canvas.addEventListener("mousedown", function (e) {
                    //getMousePosition(canvas, e);
                    [x, y] = getMousePosition(canvas, e);
                    layout = determineXY(canvas, x, y);
                    inputCanvas = proccessUserCanvas(inputCanvas, layout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, "#0000ff");
                    //console.log("layout being sent to server " + layout);
                    socket.send(JSON.stringify({
                        "id": userId,
                        "inputLayout": layout
                    }));
                });
            })           
        }

        $scope.newGame = function () {
            //Initialise a new game
            $http.get("/newgame").then(function (response) {
                $("#gameId").html(response.data["gameId"]);

                //socket.send("Hello world from the angularJS client: gameId is '" + response.data["layout"] + "'");
                processCanvas(canvas, response.data["layout"]);
            });
        }

        $scope.nextTurn = function () {
            $("#next").attr("disable", true);
            var layout = canvas.board;
            console.log("CANVAS " + layout);
            //var uri = "/nextTurn/" + gameId + "/" + layout;

            //$http.get(uri).then(function (response) {
            //    console.log(response);
            //})

            socket.send(JSON.stringify({
                _id: $("#gameId").html(),
                layout: canvas.board
            }))
        }

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

                $http.get("/newPlayer/" + name).then(function (response) {
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
    }
})