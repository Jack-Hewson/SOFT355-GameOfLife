var gameModule = angular.module("game", ["ngRoute"]);

function GameOfLife() {
    //sets the layout as empty (all values are 0)
    this.initEmpty = function (width, height) {
        this.board = new Array(height);
        //sets every value in the board to 0 (dead)
        for (var x = 0; x < height; x++) {
            this.board[x] = new Array(width);
            for (var y = 0; y < width; y++) {
                this.board[x][y] = 0;
            }
        }
    }

    //Loads the inputed layout into the object's board value
    this.initLoad = function (width, layout) {
        this.board = [];
        var i, k;
        //changes the matrix into an array
        for (i = 0, k = -1; i < layout.length; i++) {
            if (i % width === 0) {
                k++;
                this.board[k] = [];
            }
            this.board[k].push(layout[i]);
        }
    }

    //Prints the layout onto the canvas
    this.print = function (ctx, w, h, colour) {        
        //iterates through the rows and then the columns of the matrix
        for (var x = 0; x < this.board.length; x++) {//x and y must be reversed to align with what you see on the grid
            for (var y = 0; y < this.board[x].length; y++) {
                //Checks if the current block is even valid (must be 1)
                if (this.board[x][y] == 1) {
                    ctx.fillStyle = colour;
                    //Fills in the square to be either orange(alive) or white(dead)
                    ctx.fillRect(y * h, x * w, h, w);                    
                }//if not 1 then make it dead by clearing it
                else if (this.board[x][y] == -1) {
                    ctx.clearRect(y * h, x * w, h, w);
                }
                else if (colour == "#ffa500") {
                    ctx.fillStyle = "white";
                    //Creates the grid lines
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "black";
                    //Fills in the square to be either orange(alive) or white(dead)
                    ctx.fillRect(y * h, x * w, h, w);
                }
                else {
                    ctx.clearRect(y * h, x * w, h, w);
                }
                //Sets the black grid
                ctx.strokeRect(y * h, x * w, h, w);
            }
        }
    }
}

//called when the board is clicked on by the current user
//Finds the X and Y position on the board
function getMousePosition(c, event) {
    let rect = c.canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    return [x, y];    
}

function determineXY(x, y) {
    //canvas is split into 25x25 blocks so coords are divided by 25 each
    //1 is subtracted due to blocks starting at [0,0]
    x = Math.ceil(x / (25)) - 1;
    y = Math.ceil(y / (25)) - 1;
    return [x, y];
}

function determineChanges(c, x, y) {
    //stores the current board layout value first. It has to be stored this way otherwise
    //it is updated when the board layout is updated afterwards
    var old = JSON.parse(JSON.stringify(c.board));
    //The area of the board that was clicked on while receive a change of value
    //1 to 0 OR 0 to 1
    c.board[y][x] ^= 1;
    var change = [];
    //Iterates through the board layout to find where there were changes from pre-click
    //to post-click
    for (var i = 0; i <= c.board.length - 1; i++) {
        for (var j = 0; j <= c.board[i].length - 1; j++) {
            change.push(c.board[i][j] - old[i][j]);
        }
    }
    return change;
}

function addToInputCanvas(inputCanvas, change) {
    var current = JSON.parse(JSON.stringify(inputCanvas.board));
    inputCanvas = processCanvas(inputCanvas, change);
    //Iterates through the board to find the changes in the board
    for (var i = 0; i <= inputCanvas.board.length - 1; i++) {
        for (var j = 0; j <= inputCanvas.board[i].length - 1; j++) {
            //If the value is 1, this means the cell was dead and is now alive
            if (inputCanvas.board[i][j] == 1) {
                current[i][j] = 1;
            }
            //If the value is -1, this means the cell is now dead (0)
            else if (inputCanvas.board[i][j] == -1) {
                current[i][j] = 0;
            }
        }
    }
    inputCanvas.board = current;
    return inputCanvas;
}

function processCanvas(canvas, layout) {
    var width = document.getElementById("canvas").width;
    var gridRows = Math.round(width / 25);
    canvas.initLoad(gridRows, layout);
    return canvas;
}

