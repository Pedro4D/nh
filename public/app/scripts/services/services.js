/**
 * Restangular-based data service, fetches user data from the backend
 *
 * @see https://github.com/mgonto/restangular
 */
var services = angular.module('NakedHeartApp.services', [])
    .factory('socket', function ($rootScope) {
        var socket = io.connect();
        console.log("connected");
        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    });