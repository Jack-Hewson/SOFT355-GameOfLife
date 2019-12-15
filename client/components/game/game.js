var gameModule = angular.module("game", ["ngRoute"]);

gameModule.component("game", {
    templateUrl: "components/game/game.template.html",

    controller: function GameController($scope, $http) {
        //Initialise the websocket connection
        var socket = new WebSocket("ws://localhost:9000/");
        socket.onmessage = function(event) {
            console.log("received: '" + event.data + "'");
        }

        //Add functions to the scope
        $scope.initGame = function () {
            //Initialise a new game
            $http.get("/newgame").then(function (response) {
                $("#gameId").html(response.data["gameId"]);

                socket.send("Hello world from the angularJS client: gameId is '" + response.data["gameId"] + "'");
            });
        }
    }
})