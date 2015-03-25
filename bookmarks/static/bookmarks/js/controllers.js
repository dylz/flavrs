/*
    Controllers for the Bookmarks module
*/

flavrs_modules.bookmarks = {
    "meta": {
        "name": "Bookmarks",
        "code": "bookmarks",
        "version": "0.1",
        "colour": "#0f6",
        "root": "/",
        'initialize_url': 'initialize/',
        'glossary': {
            'sidenav': 'Tab',
            'sidenav_plural': 'Tabs'
        }
    },
    "actions": [
        { "name": "Add Bookmark", "icon": "bookmark", "colour": "lightblue", "route": "add" },
        { "name": "Do Things", "icon": "remove", "colour": "lightblue", "route": "add" },
        { "name": "Make Things!", "icon": "plane", "colour": "lightblue", "route": "add" }
    ],
    "routes": [
        {"name": "index", "route": "", "controller": "bookmarksCtrl",
            "template": "base/card.html"
        },
        {"name":"sidenav","route":"tab/:id/","controller":"bookmarksCtrl"},
        {"name":"sidenav_add","route":"tab/add/","controller":"tabCtrl","view":"modal"},
        {"name":"sidenav_edit","route":"tab/edit/","controller":"bookmarksCtrl"},
        {"name": "add","route": "add/", "controller": "openModalCtrl"},
        {"name": "edit","route": "edit/:id/","controller": "openModalCtrl"},
        {"name": "search","route": "search/", "controller": "openModalCtrl"}
    ],
    "commands": [
        {
            "syntax": "add",
            "options": [
                {"option": "u", "key": "url", "position":2, "required": true},
                {"option": "n", "key": "name", "position":1, "required": true},
                {"option": "d", "key": "nocommit", "flag": true}
            ]
        },
        {
            "syntax": "edit", 
            "options": [
                {"option": "i", "key": "id", "position": 2},
                {"option": "n", "key": "name", "position":1}
            ]
        }
    ]
};

app.service('bookmarks', function(){
    this.content = [];
});

app.controller('bookmarksCtrl', ['$scope','$http','$flavrs','$controller', 'bookmarks',
    function($scope,$http,$flavrs, $controller,bookmarks) {
    
    $scope.open_link_modal = function(){
        $scope.open_modal('openModalCtrl');   
    }
    
    //validators
    $scope.validators = {
        check_id: function(id){
            // check if id is fail
            var good_to_go = false;
            angular.forEach($scope.tab_content,function(value,key){
                if(value.id == id){
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
    
    function get_content(id){
        // id = tab_id
        $http.post($scope.meta.root+'static/bookmarks/json/'+id+'.json',{})
             .success(function(response,status){
                $scope.tab_content = response;
                // store in service for modal window
                bookmarks.content = response;
                // store this result in local storage for later use
                // BTW we will only use the data for 5 mins, after that we request new data
                //$scope.$storage[key] = {
                //    expires: new Date().getTime()+300000,
                //    data: response
                //};
             });
    }
    
    function init(){
        var route = $flavrs.routes.current,
            sidenav = $flavrs.modules.current().sidenav,
            id = null;
        
        switch(route.name){
            case 'index':
                // "home" of bookmarks, for now just load the first sidenav
                // content until all logistics get figured out
                if(sidenav.length > 0){
                    id = sidenav[0].id;
                }
            break;
            case 'sidenav':
                // check if id is valid
                if($flavrs.validators.is_valid('id',route.args.id,sidenav)){
                    id = route.args.id;
                }
            break;
        };
        
        if(id){
            // id is valid, load the content for it
            get_content(id);    
        }
        else if(sidenav.length == 0){
            // no sidenavs, what should we show the user?
        }
        else{
            // id was not valid, send user to "home"
            // this really should not happen if the user is navigating properly
            //window.location.href = $flavrs.routes.get("home");
        }
        
    }
    
    init();

}]);

//Controller for modal window
app.controller('openModalCtrl', ['$scope','route','bookmarks', '$http', '$flavrs',
    function($scope,route,bookmarks,$http,$flavrs) {
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
        {'name': 'Save', 'colour': 'md-primary','ngclick': 'save'},
        {'name': 'Cancel', 'colour': 'md-warn','ngclick': 'close'}
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
        
        // check if there is content loaded (from the service)
        if(bookmarks.content.length > 0){
        
            angular.forEach(bookmarks.content,function(value,key){
               if(value.id == route.args.id){
                   content = value;
               } 
            });
            
        }
        else{
            // no content is loaded, lets try to get this data from server
            var data = {
                id: route.args.id
            }
            content = {
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
            //$http.post('',data)
                 //.success(function(data,status){
                     //content = data;
                 //})
        }
        
        if(content !== null){
            var model = {
                "url": content.card_url,
                "name": content.header.text
            }    
        }
        else{
            // this should never get here.. as no id is found
            $scope.emit('close_modal');
            return;
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

//Tab management controller
app.controller('tabCtrl', ['$scope','$flavrs', function($scope,$flavrs){
    
    var route = $flavrs.routes.current;
    
    switch(route.name){
        case 'sidenav_add':
            var model = {};
        break;
        case 'sidenav_edit':
            var tabs = $flavrs.modules.current().sidenav,
                tab = null;
            // deepcopy - keep original data intacked
            $scope.sidenav_copy = angular.copy(tabs);
            var item = $flavrs.sidenav.get_by_id(route.args.id);
            if(item){
                var model = {title: item.title};
            }
            else{
                // invalid tab to edit
            }
        break;
    }
    
    $scope.actions = [
        {
            name: 'Save', 
            colour: 'md-primary',
            click: function(){
                console.log($scope.form.model)
            }
        },
    ];
    
    $scope.modal = {
        title: "Manage Tabs",
        form: {
            header: "Add Tab",
        }
    }
    
    $scope.form = {
        fields: [
            {
                type: 'text',
                title: 'Title',
                name: 'title'
            }
        ],
        model: {}
    };
}]);