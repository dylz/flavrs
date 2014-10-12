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
app.controller('openModalCtrl', ['$scope','content',function($scope,content) {
    $scope.buttons = [
        {'name': 'Save', 'colour': 'primary','ngclick': 'save'},
        {'name': 'Cancel', 'colour': 'warning','ngclick': 'close'}
    ];
    
    //set modal
    $scope.modal = {
        title: "Add Bookmark"
    }
    
    //button actions
    $scope.$on('save', function(event, success) {
        if(!angular.isDefined(success)){
            //try to save data
            $scope.$emit('validate_modal_form','save');
        }
        else if(success){
            //save was sucessful
            //add to tab's content
             var data =   {
                "card_type": "link",
                "card_url": "http://mail.google.com",
                "header": {
                    "text": "Gmail"
                },
                "body": {
                    "img16": "http://www.google.com/s2/favicons?domain=mail.google.com",
                    "text": "mail.google.com"
                },
                "footer": {
                    "options": [
                        {"name": "Edit","icon":"edit", "link": "details"},
                        {"name": "Share","icon":"share", "ngclick": "share"}
                    ]
                }
            }
            $scope.$emit('add_to_content',data);
            //close modal
            $scope.$emit('close_modal');
        }
        else{
            //not so successful
        }
       
        //enter 'saving' state
        //var save_button = $scope.buttons[0];
        //save_button.disabled = true;
        //save_button.icon = "spinner fa-spin";
        //save_button.name = 'Saving...';
        //attempt to save
    });
    
    $scope.$on('close', function(event, args) {
        $scope.$emit('close_modal');
    });
    
    //form schema
    $scope.schema = {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "minLength": 5,
                "required": true,
                "title": "URL",
                "content": "card_url"
            },
            "name": {
                "type": "string",
                "title": 'Name',
                "description": "If left blank, name will be determined from URL.",
                "content": "header.text"
            }
        },
        "required": ["url"]
    };
    $scope.form = [
        "*"
    ];
    
    //if "content",set up model. Otherwise, it is blank.
    //basically, if "content", we are editing, and if empty, we are creating.
    
    if($.isEmptyObject(content)){
        //empty - create
        var model = {};
    }
    else{
        //edit
        var model = {
            "url": content.card_url,
            "name": content.header.text
        }
    }
    
    $scope.model = model;

}]);