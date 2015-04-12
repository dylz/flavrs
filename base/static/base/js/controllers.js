/* 

Main Contoller

Controllers state of the page, such as what view is appearing if the 
user is logged in or not.

*/

app.controller('mainCtrl', ['$scope','$http','$localStorage','$sessionStorage',
                            '$cookies','$q','$location','$controller',
                            '$rootScope','$modal','$timeout','$route',
                            '$mdSidenav','$interval', '$flavrs','$compile',
                            function(
    $scope,$http,$localStorage,$sessionStorage,$cookies,$q,$location,
    $controller, $rootScope,$modal,$timeout,$route,$mdSidenav,$interval,$flavrs,
    $compile) {
    
    $scope.api = '/';
    $scope.$storage = $localStorage;
    $scope.selectedTab = 0;
    $scope.broadcast_monitor = {};
    $scope.loaded_controllers = [];


    //modules.. this won't be hardcoded in the future.. so fix this kay!?
    $scope.modules = ['base','bookmarks','events','twitter','login'];
    // list of modules that are used for internal uses
    $scope.internal_modules = ['login'];
    //store modules that have been loaded already so the routing does not load
    //them again.
    $scope.module_is_loaded = false;
    $scope.carry_on = true;
    
    // menu settings
    $scope.menu = {
        open: false
    }
    
    $scope.logout = function(){
        //log the user out
        $localStorage.$reset();
        delete $cookies['remember_token'];
        window.location.href = $scope.api+'logout/';
    }
    
    //Load module requirements in background
    $scope.load_module = function(module,callback){
        //only try to load the module if it is in the list of approved
        //modules..
        //This will also help prevent client errors when trying to load
        //modules that do not exist
        if($scope.modules.indexOf(module) > -1){
            $.getScript("/static/"+module+"/js/controllers.js",function(){
                callback;
            });
        }
    }
    
    //get all registered modules. This is done in a function so we can do special
    //logic like sorting and such
    $scope.get_modules = function(){
        return $scope.modules.sort();
    }
    
    //register a modules "init". Basically just save time by making sure all
    //required scopes are updated so data is not crosedd between modules
    $scope.register_init = function(response){
        
        //add any special routes (ie. tabs)
        response.routes.push({"name":"sidenav","route":"tab/:id","controller":"contentCtrl"});
        
        $scope.meta = response.meta;
        $scope.actions = response.actions;
        $scope.routes = response.routes;
        $scope.commands = response.commands;
        
        // add urls to tabs object
        angular.forEach(response.tabs,function(value,key){
            value.url = $scope.get_route('sidenav',{'id':value.id});
        });
        
        $scope.tabs = response.tabs;
        
        //tell the app that this module is loaded so it does not try to load it again.
        $scope.module_is_loaded = true;
        
        // update the command bar logic by broadcasting to the command controller
        $scope.$broadcast('update_commands',response.commands);
        
        // add to service
        $flavrs.modules.add(response);
    }
    
    // toggle the menu
    $scope.toggle_menu = function(){
        $mdSidenav('left').toggle();
    }
    
    //generic share function
    $scope.share = function(){
        console.log('HEY')
    }

    $scope.location = function(route,params,args){
        // params is optional, if not defined, set a default
        if(!angular.isDefined(params)){
            params = {};
        }
        
        /// check internal routes
        
        switch (route) {
            case '/':
                //if route is empty, load the 'root' path (this is the module root)
                route = $scope.module+'/';
                break;
            default:
                //get the actual path
                route = $scope.get_route(route,args)
        }
        
        $location.path(route).search(params);
    }
    
    //wrapper for ngclicks outside of this scope
    
    $scope.broadcast = function(ngclick,arg){
        // place a delay on this to ensure that the same broadcast cannot
        // happen in a very short period of time.
        var bm = $scope.broadcast_monitor,
            key = ngclick+'_'+arg;
        if(!bm.hasOwnProperty(key)){
            $scope.$broadcast(ngclick,arg);
            $scope.broadcast_monitor[key] = true;
            $timeout(function(){
                delete $scope.broadcast_monitor[key];
            },100);
        }
    }

    //generic 'open modal window' function
    $scope.open_modal = function(controller,locals){
        
        var resolve_locals = {};
        
        angular.forEach(locals,function(value,key){
           resolve_locals[key] = function(){
               return value;
           } 
        });
        
        $scope.modalInstance = $modal.open({
            templateUrl: 'modal.html',
            controller: controller,
            scope: $scope,
            size: 'lg',
            backdrop: true,
            resolve: resolve_locals
        });
        
        $scope.modalInstance.opened.then(function () {
            //focus the first input
            //timeout is used to ensure the rendering of angular-scheme attributes
            //are compeleted properly before focusing the input
            $timeout(function(){
                $('.modal-body input:first').focus();
            },250);
        });
        
        //closed modal
        $scope.modalInstance.result.then(function () {

        },function(){
            //modal is closed.. update route to the old route
            var previous = $flavrs.routes.previous;
            // if there is no previous, send user to module root
            if(angular.isDefined(previous.name)){
                $scope.location(previous.name,undefined,previous.args);
            }
            else{
                $scope.location('/');
            }
        });
        
        $flavrs.modal.instance = $scope.modalInstance;
        
    }
    
    $scope.close_modal = function(){
        $scope.modalInstance.dismiss('cancel');
    }
    
    //generic edit - open modal and pass content. let the modules' controller
    // do the rest of the work
    $scope.edit = function(content,controller){
        $scope.open_modal(controller,{content:content});
    }
    
    // tabs are generic, which means the functionality does not belong to any one
    // module.
    $scope.open_tab_management = function(){
        $scope.open_modal('tabCtrl');
    }
    
    //validate modal form
    $scope.validate_modal = function(form,callback){
        $scope.$broadcast(callback,form.hasClass('ng-valid'));
    }
    
    //listen to validate the form on request
    $scope.$on('validate_modal_form', function(event, callback) {
        return $scope.validate_modal($("form[name=modal_form]"),callback);
    });
    
    //API usage to close a modal
    $scope.$on('close_modal', function(){
        $scope.modalInstance.dismiss('cancel');
    });
    
    //API usage to append content
    $scope.$on('add_to_content',function(event,data){
        $scope.tab_content.push(data);
    });
    
    // Get the route based off of object.route name
    $scope.get_route = function(route,params,module){
        var output = null;
        if(!angular.isDefined(params)){
            params = {}
        }
        
        if(!angular.isDefined(module)){
            module = $scope.module;
        }
        
        // switch case so we can have special cases for routing
        switch(route){
            case 'home':
                output = "";
            break;
            default:
                angular.forEach($scope.routes,function(value,key){
                    if(value.name == route){
                        output = value.route;
                    }
                });
        }
        
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
        }
    };
    
    $rootScope.$on("$locationChangeStart", function(event, current) {
        //Get the path, and use it to determine the module
        var path_split = $location.path().split('/');

        if(path_split[1] != $scope.module){
            var different = true;
        }
        else{
            var different = false;
        }
        
        $scope.module = path_split[1];
        
        if(($scope.module == "") || ($scope.module == "home")){
            $scope.module = 'base';
        }
        
        //try to load the modules ctrl
        var ctrl_name = $scope.module+'Ctrl',
            foundit = false;
        //loop through the apps controllers and determine if the one we want
        //is loaded yet. if not, attempt to load it!
        app._invokeQueue.forEach(function(service){
            if(service[0] == '$controllerProvider'){
                if(ctrl_name == service[2][0]){
                    foundit = true;
                }
            }
        });

        //only init the controller if it is there and not loaded yet
        if((foundit) && (different)){
            // make sure that the user info is loaded before loading the module
            get_user_info().then(function(){
                $flavrs.modules.initialize($scope.module).then(function(){
                    $scope = $flavrs.modules.update_scope($scope);
                    update_view();
                });
            });
        }
        else{
            //module is the same but the route is different.
            //update the view using the new route.
            update_view();
            //check if we need to prevent the route change
            if(!$scope.carry_on){
                event.preventDefault();
            }
        }
    });
    
    //update the view after the module is registered
    $scope.$watch("module_is_loaded", function(){
        // check if content will be rendered right from view or do we need
        // to load the default stuff
        if($scope.module_is_loaded){
            //update_view();
        }
    });
    
    //Private functions
    
    function get_user_info(){
        // get current logged in user's information for API and display purposes
        var promise = $http.post($scope.api+'auth/current_user/',{});
        
        promise.success(function(data,status){
            // the main controller gets access to all returned user data
            // but the actual $flavrs service only gets the id.
            // this means that other modules can only use the id as well.
            $scope.user = data;
            $flavrs.user.set(data.id);
        });
        
        promise.error(function(data,status){
           // error most likely means that this function was called without
           // the user actually being logged in.. redirect to index and hopefully
           // the backend will take care of the rest.
           //window.location.href = '/';
        });
        
        return promise;
    }
    
    // Check if the user is logged in or not
    function check_if_logged_oauth(){
        var logged = true,
            required_localStorage = ['access_token','expires','logged'],
            check_login = function(){
                $http.post($scope.api+'controllers/auth/check/',{})
                     .success(function(data,status){
                        logged = data.logged;
                        final_step();
                      });
            },
            final_step = function(){
                if(!logged){
                    // not logged in, but lets make sure sessions and storage is clean
                    // for when the user logs in
                    required_localStorage.forEach(function(ele){
                        //delete all localStorage here
                        delete $localStorage[ele];
                    });
                    delete $cookies['sessionid'];
                    // send user to homepage
                    //window.location.href = '/';
                }
            };

        // Local storage check 
        required_localStorage.forEach(function(ele){
            if(!$localStorage[ele]){
                //no go, user is not logged in
                logged = false;
            }
        });

        if(logged){
            //All local storage keys are here!
            //now check if expire date is still in ranged
            if((new Date().getTime() / 1000) > $localStorage.expires){
                logged = false;
            }
        }

        if(logged){
            //Client side says the user is logged in, lets confirm with the 
            //server!
            check_login();
        }
        else{
            //Not logged in, go to final step for clean up process.
            final_step();
        }

    }
    
    function update_view(){
        //check the rest of the route and determine what controller to load
        var route_arr = $location.path().split('/'),
            route_value = route_arr.length-2,
            route_params = $location.search(),
            found_route = null,
            routes = $flavrs.modules.current().routes;
        
        angular.forEach(routes,function(value,key){
            var loop_route_arr = value.route.split('/');
            if(route_value == loop_route_arr.length){
                // This *could* be the correct route. But lets double check.
                // Any path with a colon is ambigous so ignore those.
                var indexes = [],
                    matched_indexes = [];
                for (var i = 0; i < loop_route_arr.length; i++) {
                    // Don't include any empty paths
                    var path = loop_route_arr[i],
                        dynamic_paths = [];
                    if((path != "") && (path.indexOf(':') == -1)){
                        indexes.push(i);
                    }
                }
                // Now, compare the paths with the following indexes in 'indexes'
                // to those of the current route with those indexes
                for (var i = 0; i < indexes.length; i++) {
                    var index = indexes[i];
                    if(route_arr[index+2] == loop_route_arr[index]){
                        matched_indexes.push(i);
                    }
                }
                // If the matched indexes matches the indexes, then this is the route.
                if(indexes.length == matched_indexes.length){
                    // BAM, load the controller for this route.

                    // For the locals of this controller, pass scope regardless
                    // and then check if the controller has any 'locals' that wish
                    // to be passed as well.
                    
                    var ctrl = value.controller,
                        locals = {
                            $scope:$scope,
                            route: {'initialized': true, 'args': {}, 
                                    'params': route_params, 'route': value}
                        };

                    if(angular.isDefined(value.controller_locals)){
                        angular.extend(locals,value.controller_locals)
                    }
                    
                    // next, get the dynamic bits of the route (if any) and 
                    // make them 'locals' to the controller
                    var dynamic_paths = [];
                    for (var i = 0; i < loop_route_arr.length; i++) {
                        var path = loop_route_arr[i];
                        if(path.indexOf(':') > -1){
                            dynamic_paths.push({
                               index: i,
                               pattern: path.replace(':','')
                            });
                        }
                    }
                    
                    for (var i = 0; i < dynamic_paths.length; i++) {
                        var dp = dynamic_paths[i];
                        locals.route.args[dp.pattern] = route_arr[dp.index+2];
                    }
                    
                    // Before we can do load this controller, check if the route
                    // has any dependencies and ensure they are loaded before 
                    // running this controller
                    $scope.queued_controller = {
                        'controller': value.controller,
                        'locals': locals // dep
                    };
                    if(angular.isDefined(value.dependencies)){
                        var listener = $scope.$watchGroup(value.dependencies, function(newValues,oldValues){
                            // When ALL dependencies are not longer undefined,
                            // destory the watcher.
                            var num_defined = 0;
                            for (var i = 0; i < newValues.length; i++) {
                                if(angular.isDefined(newValues[i])){
                                    num_defined++;
                                }
                            }
                            // if num_defined == # in newValues.. then kill the listener and load the controller
                            if(num_defined == newValues.length){
                                
                                // Check if any validation is required for this route
                                // to trigger. If there is, run the validators and if any fail
                                // don't contuine.
                                // It is up to the validator to show any messages, 404s, etc.
                                
                                $scope.carry_on = true;
                                if(angular.isDefined(value.validators)){
                                    angular.forEach(value.validators,function(value,key){
                                        var validator = $scope.validators[value]($location.path(),locals.route.args);
                                        // validator must return a boolean. if false, then 
                                        // validation failed and we do not carry on this process (ie. no route change)
                                        if(!validator){
                                            $scope.carry_on = false;
                                        }
                                    });
                                }
                                
                                // if validation fails, stop everything!
                                if(!$scope.carry_on){
                                    return false;
                                }
                                
                                
                                listener(); //this kills the watchGroup
                                load_controller(value,locals);
                            }
                        });
                    }
                    else{
                        load_controller(value,locals);
                    }
                }
            }
        });
    }
    
    function load_controller(route_obj,locals){
        // locals is dep to prevent random locals being injected into a controller
        
        // add the locals object to the flavrs service to name space data properly
        // reorganize the object before setting it
        var route = {},
            ctrl = route_obj.controller,
            template = route_obj.template,
            view = route_obj.view,
            load = function(){
                $flavrs.routes.previous = angular.copy($flavrs.routes.current);
                $flavrs.routes.current = route;
                $controller(ctrl,locals);
            };
            
        angular.forEach(locals.route,function(value,key){
            if(key != 'route'){
                route[key] = value;
            }
            else{
                angular.forEach(value,function(value2,key2){
                    route[key2] = value2;
                });
            }
        });
        
        // check the view - it can have specific actions
        switch(view){
            
            case 'modal':
                // open up a modal window and bind the given controller
                $scope.open_modal(ctrl);
            break;
            default: 
                if(!angular.isDefined(template)){
                    template = 'base/card.html';
                }
                
                $http.get(check_template(template),{cache: true})
                     .then(function(response){
                        var ele = angular.element('#tab-content');
                        ele.html(response.data);
                        $compile(ele)($scope);
                        load();
                     });
        }
    }
    
    function check_template(template){
        // some templates are special!
        
        switch(template){
            case 'base/card.html':
                template = $scope.api+'static/base/templates/card.html';
            break;
            default:
                template = $scope.api+'static/'+$scope.module+'/templates/'+template;
        }
        
        return template;
    }
    
    function fix_height(){
        var new_height = $(document).height()-$('.menu-bar').height()-$('material-tabs').height();
        $('#tab-content,.button-bar').height(new_height);
        var windowH = $(window).height(),
            documentH = $(document).height();
        if(windowH == documentH){
            var height = documentH
        }
        else{
            var height = documentH;
        }
        $('body').height(height);
    }
    
    //Init functions
    //Fix height of tab content to match document size
    //fix_height();
    //Bind this to a scroll event so the height gets fixed whenever the user scrolls
    window.onresize = function(event) {
        //fix_height();
    };
    
    window.onscroll = function(event){
        //fix_height();
    };
    // Check when user clicks '/' on their keyboard, then show the command bar
    $(document).keyup(function(e){
        //only trigger then if user is not typing in an input
        var tag = document.activeElement.tagName;
        if((e.keyCode == '191') && (tag != "INPUT")){
            $scope.$broadcast('manage_command_bar','show'); 
        }
        // close the command bar if it active and the user hits 'esc'
        if(e.keyCode == '27'){
            $scope.$broadcast('manage_command_bar','reset');
        }
    });
    
    // check localstorage every min to take care of any garbage cleanup
    $interval(function(){
        angular.forEach($scope.$storage,function(value,key){
            // TAB DATA CLEAN UP
            if(key.indexOf('tab_') > -1){
                if(new Date().getTime() >= value.expires){
                    delete $scope.$storage[key];
                }
            }
        });
    },1000*60);
    
    
    $flavrs.scope = $scope;
}]);

