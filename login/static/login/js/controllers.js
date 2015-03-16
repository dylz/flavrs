/*
    Controllers for the Events module
*/

app.controller('loginCtrl', ['$scope','$flavrs','$http','$localStorage','$cookies',
    function($scope,$flavrs,$http,$localStorage,$cookies) {
    
    //Attempt to log the user in

    $scope.login = function(username,password){
        var client_id = '2175e6706018c9472694',
            client_secret = '2eb3bf30aec9bed3226b7fc30728e8c26283910b',
            grant_type = 'password',
            data = {
                username: username,
                password: password,
                remember_me: $scope.remember_me,
                client_id: client_id,
                client_secret: client_secret,
                grant_type: grant_type
            };

        $http.post($scope.api+'controllers/base/login/',data)
             .success(function(data,status){
                //Get current seconds, and add the expired time to them
                var seconds = new Date().getTime() / 1000;
                $localStorage.$reset({
                    access_token: data.access_token,
                    expires: seconds+(data.expires_in),
                    logged: true
                });
                // at an application level, indicate that the user is logged in
                // other modules would most likely be interested in this
                $flavrs.logged = true;
              })
             .error(function(data,status){
                console.log('this is an error')
             })
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
                    //set app to logged
                    $flavrs.logged = true;
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
                $flavrs.logged = false;
              });
    }
    
}]);

