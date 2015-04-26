app.directive('mdForm', function($compile) {
    return {
        restrict: 'E',
        scope: {
            fields: '=mdFormFields',
            model: '=mdFormModel',
            errors: '=mdFormErrors'
        },
        controller: ['$scope',
            function($scope) {
                var self = this;
                
                self.get_field = function(name){
                    var field = undefined;
                    angular.forEach($scope.fields,function(obj,i){
                        if(obj.name == name){
                            field = obj;
                        }  
                    });
                    
                    return field;
                }
                
                $scope.prop = function(field_name,prop){
                    var field = self.get_field(field_name),
                        output = undefined;
                    if(field && field.hasOwnProperty(prop)){
                        output = field[prop];
                        // check if prop is function
                        if(typeof(output) == 'function'){
                            output = output();
                        }
                    }
                    return output;
                }
            }
        ],
        link: function(scope, element, attributes, controller, transcludeFn) {
            // initialize the form with given attributes
            var attrs = '';
            angular.forEach(attributes,function(value,key){
                // don't add interal keys
                if((key.indexOf('$') != 0) && (key.indexOf('md') != 0)){
                    attrs += ' '+key+'="'+value+'"'; 
                }
            });
            
            element.html('<form '+attrs+'></form>');
            
            // now we loop through the fields and fill in the form using
            // material design directives, compiling when completed..
            var fields = scope.fields,
                model = scope.model,
                errors = scope.errors,
                body = '';
            
            angular.forEach(fields,function(obj,i){
                // different mark up depending on the type of field
                switch(obj.type){
                    case 'select':
                        
                    break;
                    case 'checkbox':
                    
                    break;
                    default:
                        var n = obj.name,
                            e = (angular.isDefined(errors[n])) ? errors[n] : '';
                        body += '<md-input-container ng-class="{\'md-input-invalid\':errors[\''+n+'\']}">' +
                                '   <div class="error" ng-repeat="err in errors[\''+n+'\']">' +
                                '       {{ err }}' +
                                '   </div>' +
                                '   <label>'+obj.title+'</label>' +
                                '   <input ' +
                                '       type="'+obj.type+'"' +
                                '       name="'+n+'"' +
                                '       ng-required="prop(\''+n+'\',\'required\')" ' +
                                '       ng-minlength="prop(\''+n+'\',\'minlength\')" ' +
                                '       md-maxlength="prop(\''+n+'\',\'maxlength\')" ' +
                                '       ng-change="prop(\''+n+'\',\'change\')" ' +
                                '       ng-pattern="prop(\''+n+'\',\'pattern\')" ' +
                                '       ng-model="model.'+n+'">' +
                                '       <div class="description">{{ prop("'+n+'","description") }}</div> ' +
                                '</md-input-container>';
                }
            });
            
            // this is the forms html
            element.find('form').html(body);
            // compile form
            $compile(element.find('form'))(scope);
        }
    }
});

app.directive('mdFabs', function($compile) {
    return {
        restrict: 'E',
        scope: {
            actions: '=mdActions'
        },
        template:   '<section ng-cloak layout="column" ng-hide="actions.length==0"' +
                    '   ng-mouseover="toggle_fabs(\'show\')"' + 
                    '   ng-mouseleave="toggle_fabs(\'hide\')">' +
                    '   <md-button ng-repeat="action in actions.slice().reverse()"' +
                    '       title="{{action.name}}"' +
                    '       class="md-fab {{action.colour}}" ng-show="show_actions">' +
                    '       <i class="fa fa-{{action.icon}}"></i>' +
                    '   </md-button>' +
                    '   <md-button class="md-fab md-default-theme md-fab-default"' +
                    '       title="{{primary_action.name}}">' +
                    '       <i class="fa fa-{{primary_action.icon}}"></i>' +
                    '   </md-button>' +
                    '</section>',
        controller: ['$scope',
            function($scope) {
                
                var self = this;
                $scope.primary_action = {};
                $scope.special_actions = [];
                
                $scope.toggle_fabs = function(state){
                    if(state == 'show'){
                        $scope.primary_action = $scope.special_actions[1];
                        $scope.show_actions = true;
                    }
                    else if(state == 'hide'){
                        $scope.show_actions = false;
                        $scope.primary_action = $scope.special_actions[0];
                    }
                };
                
                $scope.init = function(){
                    if(angular.isDefined($scope.actions)){
                        $scope.special_actions.push({icon:'plus'});
                        $scope.special_actions.push($scope.actions[0]);
                        
                        $scope.actions.splice(0,1);
                        
                        // first special action is the default to show
                        $scope.primary_action = $scope.special_actions[0];
                    }
                }
            }
        ],
        link: function(scope, element, attributes, controller, transcludeFn) {
            scope.$watch('actions',function(){
                scope.init();
            });
        }
    }
});