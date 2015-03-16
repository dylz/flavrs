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
        api: '/',
        version: '0.1'
    };
    
    self.logged = false;
    
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
            if(this._loaded.indexOf(obj.meta.code) == -1){
                
                // add shortcuts
                obj.name = obj.meta.code;
                
                this.all.push(obj);
                this._loaded.push(obj.meta.code);
            }
            
            return obj;
        },
        get: function(name){
            var output = {},
                modules = this;
            // return the requested obj for a module
            
            // if module is already loaded, return that, otherwise get info from
            // backend
            if(this._loaded.indexOf(name) > -1){
                this.all.forEach(function(module){
                    if(name == module.meta.code){
                        output = module;
                    }
                });
            }
            else{
                this.initialize(name).then(function(){
                    output = modules.get(name);
                });
            }
            
            return output;
            
        },
        initialize: function(name){
            var promise = $http.post(self.meta.api+'static/'+name+'/json/main.json',{}),
                modules = this;
            
            promise.success(function(response,status){
                // add urls to tabs object
                angular.forEach(response.tabs,function(value,key){
                    value.url = self.routes.get('tab',{'id':value.id},name,response.routes);
                });
                modules.add(response);
            });
            
            return promise;
            
        },
        update_scope: function(scope){
            // dep
            // to save time and not having to redo a lot of code right now,
            // this function updates the scope with the init values
            // remove this later as the controller using this function shouldn't
            // need it anymore.
            var current = this.current();
            scope.meta = current.meta;
            scope.actions = current.actions;
            scope.routes = current.routes;
            scope.commands = current.commands;
            scope.tabs = current.tabs;
            
            return scope;
        },
        // private
        _loaded: []
    };
    
    self.routes = {
        previous: {},
        current: {},
        get: function(route,params,module,routes){
            var output = null;
            if(!angular.isDefined(params)){
                params = {}
            }
            
            if(!angular.isDefined(module)){
                module = self.modules.current().name;
            }
            
            if(!angular.isDefined(routes)){
                routes = self.modules.current().routes;
            }
            
            angular.forEach(routes,function(value,key){
                if(value.name == route){
                    output = value.route;
                }
            });
            
            if(output !== null){
                // route is found. 
                // next, add the params
                angular.forEach(params,function(value,key){
                    output = output.replace(':'+key,value);
                });
                // We need to remember to append the current module
                // the user is in to prevent routing conflicts.
                return module+'/'+output;
            }
            else{
                //throw new Error(route+' does not exist.')
                console.log(route+' does not exist.');
            }
        }
    };
    
    self.validators = {
        is_valid: function(propery_name,property_value,data){
            // check if id is fail
            var good_to_go = false;
            angular.forEach(data,function(value,key){
                if(value[propery_name] == property_value){
                    good_to_go = true;
                }
            });

            if(good_to_go){
                // id is valid, so let the process carry on
                return true;
            }
            else{
                // id is not valid, throw 404 and end routing process
                return false;
            }
        }
    }
    
});