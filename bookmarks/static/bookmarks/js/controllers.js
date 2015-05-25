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
    "fabs": [
        { "name": "Add Bookmark", "icon": "bookmark", "colour": "lightblue", "route": "add"},
    ],
    "actions": [
        { "name": "Add Bookmark", "icon": "bookmark", "route": "add"},
        //{ "name": "Manage Bookmarks", "fn": "manage", 'routes': ['index','sidenav','search']},
        { "name": "Manage Bookmarks", "route": "manage_redirect"},
    ],
    "fab_groups": {
        'default': [
            { "name": "Add Bookmark", "icon": "bookmark", "colour": "lightblue", "route": "add"}
        ],
        'manage': [
            { "name": "Move Items", "icon": "arrow-right", "emit": "move"},
            { "name": "Delete Items", "icon": "remove", "emit": "delete", "colour": "md-warn"},
        ]
    },
    "routes": [
        {"name": "index", "route": "", "controller": "bookmarksCtrl",
            "template": "base/card.html"
        },
        {"name":"sidenav_add","route":"tabs/add/","controller":"tabCtrl","view":"modal"},
        {"name":"sidenav_edit","route":"tabs/edit/:id/","controller":"tabCtrl","view":"modal"},
        {"name":"sidenav_order","route":"tabs/order/","controller":"tabOrderCtrl","view":"modal"},
        {"name":"sidenav","route":"tabs/:id/","controller":"bookmarksCtrl"},
        {"name": "add","route": "add/", "controller": "bookmarksModalCtrl", "view":"modal"},
        {"name": "edit","route": "edit/:id/","controller": "bookmarksModalCtrl", "view":"modal"},
        {"name": "search","route": "search/", "controller": "searchCtrl", "theme": "search", 
            "toolbar":"search"},
        {"name": "manage","route": "tabs/manage/:id/", "controller": "manageCtrl", "theme": "green", "actions": "manage"},
        {"name": "manage_redirect","route": "tabs/manage/redirect/"}
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

app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/', {
            templateUrl: '/static/base/templates/card.html',
            controller: 'bookmarksCtrl',
            name: 'index',
            theme: 'default',
            //fabs: [],
            sidenav: {
                left: {
                    title: 'Tabs'
                }
            }
    })
 }]);

app.service('bookmarks', function($flavrs,$route,$http){
    var self = this;
    self.content = [];
    self.loaded_id = null;
    self.initialized = false;
    
    self.create_object = function(link){
        return {
            "id": link.id,
            "card_type": "link",
            "card_url": link.url,
            "header": {
                "text": link.name
            },
            "body": {
                "img16": link.img,
                "text": link.domain
            },
            "footer": {
                "options": [
                    {"name": "Edit","icon":"edit", "route":"edit"},
                    {"name": "Share","icon":"share", "route": "share"}
                ]
            }
        }
    };
    
    self.initialize = function(){
        var promise = $http.post('/bookmarks/initialize/',{});
        
        promise.success(function(response,status){
            self.initialized = true;
            self.sidenav = response.sidenav;
            $flavrs.ui.sidenav = response.sidenav;
        });
        
        return promise;
    }
});

