/* 

Main Contoller

Controllers state of the page, such as what view is appearing if the 
user is logged in or not.

*/

app.controller('mainCtrl', ['$scope','$http','$localStorage','$sessionStorage', function(
    $scope,$http,$localStorage,$sessionStorage) {
    
    $scope.api = '/';
    $scope.logged = false;
    $scope.$storage = $localStorage;

    client_id = '2175e6706018c9472694';
    client_secret = '2eb3bf30aec9bed3226b7fc30728e8c26283910b';
    grant_type = 'password';

    //Attempt to log the user in

    $scope.login = function(username,password){
        var data = {
            username: username,
            password: password,
            client_id: client_id,
            client_secret: client_secret,
            grant_type: grant_type
        }

        $http.post($scope.api+'controllers/base/login/',data)
             .success(function(data,status){
                if(data.status == 'success'){
                    //Get current seconds, and add the expired time to them
                    var seconds = new Date().getTime() / 1000;
                    $localStorage.$reset({
                        access_token: data.response.access_token,
                        expires: seconds+(data.response.expires_in)
                    });
                }
              });
    }

}]);