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
        //return matrix;

        //this.board = new Array(height);
        //for (var x = 0; x < height; x++) {
        //    this.board[x] = new Array(width);
        //    for (var y = 0; y < width; y++) {
        //        console.log(layout[(x + 1) * (y + 1)]);
        //        this.board[x][y] = layout[(x+1)*(y+1)];
        //    }
        //}
    }

    this.print = function (ctx, w, h) {
        //iterates through the rows and then the columns of the matrix
        for (var x = 0; x < this.board.length; x++) {//x and y must be reversed to align with what you see on the grid
            for (var y = 0; y < this.board[x].length; y++) {
                //Checks if the current block is even valid (must be 1)
                if (this.board[x][y]) {
                    ctx.fillStyle = "orange";
                }//if not 1 then make it dead (white)
                else {
                    ctx.fillStyle = "white";
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

    determineXY(c, x, y);
    console.log("Coordinate x: " + x, "Coordinate y: " + y);
}

function determineXY(c, x, y) {
    c.ctx = c.canvas.getContext('2d');

    //canvas is split into 25x25 blocks so coords are divided by 25 each
    //1 is subtracted due to blocks starting at [0,0]
    x = Math.ceil(x / (25)) - 1;
    y = Math.ceil(y / (25)) - 1;
    console.log("grid x: " + x, "grid y: " + y);
    //replaces the current value of the block with the opposite value (1 -> 0 or 0 -> 1)
    c.board[y][x] ^= 1;
    c.print(c.ctx, 25, 25);
}

gameModule.component("game", {
    templateUrl: "components/game/game.template.html",

    controller: function GameController($scope, $http) {
        //Initialise the websocket connection
        var socket = new WebSocket("ws://localhost:9000/");
        var layout;
        
        var canvas = new GameOfLife();

        socket.onmessage = function (event) {
            var eventObject = JSON.parse(event.data)
            console.log(eventObject.layout);
            if ("layout" in eventObject) {
                var width = document.getElementById("canvas").width;
                var height = document.getElementById("canvas").height
                var gridRows = Math.round(width / 25);
                var gridCol = Math.round(height / 25);
                canvas.initLoad(gridRows, gridCol, eventObject.layout);
                canvas.canvas = document.getElementById('canvas');
                canvas.ctx = canvas.canvas.getContext('2d');
                console.log(canvas.ctx);
                //canvas.board = layout;
                canvas.print(canvas.ctx, 25, 25);
            }

            console.log("Message from server: '" + eventObject._id + "'");
        }

        //Add functions to the scope
        $scope.initGame = function () {
            //Initialise a new game
            $http.get("/newgame").then(function (response) {
                $("#gameId").html(response.data["gameId"]);
                console.log(response.data["layout"]);

                //socket.send("Hello world from the angularJS client: gameId is '" + response.data["layout"] + "'");
                
                var startActive = 0;
                var squareLength = 25;
                var set;
                var width = document.getElementById("canvas").width;
                var height = document.getElementById("canvas").height
                var gridRows = Math.round(width / squareLength);
                var gridCol = Math.round(height / squareLength);

                //Generates an initial matrix of 0s only
                canvas.initLoad(gridRows, gridCol, response.data["layout"]);
                canvas.canvas = document.getElementById('canvas');
                canvas.ctx = canvas.canvas.getContext('2d');
                //console.log(canvas.ctx);
                //canvas.board = layout;
                console.log("Canvas board " + canvas.board);
                canvas.print(canvas.ctx, squareLength, squareLength);

                canvas.canvas.addEventListener("mousedown", function (e) {
                    getMousePosition(canvas, e);
                });
                //console.log(canvas.board)



                //socket.send("New layout is " + canvas.board);
            });
        }

        $scope.nextTurn = function () {
            $("#next").attr("disable", true);
            var gameId = $("#gameId").html();
            var layout = canvas.board;

            //var uri = "/nextTurn/" + gameId + "/" + layout;

            //$http.get(uri).then(function (response) {
            //    console.log(response);
            //})
            console.log("game.js " + layout);

            socket.send(JSON.stringify({
                _id: $("#gameId").html(),
                layout: canvas.board
            }))



            //console.log("NEXT TURN" + eventObject._id);
        }
    }
})