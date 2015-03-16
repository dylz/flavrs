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

        $http.post($scope.api+'controllers/login/auth/',data)
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

    

    $scope.logout = function(){
        //log the user out
        $http.post($scope.api+'controllers/login/logout/',{})
             .success(function(data,status){
                //logged out of back end, lets clear the localStorage
                //and other cookies
                $localStorage.$reset();
                delete $cookies['remember_token'];
                $flavrs.logged = false;
              });
    }
    
}]);

