'use strict';

var flavrs_modules = {},

// APP is defined!
app = angular.module('flavrs', ['ngRoute','ngCookies','ngStorage',
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
            // add the user to the request data
            config.data.user = $localStorage.user;
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
        
        // check if user is the same between the request and the response
        if(response.data.hasOwnProperty('user')){
            if(response.data.user != $localStorage.user){
                // user from back-end and front-end do not match, cause an error!
                $q.reject(response);
            }
            // remove user from data.. app doesn't need it in here
            delete response.data['user'];
        }
        
        return response || $q.when(response);
    },
    responseError: function(rejection){
        // Handle 500 server errors differently...
        
        if(rejection.status == 500){
            return $q.reject(rejection);
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

// Themes
app.config(function($mdThemingProvider) {
    $mdThemingProvider.alwaysWatchTheme(true);
    $mdThemingProvider.theme('search')
    .primaryPalette('purple');
    
    $mdThemingProvider.theme('green')
    .primaryPalette('green');
    
    $mdThemingProvider.theme('red')
    .primaryPalette('red');
    
    $mdThemingProvider.theme('orange')
    .primaryPalette('orange');

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
app.service('$flavrs', function($http,$location,$localStorage,$rootScope){
    
    var self = this;
    
    self.meta = {
        api: '/',
        version: '0.1'
    };
    
    self.user = {
        set: function(id){
            $localStorage.user = id;
        },
        get: function(){
            return $localStorage.user;
        }
    };
    
    self.scope = undefined;
    
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
            var modules = this,
                data = flavrs_modules[name],
                url = self.meta.api+name+'/'+data.meta.initialize_url
            
            var promise = $http.post(url,{});
            
            promise.success(function(response,status){
                // add urls to tabs object
                angular.forEach(response.sidenav,function(value,key){
                    value.url = self.routes.get('sidenav',{'id':value.id},name,data.routes);
                });
                // add tabs to data
                data.sidenav = response.sidenav;
                // convert fab routes to urls for mdFab to use
                angular.forEach(data.fabs,function(value,key){
                    value.url = self.routes.get(value.route,undefined,name,data.routes); 
                });
                modules.add(data);
            });
            
            return promise;
            
        },
        update_scope: function(scope){
            
            // update the scope of the main controller with the new data
            // this is important to as some of the data bound to the controllers
            // scope is used for displaying information to the user.
            
            var current = this.current();
            scope.meta = current.meta;
            scope.fabs = current.fabs;
            scope.actions = current.actions;
            scope.routes = current.routes;
            scope.commands = current.commands;
            scope.sidenav = current.sidenav;
            scope.sidenav_title = current.meta.glossary.sidenav_plural;
            scope.toolbar = self.toolbar;
            
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
        },
        go: function(route,args,params){
            
            // params is optional, if not defined, set a default
            if(!angular.isDefined(params)){
                params = {};
            }
            
            /// check internal routes
            
            switch (route) {
                case '/':
                    //if route is empty, load the 'root' path (this is the module root)
                    route = self.modules.current().name+'/';
                    break;
                default:
                    //get the actual path
                    route = this.get(route,args);
            }
            
            $location.path(route).search(params);
        },
        back: function(){
            var previous = this.previous;
            if(previous.hasOwnProperty('name')){
                this.go(previous.name,previous.args,previous.params);
            }
            else{
                this.go('/')
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
    };
    
    self.sidenav = {
        get_by_id: function(id,items){
            if(!angular.isDefined(items)){
                items = self.modules.current().sidenav;
            }
            
            var item = null;
            angular.forEach(items,function(value,key){
                if(value.id == id){
                    item = value;
                }
            });
            
            return item;
        }
    };
    
    self.content = {
        get_by_id: function(id,items){
            var item = null;
            angular.forEach(items,function(value,key){
                if(value.id == id){
                    item = value;
                }
            });
            
            return item;
        }
    }
    
    self.modal = {
        instance: undefined,
        form: {
            is_valid: function(){
                return $('form[name=modal_form]').hasClass('ng-valid');
            }
        }
    }
    
    self.controller = {
        ready: function(fn){
            if(angular.isDefined(self.routes.current.name)){
                fn();
            }
        }
    }
    
    self.toolbars = {
        'default': {
            sidenav_btn: {
                icon: 'bars',
                click: function(){
                    self.scope.toggle_menu();
                }
            },
            brand: 'Flavrs',
            search: {
                enabled: true,
                autocomplete: true
            }
        },
        'search': {
            sidenav_btn: {
                icon: 'arrow-left',
                click: function(){
                    self.routes.back();
                }
            },
            brand: 'Back',
            search: {
                enabled: true,
                autocomplete: true
            }
        },
        set: function(name){
            self.scope.toolbar = self._toolbars[name];
        },
        register: function(key,values){
            this[key] = values;
            // fill in the missing values using default
            var dft = angular.copy(this.default);
            angular.forEach(dft,function(value,k){
                if(!values.hasOwnProperty(k)){
                    values[k] = value;
                }
            });
            self._toolbars[key] = angular.copy(values);
        }
    }
    
    self._toolbars = angular.copy(self.toolbars);
    
    self.toolbar = self.toolbars['default'];
    
    
    self.theme = {
        set: function(name){
            self.scope.theme = name;
        }
    }
    
});