app.controller('contentCtrl',['$scope','$location','$http','$localStorage','route',
    function($scope,$location,$http,$localStorage,route){
    
    $scope.$storage = $localStorage;
    
    $scope.load_tab_content = function(id,refresh){
        
        if(!angular.isDefined(refresh)){
            refresh = false;
        }
        
        var key = 'tab_'+id
        // if data is cached and hard reload is not request, return
        // data from localstorage
        
        if((!refresh) && (angular.isDefined($scope.$storage[key]))){
            $scope.tab_content = $scope.$storage[key].data;
            return ;
        }
        
        var data = {};
        if($scope.module != "base"){
            var module_path = '/'+$scope.module;
        }
        else{
            var module_path = '';
        }
        $http.post($scope.meta.root+'static'+module_path+'/json/'+id+'.json',data)
             .success(function(response,status){
                $scope.tab_content = response;
                // store this result in local storage for later use
                // BTW we will only use the data for 5 mins, after that we request new data
                $scope.$storage[key] = {
                    expires: new Date().getTime()+300000,
                    data: response
                };
             });
    }
    
    // private
    function init(){
        var id = null,
            tab = null;
        if(($location.path().indexOf('/tab/') == -1) && (!angular.isDefined(route.args))){
            // user is on 'home' and not selected a tab, so lets load the first
            // tab as the default
            
            // make sure we have some tabs to work with in the first place
            if((angular.isDefined($scope.tabs)) && $scope.tabs.length > 0){
                tab = $scope.tabs[0];
                id = tab.id;
            }
        }
        else if(angular.isDefined(route.args)){
            id = route.args.id;
        }

        if(id){
            // validate this id
            angular.forEach($scope.tabs,function(value,key){
                if(value.id == id){
                    tab = value;
                } 
            });
            if(tab){
                // load this content
                $scope.load_tab_content(id);   
            }
            else{
                // id is not valid, send user to home
                // this should not happen often, but when it does we want
                // to do a hard reload on the home to ensure all routing logic
                // is rendered successfully
                //window.location.href = $scope.get_route("home");
            }
            
            // define the active tab's id for UI purposes
            $scope.active_tab = tab;
        }
    }
    
    init();
    
}]);

