'use strict';

/**
 * Setup of main AngularJS application.
 *
 * @see controllers
 * @see services
 */
var app = angular.module('NakedHeartApp',
        [
            'NakedHeartApp.controllers'
            ,'NakedHeartApp.services'
            ,'ngRoute'
        ]).config(function($routeProvider, $locationProvider, $httpProvider) {
            console.log("ASDASDASDASDAS");


        $routeProvider.when('/',
            {
                templateUrl:    'app/views/main.html',
                controller:     'NHController'
            });
    });