app.controller('bookmarksCtrl', ['$scope','$http','$flavrs','$controller', 'bookmarks','$compile','$route',
    function($scope,$http,$flavrs, $controller,bookmarks,$compile,$route) {
    
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
        $http.get('/bookmarks/tab/'+id+'/')
             .success(function(response,status){
                bookmarks.raw_content = response;
                var data = [];
                // reformat data
                response.forEach(function(link){
                    data.push(bookmarks.create_object(link));
                });
                $scope.tab_content = data;
                // store in service for modal window
                bookmarks.content = data;
                // store this result in local storage for later use
                // BTW we will only use the data for 5 mins, after that we request new data
                //$scope.$storage[key] = {
                //    expires: new Date().getTime()+300000,
                //    data: response
                //};
                //$compile($('#tab-content div:first'))($scope)
             });
    }
    
    function init(){
        var route = $route.current.$$route,
            sidenav = bookmarks.sidenav,
            id = null;
            
        switch(route.name){
            case 'index':
                // "home" of bookmarks, for now just load the first sidenav
                // content until all logistics get figured out
                if(sidenav.length > 0){
                    id = sidenav[0].id;
                }
            break;
            case 'tab':
                // check if id is valid
                if($flavrs.validators.is_valid('id',route.args.id,sidenav)){
                    id = route.args.id;
                }
            break;
        }
        
        if(id){
            // id is valid, load the content for it if not loaded already
            if(bookmarks._loaded_id != id){
                get_content(id);
                // set the active tab
                $scope.active_nav_id = id;
                // set this id as loaded
                bookmarks._loaded_id = id;
            }
        }
        else if(sidenav.length == 0){
            // no sidenavs, what should we show the user?
        }
        else{
            // id was not valid, send user to "home"
            // this really should not happen if the user is navigating properly
            //$flavrs.routes.go("/");
        }
        
    }
    
    
    if(bookmarks.initialized){
        init();
    }
    else{
        bookmarks.initialize().success(init);
    }

}]);

//Controller for modal window
app.controller('bookmarksModalCtrl', ['$scope','bookmarks', '$http', '$flavrs',
    function($scope,bookmarks,$http,$flavrs) {
    var route = $flavrs.routes.current;
    
    function load_modal_data(content){
        // deepcopy - keep original data intacked
        $scope.link_copy = angular.copy(content);
        var item = $flavrs.content.get_by_id(route.args.id,content);
        if(item){
            $scope.form.model.name = item.name;
            $scope.form.model.url = item.url;
            $scope.form.model.id = item.id;
            $scope.form.model.tab = item.tab;
        }
        else{
            // invalid link to edit
        }
    }
    
    //set modal
    $scope.modal = {
        title: "Add Bookmark",
        form: {}
    };
    
    $scope.form = {
        fields: [
            {
                type: "url",
                minlength: 5,
                required: true,
                title: "URL",
                name: "url"
            },
            {
                type: "text",
                title: "Name",
                name: "name",
                description: "If left blank, name will be determined from URL.",
            },
            {
                type: 'hidden',
                title: '',
                name: 'id'
            },
            {
                type: 'hidden',
                title: '',
                name: 'tab'
            }
        ],
        model: {
            'id': '0',
            'tab': $scope.active_nav_id
        },
        errors: {}
    };
    
    
    // check if add or edit and add data if required
    switch(route.name){
        case 'add':
            var modal_state = 'add';
        break;
        case 'edit':
            
            var content = bookmarks.raw_content;
                link = null,
                modal_state = 'edit';
            
            if(!angular.isDefined(content)){
                // content is not loaded, this means that the user
                // is accessing this url directly and no content has been
                // loaded yet.
                // lets manually load it.
                var url = $scope.meta.root+'bookmarks/link/'+route.args.id+'/',
                    promise = $http.get(url);
                    promise.success(function(data,status){
                        load_modal_data([data]);
                    });
                    promise.error(function(data,status){
                        // error, go back to home
                        
                    });
            }
            else{
                // content is already loaded
                load_modal_data(content);
            }
            
            // update modal
            $scope.modal.form.header = 'Edit Link';
        break;
    }
    
    // Button actions
    $scope.actions = [
        {
            name: 'Save', 
            colour: 'md-primary',
            click: function(){
                if($flavrs.modal.form.is_valid()){
                    // if edit mode.. add id
                    if(modal_state == 'edit'){
                        var url_suffix = route.args.id+'/';
                    }
                    else{
                        var url_suffix = '';
                    }
                    // form is valid, lets try to save it!
                    var url = $scope.meta.root+'bookmarks/link/'+url_suffix,
                        data = $scope.form.model,
                        promise = $http.post(url,data);

                    promise.success(function(data,status){
                        if(modal_state == 'edit'){
                            for (var i = 0; i < bookmarks.content.length; i++) {
                                if(data.id == bookmarks.content[i].id){
                                    bookmarks.content[i] = bookmarks.create_object(data);
                                    break;
                                }
                            }
                        }
                        else{
                            bookmarks.raw_content.push(data);
                            data = bookmarks.create_object(data);
                            bookmarks.content.push(data);
                        }
                        // close modal
                        $flavrs.modal.instance.dismiss('success');
                    });
                    
                    promise.error(function(data,status){
                        $scope.form.errors = data;
                    });
                }
            }
        },
    ];
    
    // if we are in edit mode, add a delete button
    if(modal_state == 'edit'){
        $scope.actions.push({
            name: 'Delete',
            colour: 'md-warn',
            click: function(action){
                action.name = 'Are You Sure?';
                action.colour = 'md-hue-2 md-accent';
                action.click = function(){
                    // delete item
                    var url = $scope.meta.root+'bookmarks/link/'+route.args.id+'/delete/',
                        data = $scope.form.model,
                        promise = $http.post(url,data);
                    
                    promise.success(function(data,status){
                        for (var i = 0; i < bookmarks.content.length; i++) {
                            if(data.id == bookmarks.content[i].id){
                                bookmarks.content.splice(i,1);
                                break;
                            }
                        }
                        $flavrs.modal.instance.dismiss('success');
                    });
                }
            }
        });
    }    
    
}]);

