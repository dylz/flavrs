app.directive('mdForm', function($compile) {
    return {
        restrict: 'E',
        scope: {
            fields: '=mdFormFields',
            model: '=mdFormModel'
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
                body = '';
            
            angular.forEach(fields,function(obj,i){
                // different mark up depending on the type of field
                switch(obj.type){
                    case 'select':
                        
                    break;
                    case 'checkbox':
                    
                    break;
                    default:
                        var n = obj.name;
                        body += '<md-input-container>' +
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