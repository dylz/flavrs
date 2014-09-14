'use strict';

// APP is defined!
var app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage']);

//factory
app.factory('httpRequestInterceptor', function ($cookies,$localStorage) {
  return {
    request: function (config) {

        //check expire date if valid, append access token to request.
        //if invalid, send a "reauthenticate" signal

        //if requested url is to login, ignore this process

        if (config.url != '/controllers/base/login/'){
            if ((new Date().getTime() / 1000) > $localStorage.expires){
                //emit signal to reauthenticate
            }
            else{
                //still valid! append the access token
                config.data.access_token = $localStorage.access_token;
            }
        }

        config.headers['X-CSRFToken'] = $cookies.csrftoken;
        return config;
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