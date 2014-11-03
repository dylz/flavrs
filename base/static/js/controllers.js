/* 

Main Contoller

Controllers state of the page, such as what view is appearing if the 
user is logged in or not.

*/

app.controller('mainCtrl', ['$scope','$http','$localStorage','$sessionStorage',
                            '$cookies','$q','$location','$controller',
                            '$rootScope','$modal','$timeout','$route',function(
    $scope,$http,$localStorage,$sessionStorage,$cookies,$q,$location,
    $controller, $rootScope,$modal,$timeout,$route) {
    
    $scope.api = '/';
    $scope.ready = false;
    $scope.logged = false;
    $scope.$storage = $localStorage;
    $scope.selectedTab = 0;

    client_id = '2175e6706018c9472694';
    client_secret = '2eb3bf30aec9bed3226b7fc30728e8c26283910b';
    grant_type = 'password';

    //modules.. this won't be hardcoded in the future.. so fix this kay!?
    $scope.modules = ['base','bookmarks','events','twitter'];
    //store modules that have been loaded already so the routing does not load
    //them again.
    $scope.module_is_loaded = false;
    $scope.carry_on = true;
    
    //command bar default - hide it
    $scope.command_bar = false;
    
    //Attempt to log the user in

    $scope.login = function(is_valid){
        if(is_valid){
            var data = {
                username: $scope.username,
                password: $scope.password,
                remember_me: $scope.remember_me,
                client_id: client_id,
                client_secret: client_secret,
                grant_type: grant_type
            }

            $http.post($scope.api+'controllers/base/login/',data)
                 .success(function(data,status){
                    //Get current seconds, and add the expired time to them
                    var seconds = new Date().getTime() / 1000;
                    $localStorage.$reset({
                        access_token: data.access_token,
                        expires: seconds+(data.expires_in),
                        logged: true
                    });
                    //Say the user is logged in
                    $scope.logged = true;
                  })
                 .error(function(data,status){
                    console.log('this is an error')
                 })
        }
    }

    $scope.check_if_logged = function(){
        // Check if the user is logged in or not
        var logged = true,
            required_localStorage = ['access_token','expires','logged'],
            check_login = function(){
                $http.post($scope.api+'controllers/base/check_login/',{})
                     .success(function(data,status){
                        logged = data.logged;
                        final_step();
                      });
            },
            final_step = function(){
                if(logged){
                    //set scope to logged
                    $scope.logged = true;
                }
                else{
                    //not logged in, but lets make sure sessions and storage is clean
                    // for when the user logs in
                    required_localStorage.forEach(function(ele){
                        //delete all localStorage here
                        delete $localStorage[ele];
                    });
                    delete $cookies['sessionid'];
                }

                //we are ready to show the page!
                $scope.ready = true;
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

    $scope.logout = function(){
        //log the user out
        $http.post($scope.api+'controllers/base/logout/',{})
             .success(function(data,status){
                //logged out of back end, lets clear the localStorage
                //and other cookies
                $localStorage.$reset();
                delete $cookies['remember_token'];
                $scope.logged = false;
              });
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
        $scope.tabs = response.tabs;
        $scope.meta = response.meta;
        $scope.actions = response.actions;
        $scope.routes = response.routes;
        $scope.commands = response.commands;
        //load the first tab's content
        $scope.load_tab_content($scope.tabs[0].id);
        
        //tell the app that this module is loaded so it does not try to load it again.
        $scope.module_is_loaded = true;
        
        // update the command bar logic by broadcasting to the command controller
        $scope.$broadcast('update_commands',response.commands);
    }
    
    //Get the tab content for the selected tab
    $scope.load_tab_content = function(id){
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
             });
    }
    
    //generic share function
    $scope.share = function(){
        console.log('HEY')
    }
    
    $scope.location = function(route){
        
        /// check internal routes
        
        switch (route) {
            case '/':
                //if route is empty, load the 'root' path (this is the module root)
                route = $scope.module;
                break;
            default:
                //get the actual path
                route = $scope.get_route(route)
        }
        
        $location.path(route);
    }
    
    //wrapper for ngclicks outside of this scope
    
    $scope.broadcast = function(ngclick,arg){
        $rootScope.$broadcast(ngclick,arg);
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
            //modal is closed.. update route to module root
            $scope.location('/');
        });
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
        // First we broadcast an event so all fields validate themselves
        $scope.$broadcast('schemaFormValidate');
        // Then we check if the form is valid and broadcast the result
        $timeout(function(){
            $rootScope.$broadcast(callback,form.hasClass('ng-valid'));
        },100);
    }
    
    
    //listen to validate the form on request
    $scope.$on('validate_modal_form', function(event, callback) {
        return $scope.validate_modal($("#modal_form"),callback);
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
    $scope.get_route = function(route){
        var output = null;
        angular.forEach($scope.routes,function(value,key){
            if(value.name == route){
                output = value.route;
            }
        });
        
        if(output !== null){
            // route is found. We need to remember to append the current module
            // the user is in to prevent routing conflicts.
            return $scope.module+'/'+output;
        }
        else{
            throw new Error(route+' does not exist.')   
        }
    };
    
    $rootScope.$on("$locationChangeStart", function(event, current) {
        //Get the path, and use it to determine the module
        var path_split = $location.path().split('/'),
            load_ctrl = function(){
                $controller(ctrl_name,{$scope:$scope});
            }
        
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
            load_ctrl();
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
        update_view();
    });
    
    //Private functions
        
    function update_view(){
        //check the rest of the route and determine what controller to load
        
        var route_arr = $location.path().split('/'),
            route_value = route_arr.length-2,
            found_route = null;
        
        
        angular.forEach($scope.routes,function(value,key){
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
                            route: {'initialized': true, 'args': {}}
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
                        'locals': locals
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
                                $controller(value.controller,locals);
                            }
                        });
                    }
                    else{
                        $controller(value.controller,locals);
                    }
                }
            }
        });
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
    //check if user is logged or not
    $scope.check_if_logged();
    //Fix height of tab content to match document size
    fix_height();
    //Bind this to a scroll event so the height gets fixed whenever the user scrolls
    window.onresize = function(event) {
        fix_height();
    };
    
    window.onscroll = function(event){
        fix_height();
    };
    
    // Check when user clicks '/' on their keyboard, then show the command bar
    document.onkeypress=function(e){
        var e=window.event || e;
        //only trigger then if user is not typing in an input
        var tag = document.activeElement.tagName;
        if((e.charCode == '47') && (tag != "INPUT")){
            $scope.$apply(function(){
               $scope.command_bar = true;
               $timeout(function(){
                   $('.command-bar .input').focus();
               },100)
            });
        }
    }
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
            // 
            var command_split = command.split(" ");
            if(command_split.length == 1){
                //get the correct command
                var option = null;
                angular.forEach($scope.commands,function(value,key){
                   if(command == value.syntax.split(" ")[0]){
                       option = value;
                   } 
                });
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
    
    // update commands on demand
    $scope.$on('update_commands', function(event,commands){
       //typeahead options
       $scope.command_options = [];
       angular.forEach(commands,function(value,key){
           var syntax_split = value.syntax.split(' ');
           $scope.command_options.push(syntax_split[0]);
       });
    });
    
    // update autocomplete when user types
    $('.command-bar .input').keydown(function(){
        var value_split = $(this).val().split(" "),
            index = value_split.length-2,
            selected_hipt = $('.hidden-command-input').eq(index),
            name = selected_hipt.attr('data-name');
        if(index >= 0){
            $scope.command_syntax_model[name] = value_split.slice(-1)[0];
            $scope.triggerTypeahead(name);
        }
    });
}]);

