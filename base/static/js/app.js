'use strict';

// APP is defined!
var app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage','ngAnimate','ngMaterial']);

//factory
app.factory('httpRequestInterceptor', function ($cookies,$localStorage,$q) {
  return {
    request: function(config) {

        //check expire date if valid, append access token to request.
        //if invalid, send a "reauthenticate" signal

        //if requested url is to login, ignore this process
        if(config.hasOwnProperty('data')){
            if (config.url != '/controllers/base/login/'){
                if ((new Date().getTime() / 1000) > $localStorage.expires){
                    //emit signal to reauthenticate

                }
                else{
                    //still valid! append the access token
                    config.data.access_token = $localStorage.access_token;
                }
            }
        }

        config.headers['X-CSRFToken'] = $cookies.csrftoken;
        return config;
    },
    response: function(response){
        //intercept the response object and rearrange the data
        //so the app can use the data better

        //generally, this is where we will do the msg handling to the user.
        //since all requests should have this, we can handle it here, and just
        //rearrange the data object to remove redundent code

        //msg handling here...
        
        //Lets handle 'error's
        if(response.data.status == 'error'){
            return $q.reject(response);
        }

        response.data = response.data.response;
        return response;
    }
  };
});
 
//configs

app.config(function ($httpProvider) {
  $httpProvider.interceptors.push('httpRequestInterceptor');
});

app.config(function($locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
});

// routing
// hardcoded routes for now
/*
app.config(function($routeProvider) {
    $routeProvider

        .when('/', {
            templateUrl : '/static/partials/view.html',
            controller  : 'indexCtrl'
        })

        .when('/bookmarks/', {
            templateUrl : '/static/partials/view.html',
            controller  : 'bookmarksCtrl'
        })
});
*/