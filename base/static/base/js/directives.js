app.directive('ellipsis', ['$timeout', '$window', function($timeout, $window) {

	return {
		restrict	: 'A',
		scope		: {
			ngBind				: '=',
			ellipsisAppend		: '@',
			ellipsisAppendClick	: '&',
			ellipsisSymbol		: '@'
		},
		compile : function(elem, attr, linker) {

			return function(scope, element, attributes) {
				/* Window Resize Variables */
					attributes.lastWindowResizeTime = 0;
					attributes.lastWindowResizeWidth = 0;
					attributes.lastWindowResizeHeight = 0;
					attributes.lastWindowTimeoutEvent = null;
				/* State Variables */
					attributes.isTruncated = false;

				function buildEllipsis() {
					if (typeof(scope.ngBind) !== 'undefined') {
						var bindArray = scope.ngBind.split(" "),
							i = 0,
							ellipsisSymbol = (typeof(attributes.ellipsisSymbol) !== 'undefined') ? attributes.ellipsisSymbol : '&hellip;',
							appendString = (typeof(scope.ellipsisAppend) !== 'undefined' && scope.ellipsisAppend !== '') ? ellipsisSymbol + '<span>' + scope.ellipsisAppend + '</span>' : ellipsisSymbol;

						attributes.isTruncated = false;
						element.html(scope.ngBind);

						// If text has overflow
						if (isOverflowed(element)) {
							var bindArrayStartingLength = bindArray.length,
								initialMaxHeight = element[0].clientHeight;

							element.html(scope.ngBind + appendString);

							// Set complete text and remove one word at a time, until there is no overflow
							for ( ; i < bindArrayStartingLength; i++) {
								bindArray.pop();
								element.html(bindArray.join(" ") + appendString);

								if (element[0].scrollHeight < initialMaxHeight || isOverflowed(element) === false) {
									attributes.isTruncated = true;
									break;
								}
							}

							// If append string was passed and append click function included
							if (ellipsisSymbol != appendString && typeof(scope.ellipsisAppendClick) !== 'undefined' && scope.ellipsisAppendClick !== '' ) {
								element.find('span').bind("click", function (e) {
									scope.$apply(scope.ellipsisAppendClick);
								});
							}
						}
					}
				}

			   /**
				*	Test if element has overflow of text beyond height or max-height
				*
				*	@param element (DOM object)
				*
				*	@return bool
				*
				*/
				function isOverflowed(thisElement) {
					return thisElement[0].scrollHeight > thisElement[0].clientHeight;
				}

			   /**
				*	Watchers
				*/

				   /**
					*	Execute ellipsis truncate on ngBind update
					*/
					scope.$watch('ngBind', function () {
						buildEllipsis();
					});

				   /**
					*	Execute ellipsis truncate on ngBind update
					*/
					scope.$watch('ellipsisAppend', function () {
						buildEllipsis();
					});

				   /**
					*	When window width or height changes - re-init truncation
					*/
					angular.element($window).bind('resize', function () {
						$timeout.cancel(attributes.lastWindowTimeoutEvent);

						attributes.lastWindowTimeoutEvent = $timeout(function() {
							if (attributes.lastWindowResizeWidth != window.innerWidth || attributes.lastWindowResizeHeight != window.innerHeight) {
								buildEllipsis();
							}

							attributes.lastWindowResizeWidth = window.innerWidth;
							attributes.lastWindowResizeHeight = window.innerHeight;
						}, 75);
					});


			};
		}
	};
}]);

