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
        var typingTimeout;

        socket.onmessage = function (event) {
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
                    canvas.print(canvas.ctx, 25, 25, "#ffa500");
                    inputCanvas.initEmpty(gridRows, gridCol);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                if ("id" in eventObject) {
                    userId = eventObject.id;
                }

                if ("userLayout" in eventObject) {
                    inputCanvas = processCanvas(inputCanvas, eventObject.userLayout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                if ("topClicks" in eventObject) {
                    eventObject.topClicks.forEach(function (topClick, i) {
                        switch (i) {
                            case 0:
                                $('#firstPlaceName').text(topClick.name);
                                $('#firstPlaceScore').text(topClick.clicks);
                            case 1:
                                $('#secondPlaceName').text(topClick.name);
                                $('#secondPlaceScore').text(topClick.clicks);
                            case 2:
                                $('#thirdPlaceName').text(topClick.name);
                                $('#thirdPlaceScore').text(topClick.clicks);
                            case 3:
                                $('#fourthPlaceName').text(topClick.name);
                                $('#fourthPlaceScore').text(topClick.clicks);
                            case 4:
                                $('#fifthPlaceName').text(topClick.name);
                                $('#fifthPlaceScore').text(topClick.clicks);
                        }
                    })
                }

                if ("chatName" in eventObject) {
                    //document.getElementById("chat").innerHTML += eventObject.chatName.fontcolor(eventObject.chatColour) + ": " + eventObject.chatMessage + "<br>";
                    $('#chat')
                        .append($('<span>').css('color', eventObject.chatColour).text(eventObject.chatName))
                        .append($('<span>').text(eventObject.chatMessage))
                        .append($('<br>'));
                }

                if ("counter" in eventObject) {
                    $('#counter').text(eventObject.counter);

                    if (eventObject.userTurn === undefined || eventObject.userTurn === "") {
                        console.log(eventObject.userTurn);
                        $('#userTurn').text("Players needed to continue the game...");
                    }
                    else {

                        console.log(eventObject.userTurn);
                        $('#userTurn').text("It is currently " + eventObject.userTurn + "'s turn");
                    }
                    if (eventObject.userTurn !== $('#userId').text()) {
                        $('#canvas').css({ "pointer-events": "none" });
                    }
                    else {
                        
                        $('#canvas').css({ "pointer-events": "auto" });

                        if (eventObject.counter >= 5) {
                            console.log("This client SHOULD be clicking");
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

                if ("typingUser" in eventObject) {
                    $('.typingPlayer').text(eventObject.typingUser + " is typing...");
                    if (typingTimeout !== undefined)
                        clearTimeout(typingTimeout);

                    typingTimeout = setTimeout(function () {
                        $('.typingPlayer').text("");
                    }, 1000);
                }

                if ("personalClick" in eventObject) {
                    $('#userPlaceScore').text(eventObject.personalClick);
                }

                if ("onlinePlayers" in eventObject) {                    
                    $('#online').text("");
                    eventObject.onlinePlayers.name.forEach(function (topClick, i) {
                        console.log("USERNAME " + topClick);
                        $('#online')
                            .append($('<span>').text(topClick))
                            .append($('<br>'));
                    })
                }

                if ("failedPlayer" in eventObject) {
                    console.log("FAILED CREATION");
                }
            }
            catch (error) {
                console.log("error " + error);
                console.log("error websocket received = " + event.data);
            }
        }

        //Add functions to the scope
        $scope.initGame = function () {
            $http.get("/initgame").then(function (response) {
                $("#gameId").html(response.data["gameId"]);
                canvas = processCanvas(canvas, response.data["layout"]);
                console.log(canvas);
                canvas.print(canvas.ctx, 25, 25, "#ffa500");
                inputCanvas.initEmpty(gridRows, gridCol);
                var chatTextbox = $('#message');

                canvas.canvas.addEventListener("mousedown", function (e) {
                    [x, y] = getMousePosition(canvas, e);
                    layout = determineXY(canvas, x, y);
                    inputCanvas = addToInputCanvas(inputCanvas, layout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, "rgba(255,0,0,0)");

                    if ($("#userId").text() !== "" && $("#userId").text() !== undefined && $("#userId").text() !== null) {
                        socket.send(JSON.stringify({
                            _id: $("#gameId").html(),
                            "username": $("#userId").text(),
                            "inputLayout": inputCanvas.board,
                            "colour": document.getElementById("userId").style.color
                        }));
                    }                    
                });

                chatTextbox.keypress(function () {
                    if ($("#userId").text() !== "" && $("#userId").text() !== undefined && $("#userId").text() !== null) {
                        socket.send(JSON.stringify({
                            "typingUser": $("#userId").text(),
                        }));
                    }
                })
            })          
        }

        $scope.newPlayer = function () {
            //Get the modal
            var modal = document.getElementById("userModal");

            //get the <span> element that closes the modal
            var span = document.getElementsByClassName("close")[0];

            //get the submit button
            var submit = document.getElementById("submitPlayer");
            var signIn = document.getElementById("signInPlayer");

            modal.style.display = "block";

            //close the modal when close is clicked 
            span.onclick = function () {
                modal.style.display = "none";
            }

            signIn.onclick = function () {
                var name = document.getElementsByName("playerName")[0].value;
                var password = document.getElementsByName("playerPassword")[0].value;
                try {
                    $http.get("/signInPlayer/" + name + "/" + password + "/" + userId).then(function (response) {
       
                        if (response.data["success"] === false)
                            window.alert("Login not found");
                        else {
                            $("#onlinePlayers").text(response.data["name"]);
                            $('#userId').css('color', response.data["colour"]).text(response.data["name"]);
                            $('#userPlaceName').text(response.data["name"]);
                            modal.style.display = "none";
                        }
                    });
                }
                catch (error) {
                    window.alert("Login not found");
                }
            }

            submit.onclick = function () {
                var name = document.getElementsByName("playerName")[0].value;
                var password = document.getElementsByName("playerPassword")[0].value;
                var colour;

                $('#colourSelector input:radio').each(function (index) {
                    if ($(this)[0].checked === true)
                        colour = $(this)[0].id;
                });

                if (/\s/.test(password) === false) {
                    if (name !== undefined && password !== "" && colour !== undefined) {
                        $http.get("/newPlayer/" + name + "/" + colour + "/" + userId + "/" + password).then(function (response) {
                            $("#onlinePlayers").html(response.data["success"]);

                            if (response.data["success"] === true) {
                                modal.style.display = "none";

                                $('#userId').css('color', colour).text(name);
                                $('#userPlaceName').text(name);

                            }
                            else
                                window.alert("Please no special characters or spaces in your name.\nOtherwise the name is already taken");
                        })
                    }
                    else {
                        window.alert("Please make sure to enter a username, password, and select a colour");
                    }
                }
                else {
                    window.alert("Please have no spaces in your password");
                }
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

            if ($("#userId").text() !== "" && $("#userId").text() !== undefined && $("#userId").text() !== null) {
                socket.send(JSON.stringify({
                    _id: $("#gameId").html(),
                    name: userId.innerHTML,
                    colour: userId.style.color,
                    message: message
                }));
            }

            document.getElementsByName("message")[0].value = "";
        }
    }
})