/*
    Controllers for the Bookmarks module
*/

app.controller('bookmarksCtrl', ['$scope','$http',function(
    $scope,$http) {

    $scope.open_link_modal = function(){
        $scope.open_modal('openModalCtrl');   
    }
    
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

//Controller for modal window
app.controller('openModalCtrl', ['$scope',function($scope) {

    console.log('OPEN MODAL')
}]);