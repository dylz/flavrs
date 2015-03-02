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
    
    //handle the command emit
    $scope.$on('command_emit',function(event,command){
        // user has submitted a command to add a bookmark.
        // if the nocommit flag is flag, then load it in the modal
        // otherwise just go ahead and try to add the bookmark
        if(command.nocommit){
            
        }
        else{
            var params = {
                'name': command.name,
                'url': command.url
            }
            
            $scope.location('add',params);
        }
    });
    
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
    var self = this;
    
    if(route.initialized){
        route.initialized = false;
        var locals = {
            route: route,
            $scope: $scope
        };
        $scope.open_modal('openModalCtrl',locals);
        return;
    }
    
     if($scope.loaded_controllers.indexOf('openModalCtrl') > -1){
        self.loaded = true;
    }
    else{
        self.loaded = false;
        $scope.loaded_controllers.push('openModalCtrl');
    }
    
    $scope.buttons = [
        {'name': 'Save', 'colour': 'md-primary md-default-theme','ngclick': 'save'},
        {'name': 'Cancel', 'colour': '','ngclick': 'close'}
    ];
    
    //set modal
    $scope.modal = {
        title: "Add Bookmark"
    }
    
    //validation
  
    // save bookmark
    // make sure process goes in correct order and does not call the same thing
    // to make times.
    self.save_counter = 0;
    if(!self.loaded){
    $scope.$on('save', function(event, success) {
        
        if(!angular.isDefined(success) && self.save_counter == 0){
            //try to save data
            self.save_counter = 1;
            $scope.$emit('validate_modal_form','save');
        }
        else if(success && self.save_counter == 1){
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

            // reset process
            self.save_counter = 0;
        }
        else{
            //not so successful
            // reset process
            self.save_counter = 0;
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
    }
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
    $scope.form = {
        fields: [
            {
                type: "text",
                minlength: 5,
                required: true,
                title: "URL",
                name: "url",
                change: function(){
                    
                }
            },
            {
                type: "text",
                title: "Name",
                name: "name",
                description: "If left blank, name will be determined from URL.",
            }
        ]
    };
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
        var model = {}
        // check if any url params are present and if so use them to prepopulate
        // the fields
        angular.forEach(route.params,function(value,key){
            model[key] = value;
        });
    }
    
    $scope.form.model = model;
}]);