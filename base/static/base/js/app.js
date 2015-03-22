'use strict';

// APP is defined!
var app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage',
    'ngSanitize','ngAnimate','ngMaterial','schemaForm','ui.bootstrap','ui.sortable']);

//factory
app.factory('httpRequestInterceptor', function ($cookies,$localStorage,$q,$location) {
  return {
    request: function(config) {
        /* OAUTH BEGINS */
        //check expire date if valid, append access token to request.
        //if invalid, send a "reauthenticate" signal

        //if requested url is to login, ignore this process
        /*if(config.hasOwnProperty('data')){
            if (config.url != '/controllers/base/login/'){
                if ((new Date().getTime() / 1000) > $localStorage.expires){
                    //emit signal to reauthenticate

                }
                else{
                    //still valid! append the access token
                    config.data.access_token = $localStorage.access_token;
                }
            }
        }*/
        /* OAUTH ENDS */
        // The server accepts Ajax posts the same way normal posts are done
        // Using the JQuery param function, we can achieve the same data structure
        
        if(config.hasOwnProperty('data')){
            config.data = $.param(config.data);
        }
        
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        config.headers['X-CSRFToken'] = $cookies.csrftoken;
        return config;
    },
    response: function(response){
        
        // trigger optional keys options
        if(response.data.hasOwnProperty('_redirect_url')){
            // redirect url
            window.location.href = response.data._redirect_url;
        }
        
        if(response.data.hasOwnProperty('_change_url')){
            // change url
            $location.path(response.data._change_url);
        }
        console.log(response)
        return response || $q.when(response);
    },
    responseError: function(rejection){
        // Handle 500 server errors differently...
        console.log(rejection)
        if(rejection.status == 500){
            
        } 
        else if(rejection.hasOwnProperty('data') && rejection.data.hasOwnProperty('syserr')){
            // if 'syserr' in a key in the data, then this is a system error
            // handle it differently (how?)
            
        }
        else{
            return $q.reject(rejection);
        }
    }
  };
});
 
//configs

app.config(function ($httpProvider) {
  $httpProvider.interceptors.push('httpRequestInterceptor');
  $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
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
    
    self.user = undefined;
    
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