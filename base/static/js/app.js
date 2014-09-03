'use strict';

// Declare app level module which depends on views, and components
var app = angular.module('flavrs', ['ngRoute']);

app.config(function($locationProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
});