//Tab management controller
app.controller('tabCtrl', ['$scope', function($scope){
    $scope.status = "create";
    //we are going to create a deepcopy of the tabs so we can mess with them
    //as much as possible without effecting the front end and the "true" copy
    //of what the user sees
    $scope.tabs_copy = angular.copy($scope.tabs);
    $scope.buttons = [
        {'name': 'Save', 'colour': 'primary','ngclick': 'save'},
        {'name': 'Save & Close', 'colour': 'info','ngclick': 'saveClose'},
        {'name': 'Close', 'colour': 'warning','ngclick': 'close'}
    ];
    
    var body = '<div class="col-md-6"><table class="table table-striped">'+
                    '<thead>'+
                        '<tr>'+
                            '<th>Name</th>'+
                            '<th></th>'+
                        '</tr>'+
                    '</thead>' +
                    '<tbody as-sortable="sortableTabs" ng-model="tabs_copy">'+
                        '<tr ng-repeat="tab in tabs_copy" ng-click="edit_tab(tab)" as-sortable-item>'+
                            '<td>{{tab.title}}</td>'+
                            '<td as-sortable-item-handle class="col-md-1">'+
                            '<i class="fa fa-arrows"></i></td>'+
                        '</tr>'+
                    '</tbody>'+
                '</table></div>';
    
    $scope.modal = {
        "class": "tab-management",
        title: "Manage Tabs",
        body: body,
        form: {
            header: "Add Tab",
            "class": "col-md-6",
        }
    }
    
     $scope.schema = {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "title": "Title",
                "description": "",
                "required": true
            }
        },
        "required": ["title"]
    };
    $scope.form = [
            "*",
            {
                title:'cancel',
                type:'button',
                onClick: function(modelValue,form){
                    $scope.create_tab();
                }
            }
        ];
    $scope.model = {};
    
    // Edit a tab by clicking that tab's row in the table
    $scope.edit_tab = function(tab){
        $scope.tab_to_edit = tab;
        //auto fill title
        $scope.model.title = tab.title;
        //enable "cancel" link (done thru jquery cause we do not have access)
        //to ng-if
        $('.tab-management .form-group:last button').show();
        //update form header
        $scope.modal.form.header = "Edit Tab";
        //set 'edit' status
        $scope.status = "edit";
    }
    
    //set "create" state
    $scope.create_tab = function(){
        //reset model inputs
        $scope.model.title = "";
        //hide cancel btn
        $('.tab-management .form-group:last button').hide();
        //update form header
        $scope.modal.form.header = "Add Tab";
        //auto focus the first input
        $('.tab-management form input:first').focus();
        //set "create" status
        $scope.status = "create";
    }
    
    //button actions
    
    //close - close the model
    $scope.$on('close',function(){
        $scope.$emit('close_modal');
    });
    
    //save - update if edit status or create tab
    $scope.$on('save',function(){
        $scope.save();
    });
    
    //save it, then if successful, close the modal
    $scope.$on('saveClose',function(){
        $scope.close_modal = true;
        $scope.save();
    });
    
    // Save function
    $scope.save = function(){
        console.log(' i am saving')
        if($scope.status == 'create'){
            
        }
        else{
            //update tab info from what was set in the form
            var tab = $scope.tab_to_edit;
            tab.title = $scope.model.title;
        }
        
        //if "close modal" is a thing, close the modal!
        if($scope.close_modal){
            $scope.$emit('close_modal');
        }
    }
    
    //sortable
    $scope.sortableTabs = {
        accept: function (sourceItemHandleScope, destSortableScope) {return true},
        itemMoved: function (event) {},
        orderChanged: function(event) {},
    };
    
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