app.controller('commandCtrl',['$scope','$timeout', function($scope,$timeout){
    
    $scope.typeaheadInput = {
        text: '',
        trigger: false
    };

    $scope.triggerTypeahead = function(name) {
        $scope.typeaheadInput.trigger = true;
        $scope.typeaheadInput.text = $scope.command_syntax_model[name];
    }
    
    // Watch and adjust CSS for typeahead results.
    // This is because the command bar is at the bottom of the page, so the
    // search results are off the page. 
    // Watch when user types in bar, then change location of results and show them.
    $scope.$watch('command', function(){
        var command_bar = $('.command-bar ul'),
            command = $scope.command;
        if(command !== undefined){
            //adjust height
            var height = command_bar.height();
            if($scope.command_bar_height != height){
                command_bar.css('visibility','hidden').hide();
                $scope.command_bar_height = command_bar.height();
            }
            $timeout(function(){
                var position = (-command_bar.height() + 30)+'px';
                command_bar.css({
                    'top':position,
                    'visibility': 'visible'
                }).show();
            },200);
            //check if valid command and load autocomplete for options
            // broken code is broken
            var command_split = command.split(" ");
            if(command_split.length == 1){
                //get the correct command
                var option = get_matching_command(command);
                if(option){
                    //option found, generate hidden inputs for extra typeaheads
                    var option_split = option.syntax.split(" ");
                    $scope.command_syntax = [];
                    $scope.command_syntax_options = {};
                    $scope.command_syntax_model = {};
                    for (var i = 1; i < option_split.length; i++) {
                        var option_name = option_split[i].replace(':','');
                        if($scope.command_syntax.indexOf(option_name) == -1){
                            $scope.command_syntax.push(option_name);
                            $scope.command_syntax_options[option_name] = ["turtle","tough","tommy"];
                            $scope.command_syntax_model[option_name] = "";
                        }
                    }
                }
            }
        }
    });
    
    // close the command bar
    $scope.close_command_bar = function(){
        $scope.command_bar = false;
    }
    
    // throw error on command bar
    $scope.command_error = function(){
        $scope.command_bar_error = true;
        // display popover about the error
        $scope.dynamic_popover_title = "Opps!";
        $scope.dynamic_popover = "This command does not look right, try again!";
        // trigger it!
        $timeout(function(){
            if($('.command-bar .popover').length == 0){
                angular.element('#command-popover').trigger('click');
            }
        },100);
    }
    
    // reset the error popover
    $scope.remove_command_errors = function(event){
        // we pass event so we can get the keycode the user pressed. if it was
        // 'enter' then we know that the command is trying to be processed
        if(event.keyCode != '13'){
            $timeout(function(){
                if($('.command-bar .popover').length == 1){
                    $scope.command_bar_error = false;
                    angular.element('#command-popover').trigger('click');
                }
            },1);
        }
    }
    
    // reset the command bar
    $scope.reset_command_bar = function(){
        // only bother if command bar is currently open
        if($scope.command_bar){
            $scope.$apply(function(){
                $scope.close_command_bar();
                $scope.command_bar_error = false;
                $('.command-bar .input').val(''); 
            })
        }
    }
    
    // show the command bar
    $scope.show_command_bar = function(){
        $scope.command_bar = true;
        $scope.$apply(function(){
            $timeout(function(){
               $('.command-bar .input').focus();
            },100)
        });
    };
    
    // watcher for command bar actions
    $scope.$on('manage_command_bar',function(event,action){
        switch (action) {
            case 'error':
                $scope.command_error();
                break;
            case 'reset':
                $scope.reset_command_bar();
                break;
            case 'show':
                $scope.show_command_bar();
                break;
            case 'close':
                $scope.close_command_bar();
                break;
        }
    });
    
    // execute a command
    $scope.execute_command = function(command){
        var matching_command = get_matching_command(command);
        if(matching_command){
            var command_object = generate_command_input_object(command,matching_command);
            if((matching_command) && (command_object)){
                // this is a valid command, emit it
                $scope.$emit('command_emit',command_object);
            }
            else{
                // not a valid command or user supplied invalid syntax, error this.
                $scope.command_error();
            }
        }
        else{
            // no matching command.. error
            $scope.command_error();
        }
    }
    
    // helpers
    
    //dynamic sorting for objects
    function object_sort(property) {
        var sortOrder = 1;
        if(property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a,b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }
    
    function get_matching_command(command){
        // gets the matching command from the list of module supplied commands.
        var output = null;
        angular.forEach($scope.commands,function(value,key){
           if(command.split(" ")[0] == value.syntax){
               output = value;
           }
        });
        return output;
    }
    
    function generate_command_input_object(user_supplied,module_supplied){
        // checks if user supplied syntax is correct or not.
        // easiest way is to attempt to create command to input object
        var output = null,
            user_supplied_split = user_supplied.split(" ").filter(function(v){return v!==''});
        
        // Loop through command options and create a map. This should make
        // Comparing with user supplied input easier.
        var map = {
            required_num: 0,
            required_keys: [],
            has_value: [],
            options: {}
        };
        
        // sort module supplied
        module_supplied.options = module_supplied.options.sort(object_sort('position'))
        for (var i = 0; i < module_supplied.options.length; i++) {
            var option = module_supplied.options[i];
            if(option.required){
                map.required_num++;
                map.required_keys.push(option.key);
            }
            if(option.hasOwnProperty('key')){
                map.has_value.push(option.key);
            }
            map.options[option.option] = option;
        }
        
        // check if enough options are supplied
        if((user_supplied_split.length-1) >= map.required_num){
            // now lets map the user supplied input into key:value
            var user_input = {},
                ignore_index = [],
                output = {},
                ms_diff = -1;
            for (var i = 1; i < user_supplied_split.length; i++) {
                var input = user_supplied_split[i],
                    ms_index = i+ms_diff;// module supplied index
                if(ignore_index.indexOf(i) == -1){
                    // position matters a lot here
                    if(input.indexOf('-') > -1){
                        // option, ex -i
                        input = input.replace('-','');
                        // get option
                        if(map.options.hasOwnProperty(input)){
                            var mapped_option = map.options[input];
                            // check if flag or input
                            if((mapped_option.hasOwnProperty('flag')) && (mapped_option.flag)){
                                // this is a flag
                                output[mapped_option.key] = true;
                            }
                            else{
                                // log key:value
                                // in this case, value would be the NEXT index's value
                                output[mapped_option.key] = user_supplied_split[i+1];
                                // put the next index in the ignore_index so 
                                // we don't parse it, cause we have no need to.
                                ignore_index.push(i+1);
                                //update module supplied index in case next option
                                //does not have a dash
                                ms_diff--;
                            }
                        }
                        else{
                            // invalid option, bail.
                            output = null;
                            break;
                        }
                    }
                    else{
                        // NO DASH
                        output[module_supplied.options[ms_index].key] = input;
                    }
                }
            }
        }
        
        if(output){
            // fill in the missing flags to make using this object easier
            angular.forEach(module_supplied.options,function(value,key){
                if((value.hasOwnProperty('flag')) && (!output.hasOwnProperty(value.key))){
                    output[value.key] = false;
                } 
            });
        }
        
        return output
    }
    
    // update commands on demand
    $scope.$on('update_commands', function(event,commands){
       //typeahead options
       $scope.command_options = [];
       angular.forEach(commands,function(value,key){
           $scope.command_options.push(value.syntax);
       });
    });
    
    // update autocomplete when user types
    $('.command-bar .input').keydown(function(){
        var value_split = $(this).val().split(" "),
            index = value_split.length-2,
            selected_hipt = $('.hidden-command-input').eq(index),
            name = selected_hipt.attr('data-name');
        if(index >= 0){
            //$scope.command_syntax_model[name] = value_split.slice(-1)[0];
            //$scope.triggerTypeahead(name);
        }
    });
}]);

app.controller('searchCtrl',['$scope','$http','$sce','$timeout',
    function($scope,$http,$sce,$timeout){
    
    $scope.search = {
        shortcuts: {}, 
        shortcuts_typeahead: [],
        name: '',
        input: '',
        param: '',
        object: null,
    };
    
    $scope.search_onselect = function(input){
        // format of input example = Google (@gg)
        // strip out whats in the brackets and use it as if the user just
        // typed "@gg"
        if(angular.isDefined(input)){
            input = input.substring(input.indexOf('(')+1,input.indexOf(')'));
            $scope.search_change(input);
        }
    }
    
    
    $scope.search_change = function(input){
        // compare user input to search-changing-keybinds
        // ... oh ya only do this if the input starts with an @ symbol
        if(input.indexOf('@') === 0){
            // input starts with @, so lets strip that out of the input
            input = input.substr(1);
            // check if input is in mapping
            if(input in $scope.search.shortcuts){
                // valid shortcut, load new search data
                generate_search_scope($scope.search.shortcuts[input]);
            }
        }
    }
    
    $scope.search_get_options = function(input){
        // ensure input is lowercase
        input = input.toLowerCase();
        var output = [];
        // check if the typeahead shortcuts should be shown in this search
        angular.forEach($scope.search.shortcuts_typeahead,function(value,key){
            if(value.toLowerCase().indexOf(input) > -1){
                output.push(value);
            }
        });
        // we need to return the typeahead options based on user input
        // the only thing is, since search works across modules,
        // we don't know if the active module for search is loaded via
        // controllers, so we cannot rely on just requesting the data that
        // way.
        
        // solution, check if active search module has a typeahead url
        var search_obj = $scope.search.object;
        
        if(angular.isDefined(search_obj.url_for_typeahead)){
            // get data from this url
            var parent_scope = $scope.$$nextSibling.$parent,
                route = parent_scope.get_route(search_obj.url_for_typeahead,undefined,search_obj.module);
            $http.post(route,{data:input})
             .success(function(response,status){
                output.concat(response.data);
             });
        }
        
        return output;
    }
    
    // change search when user selected item from dropdown
    $scope.$watch('search.selected_item',function(){
        var input = $scope.search.selected_item;
        if(angular.isDefined(input)){
            $scope.search_onselect(input);   
        }
    });

    // private
    
    function load_search(search_engines,module,delay){
        // if module is undefined, use the currently active module
        var parent_scope = $scope.$$nextSibling.$parent;
        if(!angular.isDefined(module)){
            module = parent_scope.module;
        }
        
        // sometimes we want to delay binding of background data
        // esp when we are switching modules and the data isn't even
        // important yet
        
        // delay is 0 ms by default
        if(!angular.isDefined(delay)){
            delay = 0;
        }
        else{
            delay = 100;
        }
        
        // reset short discovery
        $scope.search = {'shortcuts': {}, 'shortcuts_typeahead': []}
        
        // wrapper to bind all required compontents to search logistics
        // get the active module and load the logistics for it's engine
        angular.forEach(search_engines,function(value,key){
            // get the details for the selected search module
            if(value.module == module){
                // it is very possible that a module can have more than one engine
                // so we look for the primary (aka default) one
                if((!angular.isDefined(value.primary) || value.primary == true)){
                   generate_search_scope(value,delay);
                }
            }
            
            // map the shortcut to value
            $scope.search.shortcuts[value.shortcut] = value;
            // this is for typeahead purposes only
            $scope.search.shortcuts_typeahead.push("Search:"+value.name+" (@"+value.shortcut+")");
            
        });
    }
    
    function generate_search_scope(value,delay){
        
        if(!angular.isDefined(delay)){
            delay = 0;
        }
        else{
            delay = 100;
        }
        var parent_scope = $scope.$$nextSibling.$parent;
        // make sure the name of the search gets shown asap
        $scope.search.name = value.name;
        
        // empty out the input so it is obv that the search changed
        $scope.search.input = "";
        
        // -- background data --
        $timeout(function(){
            // if the loaded engine has the property "url"
            // that means that the endpoint is external (ie. Google)
            // these urls have to be loaded as a "trusted resource" in angular
            if(angular.isDefined(value.url)){
                var action = $sce.trustAsResourceUrl(value.url);
            }
            else{
                // if url is not provided, then use the default 'search'
                // route for the active module
                var action = parent_scope.get_route('search');
            }
            
            $scope.search.action = action;
            
            // a specific url param can be passed, otherwise 
            // default to 'q'
            
            if(!angular.isDefined(value.param)){
                value.param = "q";
            }
            
            $scope.search.param = value.param;
            $scope.search.object = value;
            
            // since the backbone of this is the md-autocomplete directive,
            // we have to add a slight workaround to ensure that forms
            // can be submitted properly.
            // add 'name' to input
            angular.element('#search input').attr({'autocomplete':'off'})
            .keyup(function(e){
                // bind the 'enter' key pressed event
                if(e.keyCode == 13){
                    // enter has been clicked
                    // check if user was just trying to select an dropdown option
                    if(angular.element('#search ul .selected').length == 0){
                        angular.element('#search').submit();
                    }
                }
                else{
                    $scope.search_change($scope.search.input); 
                }
            });
        },delay);
    }
    
    function init(){
        // each module should allow easy access to each piece of meta information
        // seperately from eachother. 
        $http.post($scope.api+'static/base/json/search_engines.json',{})
             .success(function(response,status){
                $scope.search_engines = response.searches;
                load_search($scope.search_engines,undefined,true);
             });
    }
    
    // run these functions when search controller is loaded (ie. on page load)
    init();
    
}]);

app.controller('baseCtrl', ['$scope','$http',function(
    $scope,$http) {
    
    $scope.turtle = function(){
        console.log('helloooooo')
    }
    
    //private
    function init(){
        $http.post($scope.api+'static/json/main.json',{})
             .success(function(response,status){
                $scope.tabs = response.tabs;
                $scope.meta = response.meta;
                $scope.actions = response.actions;
                $scope.routes = response.routes;
                //load the first tab's content
                $scope.load_tab_content($scope.tabs[0].id);
             });
    }
    
    //init
    init();

}]);