app.directive('card', function($compile) {
    return {
        restrict: 'E',
        scope: true,
        transclude: true,
        template: '<div class="tab-inner-wrapper" id="{{content.id}}">' +
                    '<div class="panel panel-default">' +
                    '<div class="panel-heading">' +
                    '</div>' +
                    '<div class="panel-body">' +
                    '   <div class="panel-text"></div>' +
                    '</div>' +
                    '<div class="panel-footer">' +
                    '</div>' +
                    '<div class="module"></div>' +
                    '</div>' +
                  '</div>',
        controller: ['$scope',
            function($scope) {

            }
        ],
        link: function(scope, element, attributes, ctrl) {

        },
        compile: function(element, attributes) {
            return {
                pre: function(scope, element, attributes, controller, transcludeFn) {

                },
                post: function(scope, element, attributes, controller, transcludeFn) {
                    var content = scope.content,
                        mode = scope.mode,
                        findKey = function(parent, key) {
                            if (parent.hasOwnProperty(key)) {
                                if ((parent[key]) && (parent[key] !== "")) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            }
                            else {
                                return false
                            }
                        },
                        toType = function(obj) {
                            return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
                        },
                        get_options = function(arr,node){
                            var html = "";
                            for (var i = 0; i < arr.length; i++) {
                                var obj = arr[i];
                                //check if ahref link vs ngclick
                                if(findKey(obj,'link')){
                                    var ahref = obj.link,
                                        extra = "";
                                }
                                else if(findKey(obj,'route')){
                                    
                                    var route = obj.route,
                                        route_obj = null;
                                    
                                    //find the route
                                    angular.forEach(scope.routes,function(entry){
                                        if(entry.name == route){
                                            //route is registered!
                                            //Now split the paths up and determine
                                            //if any of them are "dynamic"
                                            //this is noted by the colon. ex.
                                            //edit/:id = id is dynamic
                                            var final_route = scope.module+'/', //always prefix with current module
                                                rsplit = entry.route.split('/');
                                            
                                            rsplit.forEach(function(path){
                                                if(path.indexOf(':') > -1){
                                                    path = path.replace(':','');
                                                    final_route += content[path];
                                                }
                                                else{
                                                    final_route += path+'/';
                                                }
                                            });
                                            //route is final route!
                                            route = final_route;
                                        }
                                    });
                                    
                                    var ahref = route,
                                        extra = "";
                                }
                                html += '<'+node+'><a href="'+ahref+'" '+extra+'>';
                                //check if icon is needed
                                if(findKey(obj,'icon')){
                                    html += '<i class="fa fa-'+obj.icon+'"></i> ';
                                }
                                html += obj.name+'</a></'+node+'>';
                            }
                            return html;
                        },
                        replaceElement = function(klass,attrs){
                            
                            if(!angular.isDefined(attrs)){
                                attrs = {};
                            }
                            
                            var ele = element.find('.'+klass),
                                html = "<a class='"+klass + 
                                        "' href='"+content.card_url+"'>" +
                                        ele.html()+"</a>";
                            element.find('.'+klass).replaceWith(html);
                            
                            $.each(attrs, function(key, value){
                                if(value == 'html'){
                                    element.attr(key,ele.html());
                                }
                                else {
                                    element.attr(key,value);
                                }
                            })
                        }
                    
                    // make sure content is the original content
                    // some 'modes' can change the content
                    
                    //if(content.hasOwnProperty('_content')){
                    //    content = content['_content'];
                    //}
                    
                    //content['_content'] = content;
                    
                    //Header
                    if (findKey(content, 'header')) {
                        var parent = content.header,
                            panel_header = element.find('.panel-heading');
                        //img
                        if (findKey(parent, 'img')) {
                            var html = '<div class="panel-heading-img pull-left">' +
                                '<img src="' + parent.img + '">' +
                                '</div>';
                            panel_header.append(html);
                        }
                        //text
                        if (findKey(parent, 'text')) {
                            //check what type, just straight text or an obj (primary and secondary)
                            if (toType(parent.text) == 'object') {
                                var html = '<div class="panel-heading-text pull-left">' +
                                    '	<div class="panel-heading-primary">' +
                                    parent.text.primary +
                                    ' </div>' +
                                    '	<div class="panel-heading-secondary">' +
                                    parent.text.secondary +
                                    ' </div>' +
                                    '</div>';
                                if (!findKey(parent, 'right')) {
                                    html += '<div class="clearfix"></div>';
                                }
                            }
                            else {
                                var html = parent.text;
                            }
                            panel_header.append(html);
                        }
                        //right side text
                        if (findKey(parent, 'right')) {
                            var html = '<div class="panel-heading-right pull-right">' + parent.right + '</div>';
                            html += '<div class="clearfix"></div>';
                            panel_header.append(html)
                        }
                    }
                    //body
                    if (findKey(content, 'body')) {
                        var parent = content.body,
                            panel_text = element.find('.panel-text');
                        
                        
                        //Check and display and alerts
                        if(findKey(parent,'alert')){
                            var html = '<div class="alert alert-';
                            html += parent.alert.type+'">'+parent.alert.text+'</div>';
                            panel_text.append(html);
                        }
                        
                        //Check if img16 is present. Bookmarks is the only one
                        //currently using this key. If this is theorycrafted
                        //that this is the case, then a slight redesign for
                        //bookmark cards might happen
                        if(findKey(parent,'img16')){
                            var html = '<img src="'+parent.img16+'" class="panel-heading-img img16x16">';
                            panel_text.append(html);
                        }
                        if (findKey(parent, 'text')) {
                            panel_text.append(parent.text);
                        }
                        if (findKey(parent, 'imgs')) {
                            var imgs_length = parent.imgs.length,
                                inner_html = "";
                            for (var i = 0; i < imgs_length; i++) {
                                var img_obj = parent.imgs[i];
                                if (findKey(img_obj, 'link')) {
                                    inner_html += '<a href="'+img_obj.link+'">';   
                                }
                                inner_html += '<img src="'+img_obj.src+'">';
                                if (findKey(img_obj, 'link')) {
                                    inner_html += '</a>';
                                }
                            }
                            //add all imgs to img container
                            panel_text.after('<div class="panel-img imgx'+imgs_length+'">'+inner_html+'</div>')
                        }
                    }
                    //footer
                    if(findKey(content,'footer')){
                        var parent = content.footer,
                            panel_footer = element.find('.panel-footer'),
                            footer_html = "";
                        
                        if(findKey(parent,'options')){
                            footer_html += get_options(parent.options,'div');
                        }
                        //more options! and for this we just give the user a 
                        // dropdown
                        if(findKey(parent,'more_options')){
                            var list_items = get_options(parent.more_options,'li');
                            footer_html += '<div>' +
                                            '<a href="#" class="dropdown-toggle" data-toggle="dropdown">' +
                                                '&nbsp;<b class="caret"></b>' +
                                            '</a>' +
                                            '<ul class="dropdown-menu dropdown-menu-right">' +
                                            list_items +
                                            '</ul>' +
                                        '</div>';
                        }
                        panel_footer.html(footer_html);
                    }
                    //module
                    if(findKey(content,'module')){
                        element.find('.module').html(content.module)
                    }
                    //compile so angular will run any angular functions
                    $compile(element.find('.panel-footer a'))(scope);
                    //last step is to determine the card type and adjust
                    //this card to reflect
                     //Determine card type
                    if(!findKey(content,'card_type')){
                        //not here, set default to w/e. The switch will take
                        //care of the rest.
                        content.card_type = "";
                    }
                    
                    // check mode and see if it changes card type at all
                    switch(mode){
                        case 'management':
                            content.card_type = 'select';
                        break;
                    }
                    
                    switch (content.card_type) {
                        case 'link':
                            /*
                            a link card type means that the header
                            and body elements are clickable to an
                            external URL.
                            This means that card_url is required.
                            */
                            
                            //update header, and body. basically, replace the divs with a
                            replaceElement('panel-heading',{'title':'html'});
                            replaceElement('panel-body');
                            //add the class to the element for CSS reasons
                            element.addClass('panel-type-link');
                        break;
                        case 'select':
                            /*
                            card is selectable. Highlight card if user selects it.
                            Toggle property in object.
                            */
                            
                            // remove url
                            content.card_url = '#';
                            
                            // use same styling as link
                            replaceElement('panel-heading',{'title':'html'});
                            replaceElement('panel-body');
                            element.addClass('panel-type-link');
                            // remove footer content
                            element.find('.panel-footer').remove();
                            
                            // add click event
                            element.find('.panel')
                                   .attr('ng-click','select()')
                                   .attr('ng-class','{selected:content.selected}');
                            
                            // functions
                            scope.select = function(){
                                if(!angular.isDefined(content.selected)){
                                    content.selected = false;
                                }
                                if(content.selected){
                                    content.selected = false;
                                }
                                else{
                                    content.selected = true;
                                }
                            };
                            
                            // compile
                            $compile(element.contents())(scope);
                        break;
                        
                        default:
                            //by default, nothing needs to be done.
                    }
                }
            }
        },
    }
});


//force recompile from dynamic html
app.directive('compile', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                // watch the 'compile' expression for changes
                return scope.$eval(attrs.compile);
            },
            function(value) {
                // when the 'compile' expression changes
                // assign it into the current DOM
                element.html(value);

                // compile the new DOM and link it to the current
                // scope.
                // NOTE: we only compile .childNodes so that
                // we don't get into infinite loop compiling ourselves
                $compile(element.contents())(scope);
            }
        );
    };
}])

//ng-enter
.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter, {'event': event});
                });

                event.preventDefault();
            }
        });
    };
});