//Tab management controller
app.controller('tabCtrl', ['$scope','$flavrs','$http', function($scope,$flavrs,$http){
    
    var route = $flavrs.routes.current;
    
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
                title: 'Name',
                name: 'name',
                required: true
            },
            {
                type: 'hidden',
                title: '',
                name: 'id'
            }
        ],
        model: {
            'id': '0'
        },
        errors: {}
    };
    
    // check if add or edit and add data if required
    switch(route.name){
        case 'sidenav_add':
            var modal_state = 'add';
        break;
        case 'sidenav_edit':
            var tabs = $flavrs.modules.current().sidenav,
                tab = null,
                modal_state = 'edit';
            // deepcopy - keep original data intacked
            $scope.sidenav_copy = angular.copy(tabs);
            var item = $flavrs.sidenav.get_by_id(route.args.id);
            if(item){
                $scope.form.model.name = item.name;
                $scope.form.model.id = item.id;
            }
            else{
                // invalid tab to edit
            }
            // update modal
            $scope.modal.form.header = 'Edit Tab';
        break;
    }
    
    // Button actions
    $scope.actions = [
        {
            name: 'Save', 
            colour: 'md-primary',
            click: function(){
                if($flavrs.modal.form.is_valid()){
                    // if edit mode.. add id
                    if(modal_state == 'edit'){
                        var url_suffix = route.args.id+'/';
                    }
                    else{
                        var url_suffix = '';
                    }
                    // form is valid, lets try to save it!
                    var url = $scope.meta.root+'bookmarks/tab/'+url_suffix,
                        data = $scope.form.model,
                        promise = $http.post(url,data);

                    promise.success(function(data,status){
                        // set url
                        data.url = $flavrs.routes.get('sidenav',{'id':data.id});
                        if(modal_state == 'edit'){
                            for (var i = 0; i < $scope.sidenav.length; i++) {
                                if(data.id == $scope.sidenav[i].id){
                                    $scope.sidenav[i] = data;
                                    break;
                                }
                            }
                        }
                        else{
                            $scope.sidenav.push(data);
                        }
                        // close modal
                        $flavrs.modal.instance.dismiss('success');
                    });
                    
                    promise.error(function(data,status){
                        $scope.form.errors = data;
                    });
                }
            }
        },
    ];
    
    // if we are in edit mode, add a delete button
    if(modal_state == 'edit'){
        $scope.actions.push({
            name: 'Delete',
            colour: 'md-warn',
            click: function(action){
                action.name = 'Are You Sure?';
                action.colour = 'md-hue-2 md-accent';
                action.click = function(){
                    // delete item
                    var url = $scope.meta.root+'bookmarks/tab/'+route.args.id+'/delete/',
                        data = $scope.form.model,
                        promise = $http.post(url,data);
                    
                    promise.success(function(data,status){
                        for (var i = 0; i < $scope.sidenav.length; i++) {
                            if(data.id == $scope.sidenav[i].id){
                                $scope.sidenav.splice(i,1);
                                // if this was an active tab, then click
                                // the next one
                                if((data.id == $scope.active_nav_id) && ($scope.sidenav.length > 0)){
                                    var new_id = $scope.sidenav[0].id;
                                    $scope.active_nav_id = new_id;
                                    //$flavrs.routes.go('sidenav',{id:new_id})
                                    $flavrs.routes.previous = {name:'sidenav',args:{id:new_id}};
                                }    
                                break;
                            }
                        }
                        $flavrs.modal.instance.dismiss('success');
                    });
                }
            }
        });
    }
}]);

