/*
    Controllers for the Bookmarks module
*/

app.controller('bookmarksCtrl', ['$scope','$http',function(
    $scope,$http) {
    
    $scope.open_link_modal = function(){
        $scope.open_modal('openModalCtrl');   
    }
    
    //validators
    $scope.validators = {
        check_id: function(path,params){
            // check if id is fail
            var good_to_go = false;
            angular.forEach($scope.tab_content,function(value,key){
                if(value.id == params.id){
                    good_to_go = true;
                }
            });
            console.log(good_to_go)
            if(good_to_go){
                // id is valid, so let the process carry on
                return true;
            }
            else{
                // id is not valid, throw 404 and end routing process
                return false;
            }
        }
    }
    
    //private
    function init(){
        $http.post($scope.api+'static/bookmarks/json/main.json',{})
             .success(function(response,status){
                $scope.register_init(response);
             });
    }
    
    //init
    init();

}]);

//Controller for modal window
app.controller('openModalCtrl', ['$scope','route',function($scope,route) {
    
    if(route.initialized){
        route.initialized = false;
        var locals = {
            route: route,
            $scope: $scope
        };
        $scope.open_modal('openModalCtrl',locals);
    }
    
    $scope.buttons = [
        {'name': 'Save', 'colour': 'primary','ngclick': 'save'},
        {'name': 'Cancel', 'colour': 'warning','ngclick': 'close'}
    ];
    
    //set modal
    $scope.modal = {
        title: "Add Bookmark"
    }
    
    //validation
    
    
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
    
    // Check if 'id' is in args. If so, then we are in an 'edit' state.
    
    if(angular.isDefined(route.args.id)){
        // edit
        // Get the content with this id
        
        var content = null;
        angular.forEach($scope.tab_content,function(value,key){
           if(value.id == route.args.id){
               content = value;
           } 
        });
        
        if(content !== null){
            var model = {
                "url": content.card_url,
                "name": content.header.text
            }    
        }
        else{
            // this should never get here.. as no id is found
            // the 404 handler should of taken care of this for us.
            var model = {};
        }
    }
    else{
        // add
        var model = {};
    }
    
    
    $scope.model = model;

}]);