gameModule.component("game", {
    templateUrl: "components/game/game.template.html",

    controller: function GameController($scope, $http) {
        //Initialise the websocket connection
        var socket = new WebSocket("ws://localhost:9000/");        
        var userId;
        var canvas = new GameOfLife();
        var inputCanvas = new GameOfLife();        
        var width = document.getElementById("canvas").width;
        var height = document.getElementById("canvas").height
        var gridRows = Math.round(width / 25);
        var gridCol = Math.round(height / 25);
        var typingTimeout;

        socket.onmessage = function (event) {
            try {
                //messages will be in stringified JSON format so need to be converted into JSON format
                var eventObject = JSON.parse(event.data)

                //server sends a "ping" when a client disconnects. All connected clients "pong" back to
                //show they're still connected
                if ("ping" in eventObject) {
                    socket.send(JSON.stringify({
                        "pong": eventObject.ping,
                        "username": $('#userId').text()
                    }));
                }

                //Received when the layout has been updated
                if ("layout" in eventObject) {
                    //GOL board is updated with the new layout
                    canvas = processCanvas(canvas, eventObject.layout);
                    canvas.print(canvas.ctx, 25, 25, "#ffa500");
                    //inputlayout is first cleared
                    inputCanvas.initEmpty(gridRows, gridCol);
                    //the now empty inputlayout is updated with the new layout
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                //Received when the server assigns the client with an ID
                if ("id" in eventObject) {
                    userId = eventObject.id;
                }

                //Received when a client has clicked on the board. This while updated the input layout
                //to show where they have clicked
                if ("userLayout" in eventObject) {
                    inputCanvas = processCanvas(inputCanvas, eventObject.userLayout);
                    inputCanvas.print(inputCanvas.ctx, 25, 25, eventObject.colour);
                }

                //Updates the scoreboard with the top 5 clickers
                if ("topClicks" in eventObject) {
                    eventObject.topClicks.forEach(function (topClick, i) {
                        //values are stored in an array from 1st to 5th place
                        //so the forEach iterates through each position to assign
                        //them to the correct place
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

                //Received when a new message has been sent
                if ("chatName" in eventObject) {
                    //Adds the user's name in their colour and their messages into the chatbox
                    $('#chat')
                        .append($('<span>').css('color', eventObject.chatColour).text(eventObject.chatName))
                        .append($('<span>').text(eventObject.chatMessage))
                        .append($('<br>'));
                }

                //Server sends an update to their timer every second and tells the clients who's turn it is
                if ("counter" in eventObject) {
                    //Update the clients timer
                    $('#counter').text(eventObject.counter);

                    //If there are no players signed in then it is no-one's turn
                    if (eventObject.userTurn === undefined || eventObject.userTurn === "") {
                        $('#userTurn').text("Players needed to continue the game...");
                    }
                    else {
                        //Updates the text for all clients for whos turn it is
                        $('#userTurn').text("It is currently " + eventObject.userTurn + "'s turn");
                    }

                    //If the current turn is not this client's turn then they cannot click on the canvas
                    if (eventObject.userTurn !== $('#userId').text()) {
                        $('#canvas').css({ "pointer-events": "none" });
                    }
                    else {
                        //If if it their turn then they can click on the canvas
                        $('#canvas').css({ "pointer-events": "auto" });

                        //If the timer is at 5 seconds then it is time to send the user's inputs
                        if (eventObject.counter >= 5) {
                            //Waits 1 second before sending since the client receives the 5th second
                            //at the start of the second 
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

                //Received when another player is typing
                if ("typingUser" in eventObject) {
                    $('.typingPlayer').text(eventObject.typingUser + " is typing...");

                    //checks if a a timer has already been set, if it has then it is cleared
                    if (typingTimeout !== undefined)
                        clearTimeout(typingTimeout);

                    //Sets a 1 second timer before clearing the message
                    typingTimeout = setTimeout(function () {
                        $('.typingPlayer').text("");
                    }, 1000);
                }

                //Received everytime the player clicks and when they sign in to update their click score
                if ("personalClick" in eventObject) {
                    $('#userPlaceScore').text(eventObject.personalClick);
                }

                //Received when the client loads the page, everytime a player signs in, and when a player disconnects
                if ("onlinePlayers" in eventObject) {
                    $('#online').text("");

                    //Iterates through each onlinePlayer
                    eventObject.onlinePlayers.name.forEach(function (topClick) {
                        //Adds their name to the online list
                        $('#online')
                            .append($('<span>').text(topClick))
                            .append($('<br>'));
                    })
                }
            }
            catch (error) {
                console.log("error " + error);
                console.log("error websocket received = " + event.data);
            }
        }

        //Add functions to the scope
        $scope.initGame = function () {
            inputCanvas.canvas = document.getElementById('inputCanvas');
            inputCanvas.ctx = inputCanvas.canvas.getContext('2d');
            canvas.canvas = document.getElementById('canvas');
            canvas.ctx = canvas.canvas.getContext('2d');

            //GET method used to request the initial data from the server
            $http.get("/initgame").then(function (response) {
                //ID for the specific game that has been joined
                $("#gameId").html(response.data["gameId"]);
                //Canvas sent from the server is the current layout of the board
                canvas = processCanvas(canvas, response.data["layout"]);
                canvas.print(canvas.ctx, 25, 25, "#ffa500");
                //The input canvas is not stored on the database so it is initialised as empty
                inputCanvas.initEmpty(gridRows, gridCol);

                //the chat text box will have a keypress listener assigned to it
                var chatTextbox = $('#message');

                //The main canvas can be clicked on so a "mousedown" event listener is added to it
                canvas.canvas.addEventListener("mousedown", function (e) {
                    //Mouse position in grid is found in terms of coordinates
                    [x, y] = getMousePosition(canvas, e);
                    //Coordinates are converted into grid X and Y positions
                    [x, y] = determineXY(x, y);
                    //Determines if the client has "born" a cell or "killed" a cell
                    layout = determineChanges(canvas, x, y);
                    //client's clicks are added to their inputCanvas but NOT printed onto the canvas
                    inputCanvas = addToInputCanvas(inputCanvas, layout);

                    //Checks if the user has signed in. If they have then send the input Layout to the server
                    //Clients who have not signed in shouldn't be able to click on the canvas but this is an extra check
                    if ($("#userId").text() !== "" && $("#userId").text() !== undefined && $("#userId").text() !== null) {
                        socket.send(JSON.stringify({
                            _id: $("#gameId").html(),
                            "username": $("#userId").text(),
                            "inputLayout": inputCanvas.board,
                            "colour": document.getElementById("userId").style.color
                        }));
                    }                    
                });

                //Checks if the user is typing
                chatTextbox.keypress(function () {
                     //Checks if the user has signed in. If they have then send the typing notification to the server
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

            //If the user has a user already then they can sign in
            signIn.onclick = function () {
                var name = document.getElementsByName("playerName")[0].value;
                var password = document.getElementsByName("playerPassword")[0].value;

                try {
                    //HTTP Get request to retrieve the user's credentials
                    $http.get("/signInPlayer/" + name + "/" + password + "/" + userId).then(function (response) {

                        //If a variable "success" with a value of "false" is sent as a response instead of the credentials
                        //then the login was not found
                        if (response.data["success"] === false)
                            window.alert("Login not found");
                        else {
                            //Retrieved credentials are allocated to the correct places and modal is closed
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

            //If a user creates a new user then they can click "submit"
            submit.onclick = function () {
                var name = document.getElementsByName("playerName")[0].value;
                var password = document.getElementsByName("playerPassword")[0].value;
                var colour;

                //Iterates through the radio buttons to find whihch one was selected
                $('#colourSelector input:radio').each(function() {
                    if ($(this)[0].checked === true)
                        colour = $(this)[0].id;
                });

                //white spaces at the end of a password are taken away when sent through a GET so must be checked client side
                if (/\s/.test(password) === false) {
                    //Checks if the user has entered a username, a password, and selected a colour
                    if (name !== undefined && password !== "" && colour !== undefined) {
                        //Send a GET request to the server to create the user
                        $http.get("/newPlayer/" + name + "/" + colour + "/" + userId + "/" + password).then(function (response) {
                            //If the response from the server "success === true" then the player was created successfully
                            if (response.data["success"] === true) {
                                modal.style.display = "none";
                                $('#userId').css('color', colour).text(name);
                                $('#userPlaceName').text(name);
                            }
                            else
                                //If not created successfully then this implies that the user is already present or there was an issue with the name used
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

        //Called when the user presses "submit"
        $scope.sendMessage = function () {
            var userId = document.getElementById("userId");
            var message = document.getElementsByName("message")[0].value;

            //Checks if the user has signed in, otherwise they shouldn't be able to send a message
            if ($("#userId").text() !== "" && $("#userId").text() !== undefined && $("#userId").text() !== null && $.trim(message).length !== 0) {
                socket.send(JSON.stringify({
                    _id: $("#gameId").html(),
                    name: userId.innerHTML,
                    colour: userId.style.color,
                    message: message
                }));
            }
            //clears the text box
            document.getElementsByName("message")[0].value = "";
        }
    }
})