app.controller('tabOrderCtrl', ['$scope','$flavrs','$http', function($scope,$flavrs,$http){
    
    $scope.sidenav_copy = angular.copy($flavrs.modules.current().sidenav);
    
    $scope.modal = {
        title: "Order Tabs",
        body: '<table class="table table-hover">' +
                  '<tbody ng-model="sidenav_copy" ui-sortable>' +
                    '<tr ng-repeat="tab in sidenav_copy" \>' +
                      '<td>{{ tab.name }}</td>' +
                    '</tr>' +
                  '</tbody>' +
                '</table>'
    }
    
    $scope.actions = [
        {
            name: 'Save', 
            colour: 'md-primary',
            click: function(){
                var data = [];
                // remove unused data
                $scope.sidenav_copy.forEach(function(item){
                    data.push({id:item.id});
                });
                
                var url = $scope.meta.root+'bookmarks/tab/order/',
                promise = $http.post(url,{data:data});
                
                promise.success(function(data,status){
                    for (var i = 0; i < $scope.sidenav.length; i++) {
                        $scope.sidenav[i] = $scope.sidenav_copy[i];
                    }
                    $flavrs.modal.instance.dismiss('success');
                });
            }
        }  
    ];
    
}]);

app.controller('searchCtrl', ['$scope','$flavrs','$http','bookmarks', 
            function($scope,$flavrs,$http,bookmarks){
    
    var route = $flavrs.routes.current;
    
    $scope.manage = bookmarks.manage;
    
    function init(){
        
        if(angular.isDefined(route.params.q)){
            var q = route.params.q,
                previous = $flavrs.routes.previous;
                url = $scope.meta.root+'bookmarks/link/search/?q='+q,
                promise = $http.get(url);
                
                // if the search input is not set yet, set it!
                if($('#search input').val() == ''){ //TODO replace with flavrs service
                    $scope.$broadcast('set_search_input',q);
                }
                
                promise.success(function(data,status){
                    var content = [];
                    data.forEach(function(link){
                        content.push(bookmarks.create_object(link));
                    });
                    $scope.tab_content = content;
                    bookmarks.content = content;
                    
                    $scope.pre_content = '<div class="center"><strong>'+
                                        data.length+'</strong> results found</div>';
                });
                
                promise.error(function(){
                   // something went wrong, send user to home
                   // resend the loaded id so the data can be loaded again
                   $flavrs.modules.current()._loaded_id = null;
                   $flavrs.routes.go('/');
                });
        }
        else{
            // search page requested but no query passed, what to do now?
        }
    }
    
    $flavrs.controller.ready(function(){
        init();
    });
}]);

