/*
    Controller for Logging a user in
*/

app.controller('loginCtrl', ['$scope','$flavrs','$http','$localStorage','$cookies',
    function($scope,$flavrs,$http,$localStorage,$cookies) {
    
    //Attempt to log the user in
    
    $scope.normal_login = function(username,password,remember_me){
        var data = {
                username: username,
                password: password,
                remember_me: remember_me
            },
            promise = login(data);
        
        promise.success(function(){
            
        });
    }

    $scope.oauth_login = function(username,password,remember_me){
        var client_id = '2175e6706018c9472694',
            client_secret = '2eb3bf30aec9bed3226b7fc30728e8c26283910b',
            grant_type = 'password',
            data = {
                username: username,
                password: password,
                remember_me: remember_me,
                client_id: client_id,
                client_secret: client_secret,
                grant_type: grant_type
            },
            promise = login(data);
        
        promise.success(function(){
            var seconds = new Date().getTime() / 1000;
            $localStorage.$reset({
                access_token: data.access_token,
                expires: seconds+(data.expires_in),
                logged: true
            });
        });
    }
    
    
    function login(data){
        var promise = $http.post($flavrs.meta.api+'login/',data);
        promise.error(function(data,status){
                console.log('this is an error')
            
        });
        
        return promise;
    }
}]);

