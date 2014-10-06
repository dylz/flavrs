/*
    Controllers for the Bookmarks module
*/

app.controller('bookmarksCtrl', ['$scope','$http',function(
    $scope,$http,$modalInstance) {

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
    $scope.buttons = [
        {'name': 'Save', 'colour': 'primary','ngclick': 'save' },
        {'name': 'Cancel', 'colour': 'warning','ngclick': 'close' }
    ];
    
    //button actions
    $scope.$on('save', function(event, args) {
        console.log('ON SAVE k')
    });
    
    $scope.$on('close', function(event, args) {
        $scope.$emit('close_modal');
    });
    
    //form schema
    $scope.schema = {
        type: "object",
        properties: {
            name: {
                type: "string",
                minLength: 2,
                title: "Name",
                description: "Name or alias"
            },
            title: {
                type: "string",
                enum: ['dr', 'jr', 'sir', 'mrs', 'mr', 'NaN', 'dj']
            }
        }
    };
    
    $scope.form = [
        "*", {
            type: "submit",
            title: "Save"
        }
    ];
    
    $scope.model = {};
        
}]);