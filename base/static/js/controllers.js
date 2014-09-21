/* 

Main Contoller

Controllers state of the page, such as what view is appearing if the 
user is logged in or not.

*/

app.controller('mainCtrl', ['$scope','$http','$localStorage','$sessionStorage',
                            '$cookies','$q','$location','$controller',
                            '$rootScope',function(
    $scope,$http,$localStorage,$sessionStorage,$cookies,$q,$location,
    $controller, $rootScope) {
    
    $scope.api = '/';
    $scope.ready = false;
    $scope.logged = false;
    $scope.$storage = $localStorage;

    client_id = '2175e6706018c9472694';
    client_secret = '2eb3bf30aec9bed3226b7fc30728e8c26283910b';
    grant_type = 'password';

    //modules.. this won't be hardcoded in the future.. so fix this kay!?
    $scope.modules = ['bookmarks'];

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

    $rootScope.$on("$locationChangeSuccess", function(event, current) {
        //Get the path, and use it to determine the module
        var path_split = $location.path().split('/'),
            load_ctrl = function(){
                $controller(ctrl_name,{$scope:$scope});
            }

        $scope.module = path_split[1];
        
        if($scope.module == ""){
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

    //Init functions
    //check if user is logged or not
    $scope.check_if_logged();

}]);


app.controller('baseCtrl', ['$scope','$http',function(
    $scope,$http) {
    
    var tabs = [
      { title: 'Polymer', active: true,  disabled: false, content:"Polymer practices are great!" },
      { title: 'Material', active: false, disabled: true , content:"Material Design practices are better!" },
      { title: 'Angular', active: false, disabled: true , content:"AngularJS practices are the best!" },
      { title: 'NodeJS' , active: false, disabled: false, content:"NodeJS practices are amazing!" },
      { title: 'Tab 5', active: true,  disabled: false, content:"Tab 5 content..." },
      { title: 'Tab 6', active: false, disabled: true , content:"Tab 6 content..." },
      { title: 'Tab 7', active: false, disabled: true , content:"Tab 7 content..." },
      { title: 'Tab 8' , active: false, disabled: false, content:"Tab 8 content..." },
      { title: 'Tab 9', active: false, disabled: true , content:"Tab 9 content..." },
      { title: 'Tab 10' , active: false, disabled: false, content:"Tab 10 content..." },
      { title: 'Tab 11', active: false, disabled: true , content:"Tab 11 content..." },
      { title: 'Tab 12' , active: false, disabled: false, content:"Tab 12 content..." }
    ];

    $scope.selectedIndex = 0;
    $scope.locked = true;

}]);