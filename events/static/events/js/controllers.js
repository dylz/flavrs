/*
    Controllers for the Events module
*/

app.controller('eventsCtrl', ['$scope','$http',function(
    $scope,$http) {

        //private
    function init(){
        $http.post($scope.api+'static/bookmarks/json/main.json',{})
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