/**
 * This is an example controller.
 * It triggers the UserdataService and puts the returned value on the scope
 *
 * @see services
 */
var controllers = angular.module('NakedHeartApp.controllers', [])
    .controller('NHController', function ($scope,socket) {
        console.log("NHController");
         $scope.username = "Pruebas";
        socket.on('init', function (data) {
            console.log("init",data);
            $scope.username = data.name;
        });

    });