app.controller('manageCtrl', ['$scope','$flavrs','$http','bookmarks', 
            function($scope,$flavrs,$http,bookmarks){
    
    var route = $flavrs.routes.current;
    
    $scope.queue = [];
    
    function get_position(id,data){
        for (var i = 0; i < data.length; i++) {
            if(data[i].id == id){
                break;
            }
        }
        
        return i;
    }
    
    function init(){
        if(angular.isDefined(route.args.id) && angular.isDefined($scope.active_nav_id)){
            var id = route.args.id;
            
            // if id is the keyword 'redirect', get the current tab and redirect
            // to it
            if(id == 'redirect'){
                return $flavrs.routes.go('manage',{'id':$scope.active_nav_id});
            }
            
            // register and set toolbar
            $flavrs.toolbars.register('manage',{
                sidenav_btn: {
                    icon: 'arrow-left',
                    click: function(){
                        $flavrs.theme.set('default');
                        $flavrs.toolbars.set('default');
                    }
                },
                brand: 'Back',
                search: {
                    autocomplete: false,
                    submit: function(input){
                        for (var i = bookmarks.raw_content.length - 1; i >= 0; i--) {
                            var bookmark = bookmarks.raw_content[i];
                            if((bookmark.name.toLowerCase().indexOf(input) == -1) &&
                                (bookmark.url.toLowerCase().indexOf(input) == -1)){
                                bookmarks.content[i].hidden = true;
                            }
                            else{
                                bookmarks.content[i].hidden = false;
                            }
                        }
                    },
                    placeholder: 'Search This Tab',
                    enabled: true,
                    buttons: [
                        {
                            'text': '{{queue.length}}', 
                            'click': function(){
                                $scope.toggle_right_menu();
                            }
                        }
                    ]
                }
            })
            $flavrs.toolbars.set('manage');
            // enter management mode
            $scope.mode = 'management';
            // enable sortable
            $scope.sortableOptions.disabled = false;
            // enable right sidenav
            $scope.right_menu = true;
            
            // watchers
            $scope.$on('move', function(){
               // open modal
               $scope.open_modal('manageModalCtrl',{},function(){
                   $scope.close_modal();
               });
            });
            
            $scope.$on('delete', function(){
                var delete_these = [];
                angular.forEach(bookmarks.content,function(value,key){
                    if(value.selected){
                        delete_these.push(value.id);
                        value.hidden = true;
                    }
                });
                $scope.queue.push({
                    'action': 'delete',
                    'items': delete_these
                });
            });
            
            $scope.$on('sort', function(event,args){
                var moved_id = args.ui.item.context.children[0].id;
                $scope.queue.push({
                    'action': 'sort',
                    'items': [moved_id],
                    'attrs': {
                        'old_position': get_position(moved_id,bookmarks.raw_content),
                        'new_position': get_position(moved_id,bookmarks.content),
                    }
                })
            });
        }
        else{
            //return $flavrs.routes.go('/',{},{'_redirect':'manage_redirect'}); // this is buggy
            return $flavrs.routes.go('/');
        }
    }
    
    $flavrs.controller.ready(function(){
        init();
    });
}]);

app.controller('manageModalCtrl', ['$scope','$flavrs','$http','bookmarks', 
            function($scope,$flavrs,$http,bookmarks){
    
    $scope.modal = {
        title: "Select a Tab"
    }
    
    $scope.form = {
        fields: [
            {
                type: 'select',
                title: 'Tab',
                name: 'tab',
                required: true,
                options: $flavrs.modules.current().sidenav
            }
        ],
        model: {},
        errors: {}
    };
    
    $scope.form.model['tab'] = $scope.active_nav_id;
    
    $scope.actions = [
        {
            name: "Save",
            colour: "md-primary",
            click: function(){
                var new_tab_id = $scope.form.model['tab'],
                    move_these = [];
                angular.forEach(bookmarks.content,function(value,key){
                    if(value.selected){
                        move_these.push(value.id);
                        value.hidden = true;
                    }
                });
                $scope.queue.push({
                    'action': 'move',
                    'items': [move_these],
                    'attrs': {
                        'old': $scope.active_nav_id,
                        'new': new_tab_id
                    }
                });
                $flavrs.modal.instance.dismiss('success');
            }
        }
    ];
    
}]);