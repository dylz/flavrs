/* 

Main Contoller

Controllers state of the page, such as what view is appearing if the 
user is logged in or not.

*/

app.controller('mainCtrl', ['$scope','$http','$localStorage','$sessionStorage',
                            '$cookies','$q','$location','$controller',
                            '$rootScope','$modal','$timeout',function(
    $scope,$http,$localStorage,$sessionStorage,$cookies,$q,$location,
    $controller, $rootScope,$modal,$timeout) {
    
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
    
    //wrapper for ngclick buttons. Angular doesn't like dynamic ng-clicks too much.
    $scope.click = function(ngclick){
        $scope[ngclick]();
    }
    
    //wrapper for ngclicks outside of this scope
    
    $scope.broadcast = function(ngclick,arg){
        $rootScope.$broadcast(ngclick,arg);
    }

    //generic 'open modal window' function
    $scope.open_modal = function(controller,content){
        
        //if content is passed, send it to the controller to do whatever
        //data binding it wishes
        if(!angular.isDefined(content)){
            content = {};
        }
        
        $scope.modalInstance = $modal.open({
            templateUrl: 'modal.html',
            controller: controller,
            scope: $scope,
            size: 'lg',
            backdrop: true,
            resolve: {
                content: function(){
                    return content;
                }
            }
        });
        
        $scope.modalInstance.opened.then(function () {
            //focus the first input
            //timeout is used to ensure the rendering of angular-scheme attributes
            //are compeleted properly before focusing the input
            $timeout(function(){
                $('.modal-body input:first').focus();
            },250);
        }, function () {
            
        });
    }
    
    //generic edit - open modal and pass content. let the modules' controller
    // do the rest of the work
    $scope.edit = function(content,controller){
        $scope.open_modal(controller,content);
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
    
    $rootScope.$on("$locationChangeSuccess", function(event, current) {
        //Get the path, and use it to determine the module
        var path_split = $location.path().split('/'),
            load_ctrl = function(){
                $controller(ctrl_name,{$scope:$scope});
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

        if(foundit){
            load_ctrl();
        }
    });
    
    //Private functions
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
                //load the first tab's content
                $scope.load_tab_content($scope.tabs[0].id);
             });
    }
    
    //init
    init();

}]);