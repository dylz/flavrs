'use strict';

// APP is defined!
var app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage',
    'ngSanitize','ngAnimate','ngMaterial','schemaForm','ui.bootstrap','ui.sortable']);

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
            //return $q.reject(response);
        }
        if(response.data.hasOwnProperty('response')){
            response.data = response.data.response;
        }
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

//filters
app.filter('module', function() {
    return function(input) {
        if(input == 'base'){
            input = 'home';
        }
        return input;
    };
});

// Main Flavrs service
app.service('$flavrs', function($http,$location){
    
    var self = this;
    
    self.meta = {
        api: '/'
    };
    
    self.modules = {
        all: [],
        current: function(){
            var module = $location.path().split('/')[1];
            
            if((module == "") || (module == "home")){
                module = 'base';
            }
            
            return this.get(module);
        },
        add: function(obj){
            this.all.push(obj);
            this._loaded.push(obj.name);
            
            return obj;
        },
        get: function(name){
            
            // return the requested obj for a module
            
            // if module is already loaded, return that, otherwise get info from
            // backend
            if(_loaded.indexOf(name) > -1){
                this.all.forEach(function(module){
                    if(name == module.name){
                        return module;
                    }
                });
            }
            else{
                $http.post(self.meta.api+name,{data:{}})
                     .success(function(response,status){
                        obj.routes.push({"name":"tab","route":"tab/:id","controller":"contentCtrl"});
                        // add urls to tabs object
                        //angular.forEach($scope.tabs,function(value,key){
                        //    value.url = $scope.get_route('tab',{'id':value.id});
                        //});
                        this.add(obj);
                     });
            }
            
        },
        // private
        _loaded: []
    };
});