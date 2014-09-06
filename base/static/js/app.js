'use strict';

// APP is defined!
var app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage']);

//factory
app.factory('httpRequestInterceptor', function ($cookies) {
  return {
    request: function (config) {
      var token = 'lols';
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