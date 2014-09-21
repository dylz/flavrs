/*!
 * Angular Material Design
 * https://github.com/angular/material
 * @license MIT
 * v0.0.2
 */
(function(){
angular.module('ngMaterial', [ 'ng', 'ngAnimate', 'material.services.attrBind', 'material.services.compiler', 'material.services.position', 'material.services.registry', 'material.services.throttle', 'material.decorators', 'material.services.aria', "material.components.button","material.components.card","material.components.checkbox","material.components.content","material.components.dialog","material.components.divider","material.components.form","material.components.icon","material.components.list","material.components.radioButton","material.components.sidenav","material.components.slider","material.components.subheader","material.components.switch","material.components.tabs","material.components.toast","material.components.toolbar","material.components.whiteframe"]);
angular.module('ngAnimateSequence', ['ngAnimate'])

  .factory('$$animateAll', function() {
    return function all(arr, fn) {
      var count = 0;
      for(var i = 0; i < arr.length; i++) {
        arr[i](onChainDone);
      }

      function onChainDone() {
        if(++count == arr.length) fn();
      }
    };
  })

  .provider('$$animateStyler', ['$provide', function($provide) {
    var register = this.register = function(name, factory) {
      $provide.factory(name + 'Styler', factory);
    };

    this.$get = ['$injector', function($injector) {
      register('default', function() {
        return function(element, pre) {
          element.css(pre);
          return function(post, done) {
            element.css(post);
            done();
          }
        };
      });

      return function(name) {
        return $injector.get(name + 'Styler');
      }
    }];
  }])

  .factory('$animateRunner', ['$$animateReflow', '$animate', '$$animateStyler', '$$animateAll', '$timeout',
    function($$animateReflow,   $animate,   $$animateStyler,   $$animateAll,   $timeout) {
      return function(element, options, queue, duration, completeFn) {
        options = options || {};

        var node = element[0];
        var self;
        var index = 0;
        var paused = false;
        var cancelAnimation = angular.noop;

        var styler = angular.isFunction(options.styler)
          ? options.styler
          : angular.isString(options.styler)
          ? $$animateStyler(options.styler)
          : $$animateStyler('default');

        var style = function(element, duration, cssStyles) {
          cssStyles = cssStyles || {};
          var delay = cssStyles.delay;
          delete cssStyles.delay;
          return styler(element, cssStyles, duration, delay);
        };


        completeFn = completeFn || angular.noop;

        function tick(initialTimeout) {
          if (paused) return;

          var step = queue[index++];
          if(!step || !$animate.enabled()) {
            completeFn();
            queue = null;
            return;
          }

          if(angular.isString(step)) {
            self[step].apply(self);
            tick();
            return;
          }

          var time  = step[0];
          var pre   = step[1];
          var post  = step[2];
          var fn    = step[3];

          if(!initialTimeout && index == 1 && time > 0 && time <= 1 && duration > 0) {
            index--;
            $timeout(function() {
              tick(true);
            }, time * duration, false);
            return;
          }

          var animationDuration = time;
          if(duration > 0 && time <= 1) { //Keyframes
            var nextEntry = queue[index];
            var next = angular.isArray(nextEntry) ? nextEntry[0] : 1;
            if(next <= 1) {
              animationDuration = (next - time) * duration;
            }
          }

          var postStyle = style(element, animationDuration, pre);

          accumulatedStyles = angular.extend(accumulatedStyles, pre);
          accumulatedStyles = angular.extend(accumulatedStyles, post);

          $$animateReflow(function() {
            $$animateAll([
              function(done) { postStyle(post || {}, done); },
              function(done) {
                cancelAnimation = fn(element, animationDuration, done) || angular.noop;
              }
            ], tick);
          });

          return self;
        }

        var startingClassName = node.className;
        var accumulatedStyles = {};

        return self = {
          revertStyles : function() {
            angular.forEach(accumulatedStyles, function(_, prop) {
              node.style.removeProperty(prop);
            });
            accumulatedStyles = {};
            return this;
          },

          revertClasses : function() {
            node.className = startingClassName;
            return this;
          },

          next : function() {
            cancelAnimation();
            return tick();
          },

          redo : function() {
            cancelAnimation();
            index--;
            return tick();
          },

          run : function() {
            if (paused) {
              paused = false;
              cancelAnimation();
            }
            return tick();
          },

          pause : function() {
            paused = true;
            cancelAnimation();
            return self;
          },

          restart : function() {
            cancelAnimation();
            index = 0;

            return tick();
          }

        };
      }
    }])

  .factory('$animateSequence', ['$animate', '$animateRunner', '$sniffer',
    function($animate,   $animateRunner,   $sniffer) {
      return function(options) {
        var self, queue = [];

        return self = {
          run : function(element, duration, completeFn) {
            return $animateRunner(element, options, queue, duration, completeFn).next();
          },

          then : function(fn) {
            return addToChain(0, null, null, function(element, duration, done) {
              fn(element, done); 
            });
          },

          animate : function(preOptions, postOptions, time ) {
            if (arguments.length == 2 && !angular.isObject(postOptions)) {
              time = postOptions;
              postOptions = preOptions;
              preOptions  = {};
            } else if(arguments.length == 1) {
              postOptions = preOptions;
              preOptions = {};
            } else {
              postOptions = postOptions || {};
            }

            return addToChain(time || postOptions.duration, preOptions, postOptions, function(_, duration, done) {
              done();
            });
          },

          revertStyles : function() {
            queue.push('revertStyles');
            return self;
          },

          revertClasses : function() {
            queue.push('revertClasses');
            return self;
          },

          revertElement : function() {
            return this.revertStyles().revertClasses();
          },

          enter : function(parent, after, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.enter(element, parent, after, done);
            });
          },

          move : function(parent, after, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.move(element, parent, after, done);
            });
          },

          leave : function(preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.leave(element, done);
            });
          },

          addClass : function(className, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.addClass(element, className, done);
            });
          },

          removeClass : function(className, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.removeClass(element, className, done);
            });
          },

          setClass : function(add, remove, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.setClass(element, add, remove, done)
            });
          }

        };

        /**
         * Append chain step into queue
         * @returns {*} this
         */
        function addToChain(time, pre, post, fn) {
          queue.push([time || 0, addSuffix(pre), addSuffix(post), fn]);
          queue = queue.sort(function(a,b) {
            return a[0] > b[0];
          });
          return self;
        };

        /**
         * For any positional fields, ensure that a `px` suffix
         * is provided.
         * @param target
         * @returns {*}
         */
        function addSuffix(target) {
          var styles = 'top left right bottom ' +
            'x y width height ' +
            'border-width border-radius borderWidth borderRadius' +
            'margin margin-top margin-bottom margin-left margin-right ' +
            'padding padding-left padding-right padding-top padding-bottom'.split(' ');

          angular.forEach(target, function(val, key) {
            var isPositional = styles.indexOf(key) > -1;
            var hasPx        = String(val).indexOf('px') > -1;

            if (isPositional && !hasPx) {
              target[key] = val + 'px';
            }
          });

          return target;
        }
      };
    }]);

angular.module('ngAnimateStylers', ['ngAnimateSequence'])

  .config(['$$animateStylerProvider', function($$animateStylerProvider) {
    var isDefined = angular.isDefined;

    //JQUERY
    $$animateStylerProvider.register('jQuery', function() {
      return function(element, pre, duration, delay) {
        delay = delay || 0;
        element.css(pre);
        return function(post, done) {
          element.animate(post, duration, null, done);
        }
      };
    });

    //Web Animations API
    $$animateStylerProvider.register('webAnimations', ['$window', '$sniffer',   
                                               function($window,   $sniffer) {
      // TODO(matias): figure out other styles to add here
      var specialStyles = 'transform,transition,animation'.split(',');
      var webkit = $sniffer.vendorPrefix.toLowerCase() == 'webkit';

      return function(element, pre, duration, delay) {
        var node = element[0];
        if (!node.animate) {
          throw new Error("WebAnimations (element.animate) is not defined for use within $$animationStylerProvider.");
        }

        delay = delay || 0;
        duration = duration || 1000;
        var iterations = 1; // FIXME(matias): make sure this can be changed
        pre = camelCaseStyles(pre);

        return function(post, done) {
          var finalStyles = normalizeVendorPrefixes(post);

          post = camelCaseStyles(post);

          var missingProperties = [];
          angular.forEach(post, function(_, key) {
            if (!isDefined(pre[key])) {
              missingProperties.push(key);
            }
          });

          // The WebAnimations API requires that each of the to-be-animated styles
          // are provided a starting value at the 0% keyframe. Since the sequencer
          // API does not require this then let's figure out each of the styles using
          // computeStartingStyles(...) and merge that with the existing pre styles
          if (missingProperties.length) {
            pre = angular.extend(pre, computeStartingStyles(node, missingProperties));
          }

          var animation = node.animate([pre, post], {
            duration : duration,
            delay : delay,
            iterations : iterations
          });
          animation.onfinish = function() {
            element.css(finalStyles); 
            done();
          };
        }
      };

      function computeStartingStyles(node, props) {
        var computedStyles = $window.getComputedStyle(node);
        var styles = {};
        angular.forEach(props, function(prop) {
          var value = computedStyles[prop];

          // TODO(matias): figure out if webkit is the only prefix we need
          if (!isDefined(value) && webkit && specialStyles.indexOf(prop) >= 0) {
            prop = 'webkit' + prop.charAt(0).toUpperCase() + prop.substr(1);
            value = computedStyles[prop];
          }
          if (isDefined(value)) {
            styles[prop] = value;
          }
        });
        return styles;
      }

      function normalizeVendorPrefixes(styles) {
        var newStyles = {};
        angular.forEach(styles, function(value, prop) {
          if(webkit && specialStyles.indexOf(prop) >= 0) {
            newStyles['webkit' + prop.charAt(0).toUpperCase() + prop.substr(1)] = value;
          }
          newStyles[prop]=value;
        });
        return newStyles;
      }
    }]);

    // Greensock Animation Platform (GSAP)
    $$animateStylerProvider.register('gsap', function() {
      return function(element, pre, duration, delay) {
        var styler = TweenMax || TweenLite;

        if ( !styler) {
          throw new Error("GSAP TweenMax or TweenLite is not defined for use within $$animationStylerProvider.");
        }


        return function(post, done) {
          styler.fromTo(
            element,
            (duration || 0)/1000,
            pre || { },
            angular.extend( post, {onComplete:done, delay: (delay || 0)/1000} )
          );
        }
      };
    });

    function camelCaseStyles(styles) {
      var newStyles = {};
      angular.forEach(styles, function(value, prop) {
        prop = prop.toLowerCase().replace(/-(.)/g, function(match, group1) {
          return group1.toUpperCase();
        });
        newStyles[prop]=value;
      });
      return newStyles;
    }
  }]);

/*
 * iterator is a list facade to easily support iteration and accessors
 *
 * @param items Array list which this iterator will enumerate
 * @param reloop Boolean enables iterator to consider the list as an endless reloop
 */
function iterator(items, reloop) {

    reloop = !!reloop;

    var _items = items || [ ];

    // Published API

    return {

      items: getItems,
      count: count,

      inRange: inRange,
      contains: contains,
      indexOf: indexOf,
      itemAt: itemAt,

      findBy: findBy,

      add: add,
      remove: remove,

      first: first,
      last: last,
      next: next,
      previous: previous,

      hasPrevious:hasPrevious,
      hasNext: hasNext

    };

    /*
     * Publish copy of the enumerable set
     * @returns {Array|*}
     */
    function getItems() {
      return [].concat(_items);
    }

    /*
     * Determine length of the list
     * @returns {Array.length|*|number}
     */
    function count() {
      return _items.length;
    }

    /*
     * Is the index specified valid
     * @param index
     * @returns {Array.length|*|number|boolean}
     */
    function inRange(index) {
      return _items.length && ( index > -1 ) && (index < _items.length );
    }

    /*
     * Can the iterator proceed to the next item in the list; relative to
     * the specified item.
     *
     * @param tab
     * @returns {Array.length|*|number|boolean}
     */
    function hasNext(tab) {
      return tab ? inRange(indexOf(tab) + 1) : false;
    }

    /*
     * Can the iterator proceed to the previous item in the list; relative to
     * the specified item.
     *
     * @param tab
     * @returns {Array.length|*|number|boolean}
     */
    function hasPrevious(tab) {
      return tab ? inRange(indexOf(tab) - 1) : false;
    }

    /*
     * Get item at specified index/position
     * @param index
     * @returns {*}
     */
    function itemAt(index) {
      return inRange(index) ? _items[index] : null;
    }

    /*
     * Find all elements matching the key/value pair
     * otherwise return null
     *
     * @param val
     * @param key
     *
     * @return array
     */
    function findBy(key, val) {

      /*
       * Implement of e6 Array::find()
       * @param list
       * @param callback
       * @returns {*}
       */
      function find(list, callback) {
        var results = [ ];

        angular.forEach(list, function (it, index) {
          var val = callback.apply(null, [it, index, list]);
          if (val) {
            results.push(val);
          }
        });

        return results.length ? results : null;
      }

      // Use iterator callback to matches element key value
      // NOTE: searches full prototype chain

      return find(_items, function (el) {
        return ( el[key] == val ) ? el : null;
      });

    }

    /*
     * Add item to list
     * @param it
     * @param index
     * @returns {*}
     */
    function add(it, index) {
      if ( !it ) return -1;

      if (!angular.isDefined(index)) {
        index = _items.length;
      }

      _items.splice(index, 0, it);

      return indexOf(it);
    }

    /*
     * Remove it from list...
     * @param it
     */
    function remove(it) {
      if ( contains(it) ){
        _items.splice(indexOf(it), 1);
      }
    }

    /*
     * Get the zero-based index of the target tab
     * @param it
     * @returns {*}
     */
    function indexOf(it) {
      return _items.indexOf(it);
    }

    /*
     * Boolean existence check
     * @param it
     * @returns {boolean}
     */
    function contains(it) {
      return it && (indexOf(it) > -1);
    }

    /*
     * Find the next item
     * @param tab
     * @returns {*}
     */
    function next(it, validate) {

      if (contains(it)) {
        var index = indexOf(it) + 1,
            found = inRange(index) ? _items[ index ] : reloop ? first() : null,
            skip = found && validate && !validate(found);

        return skip ? next(found, validate) : found;
      }

      return null;
    }

    /*
     * Find the previous item
     * @param tab
     * @returns {*}
     */
    function previous(it, validate) {

      if (contains(it)) {
        var index = indexOf(it) - 1,
            found = inRange(index) ? _items[ index ] : reloop ? last() : null,
            skip = found && validate && !validate(found);

        return skip ? previous(found, validate) : found;
      }

      return null;
    }

    /*
     * Return first item in the list
     * @returns {*}
     */
    function first() {
      return _items.length ? _items[0] : null;
    }

    /*
     * Return last item in the list...
     * @returns {*}
     */
    function last() {
      return _items.length ? _items[_items.length - 1] : null;
    }

}




var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;

var Util = {
  /**
   * Checks to see if the element or its parents are disabled.
   * @param element DOM element to start scanning for `disabled` attribute
   * @param limit Number of parent levels that should be scanned; defaults to 4
   * @returns {*} Boolean
   */
  isDisabled : function isDisabled(element, limit) {
    return Util.ancestorHasAttribute( element, 'disabled', limit );
  },
  /**
   * Checks if the specified element has an ancestor (ancestor being parent, grandparent, etc)
   * with the given attribute defined. 
   *
   * Also pass in an optional `limit` (levels of ancestry to scan), default 8.
   */
  ancestorHasAttribute: function ancestorHasAttribute(element, attrName, limit) {
    limit = limit || 4;
    var current = element;
    while (limit-- && current.length) {
      if (current[0].hasAttribute && current[0].hasAttribute(attrName)) {
        return true;
      }
      current = current.parent();
    }
    return false;
  },

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds.
   * @param fn Function function to call
   * @param wait Number number of ms to wait before calling function
   * @param immediate Boolean causes the function to be called on the leading instead of trailing
   * @returns {Function}
   */
  debounce: function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      }, wait);
      if (immediate) func.apply(context, args);
    };
  },

  /**
   * Checks if two elements have the same parent
   */
  elementIsSibling: function elementIsSibling(element, otherElement) {
    return element.parent().length && 
      (element.parent()[0] === otherElement.parent()[0]);
  },

  /**
   * Converts snake_case to camelCase.
   * @param name Name to normalize
   */
  camelCase: function camelCase(name) {
    return name.
      replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
        return offset ? letter.toUpperCase() : letter;
      });
  },
  /**
   * Selects 'n' words from a string
   * for use in an HTML attribute
   */
  stringFromTextBody: function stringFromTextBody(textBody, numWords) {
    var string = textBody.trim();

    if(string.split(/\s+/).length > numWords){
      string = textBody.split(/\s+/).slice(1, (numWords + 1)).join(" ") + '...';
    }
    return string;
  },

  /**
   * Spread the arguments as individual parameters to the target function.
   * @param targetFn
   * @param scope
   * @returns {Function}
   */
  spread : function ( targetFn, scope ) {
    return function()
    {
      var params = Array.prototype.slice.call(arguments, 0);
      targetFn.apply(scope, params);
    };
  },

  /**
   * Publish the iterator facade to easily support iteration and accessors
   * @see iterator.js
   */
  iterator : iterator,

  css : {
    /**
     * For any positional fields, ensure that a `px` suffix
     * is provided.
     * @param target
     * @returns {*}
     */
    appendSuffix : function (target) {
      var styles = 'top left right bottom ' +
        'x y width height ' +
        'border-width border-radius borderWidth borderRadius' +
        'margin margin-top margin-bottom margin-left margin-right ' +
        'padding padding-left padding-right padding-top padding-bottom'.split(' ');

      angular.forEach(target, function(val, key) {
        var isPositional = styles.indexOf(key) > -1;
        var hasPx        = String(val).indexOf('px') > -1;

        if (isPositional && !hasPx) {
          target[key] = val + 'px';
        }
      });

      return target;
    }

  },

  /**
   * Wraps an element with a tag
   *
   * @param el element to wrap
   * @param tag tag to wrap it with
   * @param [className] optional class to apply to the wrapper
   * @returns new element
   *
   */
  wrap: function(el, tag, className) {
    if(el.hasOwnProperty(0)) { el = el[0]; }
    var wrapper = document.createElement(tag);
    wrapper.className += className;
    wrapper.appendChild(el.parentNode.replaceChild(wrapper, el));
    return angular.element(wrapper);
  }

};


var Constant = {
  ARIA : {
    ROLE : {
      BUTTON : 'button',
      CHECKBOX : 'checkbox',
      DIALOG : 'dialog',
      HEADING : 'heading',
      LIST : 'list',
      LIST_ITEM : 'listitem',
      RADIO : 'radio',
      RADIO_GROUP : 'radiogroup',
      TAB_LIST : 'tablist',
      TAB : 'tab',
      TAB_PANEL : 'tabpanel'
    },
    PROPERTY : {
      CHECKED : 'aria-checked',
      HIDDEN : 'aria-hidden',
      EXPANDED : 'aria-expanded',
      LABEL: 'aria-label',
      SELECTED : 'aria-selected',
      LABEL_BY : 'aria-labelledby'
    },
    STATE: {}
  },
  KEY_CODE : {
    ESCAPE : 27,
    SPACE : 32,
    LEFT_ARROW : 37,
    RIGHT_ARROW : 39,
    ENTER: 13
  },
  EVENTS : {
    SCOPE_DESTROY : '$destroy',
    TABS_CHANGED : '$materialTabsChanged',
    FOCUS_CHANGED : '$materialFocusChanged',
    WINDOW_RESIZE : 'resize',
    KEY_DOWN     : 'keydown',
    CLICK        : 'click'
  }
};

/**
 * Alias shortcuts...
 */
var EVENT = Constant.EVENTS;
var KEY  = Constant.KEY_CODE;

/**
 * @ngdoc module
 * @name material.components.animate
 * @description
 *
 * Ink and Popup Effects
 */
angular.module('material.animations', [
  'ngAnimateStylers', 
  'ngAnimateSequence', 
  'material.services.position',
  'material.services.throttle'
])
  .service('$materialEffects', [ 
    '$animateSequence', 
    '$rootElement', 
    '$position', 
    '$$rAF', 
    '$sniffer',
    MaterialEffects
  ]);

/**
 * @ngdoc service
 * @name $materialEffects
 * @module material.components.animate
 *
 * @description
 * The `$materialEffects` service provides a simple API for various
 * Material Design effects.
 *
 * @returns A `$materialEffects` object with the following properties:
 * - `{function(element,styles,duration)}` `inkBar` - starts ink bar
 * animation on specified DOM element
 * - `{function(element,parentElement,clickElement)}` `popIn` - animated show of element overlayed on parent element
 * - `{function(element,parentElement)}` `popOut` - animated close of popup overlay
 *
 */
function MaterialEffects($animateSequence, $rootElement, $position, $$rAF, $sniffer) {

  var styler = angular.isDefined( $rootElement[0].animate ) ? 'webAnimations' :
               angular.isDefined( window['TweenMax'] || window['TweenLite'] ) ? 'gsap'   :
               angular.isDefined( window['jQuery'] ) ? 'jQuery' : 'default';

  var webkit = /webkit/i.test($sniffer.vendorPrefix);
  function vendorProperty(name) {
    return webkit ? 
      ('webkit' + name.charAt(0).toUpperCase() + name.substring(1)) :
      name;
  }

  var self;
  // Publish API for effects...
  return self = {
    makeSequence : makeSequence,

    popIn: popIn,
    popOut: popOut,

    /* Constants */
    TRANSITIONEND_EVENT: 'transitionend' + (webkit ? ' webkitTransitionEnd' : ''),
    ANIMATIONEND_EVENT: 'animationend' + (webkit ? ' webkitAnimationEnd' : ''),

    TRANSFORM: vendorProperty('transform'),
    TRANSITION: vendorProperty('transition'),
    TRANSITION_DURATION: vendorProperty('transitionDuration'),
    ANIMATION_PLAY_STATE: vendorProperty('animationPlayState'),
    ANIMATION_DURATION: vendorProperty('animationDuration'),
    ANIMATION_NAME: vendorProperty('animationName'),
    ANIMATION_TIMING: vendorProperty('animationTimingFunction'),
    ANIMATION_DIRECTION: vendorProperty('animationDirection')
  };

  // **********************************************************
  // API Methods
  // **********************************************************

  function makeSequence( from, to, duration )
  {
    var animate = $animateSequence({ styler: styler }).animate,
       sequence = animate( from, to , safeDuration(duration) );

    return sequence;
  }

  /**
   *
   */
  function popIn(element, parentElement, clickElement, done) {
    parentElement.append(element);

    var startPos;
    if (clickElement) {
      var clickPos = $position.offset(clickElement);
      startPos = translateString(
        clickPos.left - element[0].offsetWidth / 2,
        clickPos.top - element[0].offsetHeight / 2, 
        0
      ) + ' scale(0.2)';
    } else {
      startPos = 'translate3d(0,100%,0) scale(0.5)';
    }

    element
      .css(self.TRANSFORM, startPos)
      .css('opacity', 0);
    
    $$rAF(function() {
      $$rAF(function() {
        element
          .addClass('active')
          .css(self.TRANSFORM, '')
          .css('opacity', '')
          .on(self.TRANSITIONEND_EVENT, finished);
      });
    });

    function finished(ev) {
      //Make sure this transitionend didn't bubble up from a child
      if (ev.target === element[0]) {
        element.off(self.TRANSITIONEND_EVENT, finished);
        (done || angular.noop)();
      }
    }
  }

  /**
   *
   *
   */
  function popOut(element, parentElement, done) {
    var endPos = $position.positionElements(parentElement, element, 'bottom-center');

    element
      .css(self.TRANSFORM, 
           translateString(endPos.left, endPos.top, 0) + ' scale(0.5)')
      .css('opacity', 0)
      .on(self.TRANSITIONEND_EVENT, finished);

    function finished(ev) {
      //Make sure this transitionend didn't bubble up from a child
      if (ev.target === element[0]) {
        element.off(self.TRANSITIONEND_EVENT, finished);
        (done || angular.noop)();
      }
    }
  }


  // **********************************************************
  // Utility Methods
  // **********************************************************


  function translateString(x, y, z) {
    return 'translate3d(' + Math.floor(x) + 'px,' + Math.floor(y) + 'px,' + Math.floor(z) + 'px)';
  }


  /**
   * Support values such as 0.65 secs or 650 msecs
   */
  function safeDuration(value) {
    var duration = isNaN(value) ? 0 : Number(value);
    return (duration < 1.0) ? (duration * 1000) : duration;
  }

  /**
   * Convert all values to decimal;
   * eg 150 msecs -> 0.15sec
   */
  function safeVelocity(value) {
    var duration = isNaN(value) ? 0 : Number(value);
    return (duration > 100) ? (duration / 1000) :
      (duration > 10 ) ? (duration / 100) :
        (duration > 1  ) ? (duration / 10) : duration;
  }

}


(function() {

angular.module('material.animations')

/**
 * noink/nobar/nostretch directive: make any element that has one of
 * these attributes be given a controller, so that other directives can 
 * `require:` these and see if there is a `no<xxx>` parent attribute.
 *
 * @usage
 * <hljs lang="html">
 * <parent noink>
 *   <child detect-no>
 *   </child>
 * </parent>
 * </hljs>
 *
 * <hljs lang="js">
 * myApp.directive('detectNo', function() {
 *   return {
 *     require: ['^?noink', ^?nobar'],
 *     link: function(scope, element, attr, ctrls) {
 *       var noinkCtrl = ctrls[0];
 *       var nobarCtrl = ctrls[1];
 *       if (noInkCtrl) {
 *         alert("the noink flag has been specified on an ancestor!");
 *       }
 *       if (nobarCtrl) {
 *         alert("the nobar flag has been specified on an ancestor!");
 *       }
 *     }
 *   };
 * });
 * </hljs>
 */
.directive({
  noink: attrNoDirective(),
  nobar: attrNoDirective(),
  nostretch: attrNoDirective(),
});

function attrNoDirective() {
  return function() {
    return {
      controller: angular.noop
    };
  };
}

})();


angular.module('material.animations')

.directive('inkRipple', [
  '$materialInkRipple',
  InkRippleDirective
])

.factory('$materialInkRipple', [
  '$window',
  '$$rAF',
  '$materialEffects',
  '$timeout',
  InkRippleService
]);

function InkRippleDirective($materialInkRipple) {
  return function(scope, element, attr) {
    if (attr.inkRipple == 'checkbox') {
      $materialInkRipple.attachCheckboxBehavior(element);
    } else {
      $materialInkRipple.attachButtonBehavior(element);
    }
  };
}

function InkRippleService($window, $$rAF, $materialEffects, $timeout) {

  // TODO fix this. doesn't support touch AND click devices (eg chrome pixel)
  var hasTouch = !!('ontouchend' in document);
  var POINTERDOWN_EVENT = hasTouch ? 'touchstart' : 'mousedown';
  var POINTERUP_EVENT = hasTouch ? 'touchend touchcancel' : 'mouseup mouseleave';

  return {
    attachButtonBehavior: attachButtonBehavior,
    attachCheckboxBehavior: attachCheckboxBehavior,
    attach: attach,
  };

  function attachButtonBehavior(element) {
    return attach(element, {
      mousedown: true,
      center: false,
      animationDuration: 350,
      mousedownPauseTime: 175,
      animationName: 'inkRippleButton',
      animationTimingFunction: 'linear'
    });
  }

  function attachCheckboxBehavior(element) {
    return attach(element, {
      mousedown: true,
      center: true,
      animationDuration: 300,
      mousedownPauseTime: 180,
      animationName: 'inkRippleCheckbox',
      animationTimingFunction: 'linear'
    });
  }

  function attach(element, options) {
    options = angular.extend({
      mousedown: true,
      hover: true,
      focus: true,
      center: false,
      animationDuration: 300,
      mousedownPauseTime: 150,
      animationName: '',
      animationTimingFunction: 'linear'
    }, options || {});

    var rippleContainer;
    var node = element[0];

    if (options.mousedown) {
      enableMousedown();
    }

    function rippleIsAllowed() {
      return !element.controller('noink') && !Util.isDisabled(element);
    }

    function enableMousedown() {
      element.on(POINTERDOWN_EVENT, onPointerDown);

      function onPointerDown(ev) {
        if (!rippleIsAllowed()) return;


        var rippleEl = createRippleFromEvent(ev);
        var ripplePauseTimeout = $timeout(pauseRipple, options.mousedownPauseTime, false);
        rippleEl.on('$destroy', cancelRipplePause);

        // Stop listening to pointer down for now, until the user lifts their finger/mouse
        element.off(POINTERDOWN_EVENT, onPointerDown);
        element.on(POINTERUP_EVENT, onPointerUp);

        function onPointerUp() {
          cancelRipplePause();
          rippleEl.css($materialEffects.ANIMATION_PLAY_STATE, 'running');
          element.off(POINTERUP_EVENT, onPointerUp);
          element.on(POINTERDOWN_EVENT, onPointerDown);
        }
        function pauseRipple() {
          rippleEl.css($materialEffects.ANIMATION_PLAY_STATE, 'paused');
        }
        function cancelRipplePause() {
          $timeout.cancel(ripplePauseTimeout);
        }
      }
    }

    function createRippleFromEvent(ev) {
      ev = ev.touches ? ev.touches[0] : ev;
      return createRipple(ev.pageX, ev.pageY, true);
    }
    function createRipple(left, top, positionsAreAbsolute) {

      var rippleEl = angular.element('<div class="material-ripple">')
        .css($materialEffects.ANIMATION_DURATION, options.animationDuration + 'ms')
        .css($materialEffects.ANIMATION_NAME, options.animationName)
        .css($materialEffects.ANIMATION_TIMING, options.animationTimingFunction)
        .on($materialEffects.ANIMATIONEND_EVENT, function() {
          rippleEl.remove();
        });

      if (!rippleContainer) {
        rippleContainer = angular.element('<div class="material-ripple-container">');
        element.append(rippleContainer);
      }
      rippleContainer.append(rippleEl);

      var containerWidth = rippleContainer.prop('offsetWidth');

      if (options.center) {
        left = containerWidth / 2;
        top = rippleContainer.prop('offsetHeight') / 2;
      } else if (positionsAreAbsolute) {
        var elementRect = node.getBoundingClientRect();
        left -= elementRect.left;
        top -= elementRect.top;
      }

      var css = {
        'background-color': $window.getComputedStyle(rippleEl[0]).color || 
          $window.getComputedStyle(node).color,
        'border-radius': (containerWidth / 2) + 'px',

        left: (left - containerWidth / 2) + 'px',
        width: containerWidth + 'px',

        top: (top - containerWidth / 2) + 'px',
        height: containerWidth + 'px',
      };
      css[$materialEffects.ANIMATION_DURATION] = options.fadeoutDuration + 'ms';
      rippleEl.css(css);

      return rippleEl;
    }
  }

}

/**
 * @ngdoc module
 * @name material.components.sticky
 * @description
 *
 * Sticky effects for material
 */

angular.module('material.components.sticky', ['material.components.content', 'material.decorators'])
.factory('$materialSticky', ['$window', '$document', '$$rAF', MaterialSticky])
.directive('materialSticky', ['$materialSticky', MaterialStickyDirective]);

/**
 * @ngdoc factory
 * @name $materialSticky
 * @module material.components.sticky
 *
 * @description
 * The `$materialSticky`service provides a mixin to make elements sticky.
 *
 * @returns A `$materialSticky` function that takes `$el` as an argument.
 */

function MaterialSticky($window, $document, $$rAF) {
  var browserStickySupport;

  /**
   * Registers an element as sticky, used internally by directives to register themselves
   */


  function registerStickyElement(scope, $el) {
    scope.$on('$destroy', function() { $deregister($el); });
    $el = Util.wrap($el, 'div', 'sticky-container');

    var ctrl = $el.controller('materialContent');

    if(!ctrl) { throw new Error('$materialSticky used outside of material-content'); }
    $container = ctrl.$element;

    var $sticky = $container.data('$sticky') || {};
    var elements = $sticky.elements || [];
    elements.push($el);
    if(!$sticky.elements) {
      $sticky.elements = elements;
    }

    // check sticky support on first register
    if(browserStickySupport === undefined) {
      browserStickySupport = checkStickySupport($el);
    } else if(browserStickySupport) {
      $el.css({position: browserStickySupport, top: '0px'});
    }

    if(!$sticky.check) {
      var debouncedCheck = $sticky.check || $$rAF.debounce(angular.bind(undefined, checkElements, $container));
      $sticky.check = debouncedCheck;
    }

    if(!browserStickySupport) {
      if(elements.length == 1) {
        $container.data('$sticky', $sticky);
        $container.on('scroll',  $sticky.check);
      }
      scanElements($container);
    }

    return $deregister;

    // Deregister a sticky element, useful for $destroy event.
    function $deregister($el) {
      var innerElements = elements.map(function(el) { return el.children(0); });
      var index = innerElements.indexOf($el);
      if(index !== -1) {
        elements[index].replaceWith($el);
        elements.splice(index, 1);
        if(elements.length === 0) {
          $container.off('scroll', $sticky.check);
          $container.removeData('$sticky');
        }
      }
    }
  }
  return registerStickyElement;

  function checkStickySupport($el) {
    var stickyProps = ['sticky', '-webkit-sticky'];
    for(var i = 0; i < stickyProps.length; ++i) {
      $el.css({position: stickyProps[i], top: '0px'});
      if($window.getComputedStyle($el[0]).position == stickyProps[i]) {
        return stickyProps[i];
      }
    }
    $el.css({position: undefined, top: undefined});
    return false;
  }


  /* *
   * Function to prepare our lookups so we can go quick!
   * */

  function scanElements($container) {
    var $sticky = $container.data('$sticky');
    var elements = $sticky.elements;
    if(browserStickySupport) return; // don't need to do anything if we have native sticky
    targetElementIndex = 0;
    // Sort based on position in the window, and assign an active index
    orderedElements = elements.sort(function(a, b) {
      return rect(a).top - rect(b).top;
    });

    $sticky.orderedElements = orderedElements;


    // Iterate over our sorted elements and find the one that is active
    (function findTargetElement() {
      var scroll = $container.prop('scrollTop');
      for(var i = 0; i < orderedElements.length ; ++i) {
        if(rect(orderedElements[i]).bottom > 0) {
          targetElementIndex = i > 0 ? i - 1 : i;
          break;
        } else {
          targetElementIndex = i;
          break;
        }
      }
      $sticky.targetIndex = targetElementIndex;
    })();
  }

  function checkElements($container) {
    var next; // pointer to next target

    var $sticky = $container.data('$sticky');

    var targetElementIndex = $sticky.targetIndex;
    var orderedElements = $sticky.orderedElements;

    var content = targetElement().children(0);
    var contentRect = rect(content);
    var targetRect = rect(targetElement());

    var scrollingDown = false;
    var currentScroll = $container.prop('scrollTop');
    var lastScroll = $sticky.lastScroll;
    if(currentScroll > (lastScroll || 0)) {
      scrollingDown = true;
    }
    $sticky.lastScroll = currentScroll;

    var stickyActive = content.attr('material-sticky-active');


    // If we are scrollingDown, sticky, and are being pushed off screen by a different element, increment
    if(scrollingDown && stickyActive && contentRect.bottom <= 0 && targetElementIndex < orderedElements.length - 1) {
      targetElement().children(0).removeAttr('material-sticky-active');
      targetElement().css({height: null});
      incrementElement();
      return;

    //If we are going up, and our normal position would be rendered not sticky, un-sticky ourselves
    } else if(!scrollingDown && stickyActive && targetRect.top > 0) {
      targetElement().children(0).removeAttr('material-sticky-active');
      targetElement().css({height: null});
      if(targetElementIndex > 0) {
        incrementElement(-1);
        content.attr('material-sticky-active', true);
        var transformStr = 'translate3d(0, ' + -1*contentRect.height + 'px, 0';
        content.css({transform: transformStr, '-webkit-transform': transformStr});
        content.data('translatedHeight', -1*contentRect.height);
        targetElement().css({height: contentRect.height});
      }
      return;

    // If we are going off screen and haven't been made sticky yet, go sticky
    } else if(scrollingDown && contentRect.top <= 0 && !stickyActive) {
      content.attr('material-sticky-active', true);
      targetElement().css({height: contentRect.height});
      contentRect = rect(content);
      next = targetElement(+1);
      var offset = 0;
      if(next) {
        nextRect = rect(next.children(0));
        if(rectsAreTouching(contentRect, nextRect)) {
          offset = nextRect.top - contentRect.bottom;
        }
      }
      offset = Math.min(offset, 0);
      var transformStr = 'translate3d(0, ' + offset + 'px, 0';
      content.css({transform: transformStr, '-webkit-transform': transformStr});
      content.data('translatedHeight', offset);
      return;
    } 

    var nextRect, offsetAmount, currentTop, translateAmt;

    // check if we need to push
    if(scrollingDown) {
      next = targetElement(+1);
      if(next) {
        nextRect = rect(next.children(0));
        if(rectsAreTouching(contentRect, nextRect)) {
          offsetAmount = contentRect.bottom - nextRect.top;
          currentTop = content.data('translatedHeight') || 0;
          translateAmt = currentTop - offsetAmount;
          var transformStr = 'translate3d(0, ' + translateAmt + 'px, 0';
          content.css({transform: transformStr, '-webkit-transform': transformStr});
          content.data('translatedHeight', translateAmt);
        }
      }
    // Check if we need to pull
    } else if(targetElementIndex < orderedElements.length - 1 && contentRect.top < 0) {
      nextRect = rect(targetElement(+1).children(0));
      offsetAmount = contentRect.bottom - nextRect.top;
      currentTop = content.data('translatedHeight') || 0;
      translateAmt = Math.min(currentTop - offsetAmount, 0);
      var transformStr = 'translate3d(0, ' + translateAmt + 'px, 0';
      content.css({transform: transformStr, '-webkit-transform': transformStr});
      content.data('translatedHeight', translateAmt);
    }

    function incrementElement(inc) {
      inc = inc || 1;
      targetElementIndex += inc;
      content = targetElement().children(0);
      contentRect = rect(content);
      $sticky.targetIndex = targetElementIndex;
    }

    function targetElement(indexModifier) {
      indexModifier = indexModifier || 0;
      if(targetElementIndex === undefined) return undefined;
      return orderedElements[targetElementIndex + indexModifier];
    }
  }

  function rectsAreTouching(first, second) {
    return first.bottom >= second.top;
  }

  // Helper functions to get position of element

  function rect($el) {
    return $el.hasOwnProperty(0) ? $el[0].getBoundingClientRect() : $el.getBoundingClientRect();
  }


}

/**
 * @ngdoc directive
 * @name materialSticky
 * @module material.components.sticky
 *
 * @description
 * Directive to consume the $materialSticky service
 *
 * @returns A material-sticky directive
 */
function MaterialStickyDirective($materialSticky) {
  return {
    restrict: 'A',
    link: $materialSticky
  };
}

/**
 * @ngdoc module
 * @name material.components.buttons
 * @description
 *
 * Button
 */
angular.module('material.components.button', [
  'material.animations',
  'material.services.aria'
])
  .directive('materialButton', [
    'ngHrefDirective',
    '$materialInkRipple',
    '$aria',
    MaterialButtonDirective
  ]);

/**
 * @ngdoc directive
 * @name materialButton
 * @order 0
 *
 * @restrict E
 *
 * @description
 * `<material-button>` is a button directive with optional ink ripples (default enabled).
 *
 * @param {boolean=} noink Flag indicates use of ripple ink effects
 * @param {boolean=} disabled Flag indicates if the tab is disabled: not selectable with no ink effects
 * @param {string=} type Optional attribute to specific button types (useful for forms); such as 'submit', etc.
 * @param {string=} ng-href Optional attribute to support both ARIA and link navigation
 * @param {string=} href Optional attribute to support both ARIA and link navigation
 * @param {string=} ariaLabel Publish the button label used by screen-readers for accessibility. Defaults to the radio button's text.
 *
 * @usage
 * <hljs lang="html">
 *  <material-button>Button</material-button>
 *  <br/>
 *  <material-button noink class="material-button-colored">
 *    Button (noInk)
 *  </material-button>
 *  <br/>
 *  <material-button disabled class="material-button-colored">
 *    Colored (disabled)
 *  </material-button>
 * </hljs>
 */
function MaterialButtonDirective(ngHrefDirectives, $materialInkRipple, $aria ) {
  var ngHrefDirective = ngHrefDirectives[0];

  return {
    restrict: 'E',
    compile: function(element, attr) {
      var innerElement;
      var attributesToCopy;

      // Add an inner anchor if the element has a `href` or `ngHref` attribute,
      // so this element can be clicked like a normal `<a>`.
      if (attr.ngHref || attr.href) {
        innerElement = angular.element('<a>');
        attributesToCopy = ['ng-href', 'href', 'rel', 'target'];
      // Otherwise, just add an inner button element (for form submission etc)
      } else {
        innerElement = angular.element('<button>');
        attributesToCopy = ['type', 'disabled', 'ng-disabled', 'form'];
      }

      angular.forEach(attributesToCopy, function(name) {
        var camelCaseName = Util.camelCase(name);
        if (attr.hasOwnProperty(camelCaseName)) {
          innerElement.attr(name, attr[camelCaseName]);
        }
      });

      innerElement
        .addClass('material-button-inner')
        .append(element.contents())
        // Since we're always passing focus to the inner element,
        // add a focus class to the outer element so we can still style
        // it with focus.
        .on('focus', function() {
          element.addClass('focus');
        })
        .on('blur', function() {
          element.removeClass('focus');
        });

      element.
        append(innerElement)
        .attr('tabIndex', -1)
        //Always pass focus to innerElement
        .on('focus', function() {
          innerElement.focus();
        });

      return function postLink(scope, element, attr) {
        $aria.expect(element, 'aria-label', element.text());
        $materialInkRipple.attachButtonBehavior(element);
      };
    }
  };

}

/**
 * @ngdoc module
 * @name material.components.card
 *
 * @description
 * Card components.
 */
angular.module('material.components.card', [
])
  .directive('materialCard', [
    materialCardDirective 
  ]);



/**
 * @ngdoc directive
 * @name materialCard
 * @module material.components.card
 *
 * @restrict E
 *
 * @description
 * The `<material-card>` directive is a container element used within `<material-content>` containers.
 *
 * Cards have constant width and variable heights; where the maximum height is limited to what can
 * fit within a single view on a platform, but it can temporarily expand as needed
 *
 * @usage
 * <hljs lang="html">
 * <material-card>
 *  <img src="/img/washedout.png" class="material-card-image">
 *  <h2>Paracosm</h2>
 *  <p>
 *    The titles of Washed Out's breakthrough song and the first single from Paracosm share the * two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...
 *  </p>
 * </material-card>
 * </hljs>
 *
 */
function materialCardDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.checkbox
 * @description Checkbox module!
 */
angular.module('material.components.checkbox', [
  'material.animations',
  'material.services.aria'
])
  .directive('materialCheckbox', [ 
    'inputDirective',
    '$materialInkRipple',
    '$aria',
    MaterialCheckboxDirective
  ]);

/**
 * @ngdoc directive
 * @name materialCheckbox
 * @module material.components.checkbox
 * @restrict E
 *
 * @description
 * The checkbox directive is used like the normal [angular checkbox](https://docs.angularjs.org/api/ng/input/input%5Bcheckbox%5D).
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} name Property name of the form under which the control is published.
 * @param {expression=} ngTrueValue The value to which the expression should be set when selected.
 * @param {expression=} ngFalseValue The value to which the expression should be set when not selected.
 * @param {string=} ngChange Angular expression to be executed when input changes due to user interaction with the input element.
 * @param {boolean=} noink Use of attribute indicates use of ripple ink effects
 * @param {boolean=} disabled Use of attribute indicates the switch is disabled: no ink effects and not selectable
 * @param {string=} ariaLabel Publish the button label used by screen-readers for accessibility. Defaults to the checkbox's text.
 *
 * @usage
 * <hljs lang="html">
 * <material-checkbox ng-model="isChecked" aria-label="Finished?">
 *   Finished ?
 * </material-checkbox>
 *
 * <material-checkbox noink ng-model="hasInk" aria-label="No Ink Effects">
 *   No Ink Effects
 * </material-checkbox>
 *
 * <material-checkbox disabled ng-model="isDisabled" aria-label="Disabled">
 *   Disabled
 * </material-checkbox>
 *
 * </hljs>
 *
 */
function MaterialCheckboxDirective(inputDirectives, $materialInkRipple, $aria) {
  var inputDirective = inputDirectives[0];

  var CHECKED_CSS = 'material-checked';

  return {
    restrict: 'E',
    transclude: true,
    require: '?ngModel',
    template: 
      '<div class="material-container" ink-ripple="checkbox">' +
        '<div class="material-icon"></div>' +
      '</div>' +
      '<div ng-transclude class="material-label"></div>',
    link: postLink
  };

  // **********************************************************
  // Private Methods
  // **********************************************************

  function postLink(scope, element, attr, ngModelCtrl) {
    var checked = false;

    // Create a mock ngModel if the user doesn't provide one
    ngModelCtrl = ngModelCtrl || {
      $setViewValue: function(value) {
        this.$viewValue = value;
      },
      $parsers: [],
      $formatters: []
    };

    // Reuse the original input[type=checkbox] directive from Angular core.
    // This is a bit hacky as we need our own event listener and own render 
    // function.
    attr.type = 'checkbox';
    attr.tabIndex = 0;
    inputDirective.link(scope, {
      on: angular.noop,
      0: {}
    }, attr, [ngModelCtrl]);

    // We can't chain element.attr here because of a bug with jqLite
    element.attr(Constant.ARIA.PROPERTY.CHECKED, checked);
    element.attr('role', attr.type);
    element.attr('tabIndex', attr.tabIndex);
    element.on('click', listener);
    element.on('keypress', keypressHandler);
    ngModelCtrl.$render = render;

    $aria.expect(element, Constant.ARIA.PROPERTY.LABEL, element.text());

    function keypressHandler(ev) {
      if(ev.which === Constant.KEY_CODE.SPACE) {
        ev.preventDefault();
        listener(ev);
      }
    }
    function listener(ev) {
      if (element[0].hasAttribute('disabled')) return;

      scope.$apply(function() {
        checked = !checked;
        ngModelCtrl.$setViewValue(checked, ev && ev.type);
        ngModelCtrl.$render();
      });
    }

    function render() {
      checked = ngModelCtrl.$viewValue;
      element.attr(Constant.ARIA.PROPERTY.CHECKED, checked);
      if(checked) {
        element.addClass(CHECKED_CSS);
      } else {
        element.removeClass(CHECKED_CSS);
      }
    }
  }

}



/**
 * @ngdoc module
 * @name material.components.content
 *
 * @description
 * Scrollable content
 */
angular.module('material.components.content', [
  'material.services.registry'
])
  .directive('materialContent', [
    materialContentDirective
  ]);

/**
 * @ngdoc directive
 * @name materialContent
 * @module material.components.content
 *
 * @restrict E
 *
 * @description
 * The `<material-content>` directive is a container element useful for scrollable content
 *
 * @usage
 * <hljs lang="html">
 *  <material-content class="material-content-padding">
 *      Lorem ipsum dolor sit amet, ne quod novum mei.
 *  </material-content>
 * </hljs>
 *
 */
function materialContentDirective() {
  return {
    restrict: 'E',
    controller: function($scope, $element) {
      this.$element = $element;
    },
    link: function($scope, $element, $attr) {
      $scope.$broadcast('$materialContentLoaded', $element);
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.dialog
 */
angular.module('material.components.dialog', [
  'material.animations',
  'material.services.compiler',
  'material.services.aria'
])
  .directive('materialDialog', [
    '$$rAF',
    MaterialDialogDirective
  ])
  .factory('$materialDialog', [
    '$timeout',
    '$materialCompiler',
    '$rootElement',
    '$rootScope',
    '$materialEffects',
    '$animate',
    '$aria',
    MaterialDialogService
  ]);

function MaterialDialogDirective($$rAF) {
  return {
    restrict: 'E',
    link: function(scope, element, attr) {
      $$rAF(function() {
        var content = element[0].querySelector('.dialog-content');
        if (content && content.scrollHeight > content.clientHeight) {
          element.addClass('dialog-content-overflow');
        }
      });
    }
  };
}

/**
 * @ngdoc service
 * @name $materialDialog
 * @module material.components.dialog
 *
 * @description
 *
 * The $materialDialog service opens a dialog over top of the app. 
 *
 * The `$materialDialog` service can be used as a function, which when called will open a
 * dialog. Note: the dialog is always given an isolate scope.
 *
 * It takes one argument, `options`, which is defined below.
 *
 * Note: the dialog's template must have an outer `<material-dialog>` element. 
 * Inside, use an element with class `dialog-content` for the dialog's content, and use
 * an element with class `dialog-actions` for the dialog's actions.  
 *
 * When opened, the `dialog-actions` area will attempt to focus the first button found with 
 * class `dialog-close`. If no button with `dialog-close` class is found, it will focus the
 * last button in the `dialog-actions` area.
 *
 * @usage
 * <hljs lang="html">
 * <div ng-controller="MyController">
 *   <material-button ng-click="openDialog($event)">
 *     Open a Dialog from this button!
 *   </material-button>
 * </div>
 * </hljs>
 * <hljs lang="js">
 * var app = angular.module('app', ['ngMaterial']);
 * app.controller('MyController', function($scope, $materialDialog) {
 *   $scope.openDialog = function($event) {
 *     var hideDialog = $materialDialog({
 *       template: '<material-dialog>Hello!</material-dialog>',
 *       targetEvent: $event
 *     });
 *   };
 * });
 * </hljs>
 *
 * @returns {function} `hideDialog` - A function that hides the dialog.
 *
 * @paramType Options
 * @param {string=} templateUrl The url of a template that will be used as the content
 * of the dialog. 
 * @param {string=} template Same as templateUrl, except this is an actual template string.
 * @param {DOMClickEvent=} targetEvent A click's event object. When passed in as an option, 
 * the location of the click will be used as the starting point for the opening animation
 * of the the dialog.
 * @param {boolean=} hasBackdrop Whether there should be an opaque backdrop behind the dialog.
 *   Default true.
 * @param {boolean=} clickOutsideToClose Whether the user can click outside the dialog to
 *   close it. Default true.
 * @param {boolean=} escapeToClose Whether the user can press escape to close the dialog.
 *   Default true.
 * @param {string=} controller The controller to associate with the dialog. The controller
 * will be injected with the local `$hideDialog`, which is a function used to hide the dialog.
 * @param {object=} locals An object containing key/value pairs. The keys will be used as names
 * of values to inject into the controller. For example, `locals: {three: 3}` would inject
 * `three` into the controller, with the value 3.
 * @param {object=} resolve Similar to locals, except it takes promises as values, and the
 * toast will not open until all of the promises resolve.
 * @param {string=} controllerAs An alias to assign the controller to on the scope.
 * @param {element=} appendTo The element to append the dialog to. Defaults to appending
 *   to the root element of the application.
 */
function MaterialDialogService($timeout, $materialCompiler, $rootElement, $rootScope, $materialEffects, $animate, $aria) {
  var recentDialog;
  var dialogParent = $rootElement.find('body');
  if ( !dialogParent.length ) {
    dialogParent = $rootElement;
  }

  return showDialog;

  function showDialog(options) {
    options = angular.extend({
      appendTo: dialogParent,
      hasBackdrop: true, // should have an opaque backdrop
      clickOutsideToClose: true, // should have a clickable backdrop to close
      escapeToClose: true,
      // targetEvent: used to find the location to start the dialog from
      targetEvent: null,
      transformTemplate: function(template) {
        return '<div class="material-dialog-container">' + template + '</div>';
      },
      // Also supports all options from $materialCompiler.compile
    }, options || {});

    // Incase the user provides a raw dom element, always wrap it in jqLite
    options.appendTo = angular.element(options.appendTo); 

    // Close the old dialog
    recentDialog && recentDialog.then(function(destroyDialog) {
      destroyDialog();
    });

    recentDialog = $materialCompiler.compile(options).then(function(compileData) {
      // Controller will be passed a `$hideDialog` function
      compileData.locals.$hideDialog = destroyDialog;

      var scope = $rootScope.$new(true);
      var element = compileData.link(scope); 
      var popInTarget = options.targetEvent && options.targetEvent.target && 
        angular.element(options.targetEvent.target);
      var closeButton = findCloseButton();
      var backdrop;

      configureAria(element.find('material-dialog'));

      if (options.hasBackdrop) {
        backdrop = angular.element('<material-backdrop class="opaque ng-enter">');
        $animate.enter(backdrop, options.appendTo, null);
      }
      $materialEffects.popIn(element, options.appendTo, popInTarget, function() {
        if (options.escapeToClose) {
          $rootElement.on('keyup', onRootElementKeyup);
        }
        if (options.clickOutsideToClose) {
          element.on('click', dialogClickOutside);
        }
        closeButton.focus();
      });

      return destroyDialog;

      function findCloseButton() {
        //If no element with class dialog-close, try to find the last 
        //button child in dialog-actions and assume it is a close button
        var closeButton = element[0].querySelector('.dialog-close');
        if (!closeButton) {
          var actionButtons = element[0].querySelectorAll('.dialog-actions button');
          closeButton = actionButtons[ actionButtons.length - 1 ];
        }
        return angular.element(closeButton);
      }
      function destroyDialog() {
        if (destroyDialog.called) return;
        destroyDialog.called = true;

        if (backdrop) {
          $animate.leave(backdrop);
        }
        if (options.escapeToClose) {
          $rootElement.off('keyup', onRootElementKeyup);
        }
        if (options.clickOutsideToClose) {
          element.off('click', dialogClickOutside);
        }
        $materialEffects.popOut(element, options.appendTo, function() {
          element.remove();
          scope.$destroy();
          scope = null;
          element = null;

          if(popInTarget !== null) {
            popInTarget.focus();
          }
        });
      }
      function onRootElementKeyup(e) {
        if (e.keyCode == Constant.KEY_CODE.ESCAPE) {
          $timeout(destroyDialog);
        }
      }
      function dialogClickOutside(e) {
        // If we click the flex container outside the backdrop
        if (e.target === element[0]) {
          $timeout(destroyDialog);
        }
      }
    });

    /**
     * Inject ARIA-specific attributes appropriate for Dialogs
     */
    function configureAria(element) {
      var ROLE = Constant.ARIA.ROLE;

      $aria.update(element, {
        'role': ROLE.DIALOG
      });

      var dialogContent = element.find('.dialog-content');
      if(dialogContent.length === 0){
        dialogContent = element;
      }
      var defaultText = Util.stringFromTextBody(dialogContent.text(), 3);
      $aria.expect(element, 'aria-label', defaultText);
    }

    return recentDialog;
  }
}

/**
 * @ngdoc module
 * @name material.components.form
 * @description
 * Form
 */
angular.module('material.components.form', [])
  .directive('materialInputGroup', [
    materialInputGroupDirective
  ])
  .directive('materialInput', [
    materialInputDirective
  ]);

/**
 * @ngdoc directive
 * @name materialInputGroup
 * @module material.components.form
 * @restrict E
 * @description
 * Use the `<material-input-group>` directive as the grouping parent of an `<material-input>` elements
 *
 * @usage 
 * <hljs lang="html">
 * <material-input-group>
 *   <material-input type="text" ng-model="myText">
 * </material-input-group>
 * </hljs>
 */
function materialInputGroupDirective() {
  return {
    restrict: 'CE',
    controller: ['$element', function($element) {
      this.setFocused = function(isFocused) {
        $element.toggleClass('material-input-focused', !!isFocused);
      };
      this.setHasValue = function(hasValue) {
        $element.toggleClass('material-input-has-value', !!hasValue);
      };
    }]
  };
}

/**
 * @ngdoc directive
 * @name materialInput
 * @module material.components.form
 *
 * @restrict E
 *
 * @description
 * Use the `<material-input>` directive as elements within a `<material-input-group>` container
 *
 * @usage
 * <hljs lang="html">
 * <material-input-group>
 *   <material-input type="text" ng-model="user.fullName"></material-input>
 *   <material-input type="text" ng-model="user.email"></material-input>
 * </material-input-group>
 * </hljs>
 */
function materialInputDirective() {
  return {
    restrict: 'E',
    replace: true,
    template: '<input>',
    require: ['^?materialInputGroup', '?ngModel'],
    link: function(scope, element, attr, ctrls) {
      var inputGroupCtrl = ctrls[0];
      var ngModelCtrl = ctrls[1];
      if (!inputGroupCtrl) {
        return;
      }

      // When the input value changes, check if it "has" a value, and 
      // set the appropriate class on the input group
      if (ngModelCtrl) {
        //Add a $formatter so we don't use up the render function
        ngModelCtrl.$formatters.push(function(value) {
          inputGroupCtrl.setHasValue(!!value);
          return value;
        });
      }
      element.on('input', function() {
        inputGroupCtrl.setHasValue(!!element.val());
      });

      // When the input focuses, add the focused class to the group
      element.on('focus', function(e) {
        inputGroupCtrl.setFocused(true);
      });
      // When the input blurs, remove the focused class from the group
      element.on('blur', function(e) {
        inputGroupCtrl.setFocused(false);
      });

      scope.$on('$destroy', function() {
        inputGroupCtrl.setFocused(false);
        inputGroupCtrl.setHasValue(false);
      });
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.icon
 * @description
 * Icon
 */
angular.module('material.components.icon', [])
  .directive('materialIcon', [
    materialIconDirective
  ]);

/**
 * @ngdoc directive
 * @name materialIcon
 * @module material.components.icon
 *
 * @restrict E
 *
 * @description
 * The `<material-icon>` directive is an element useful for SVG icons
 *
 * @usage
 * <hljs lang="html">
 *  <material-icon icon="/img/icons/ic_access_time_24px.svg">
 *  </material-icon>
 * </hljs>
 *
 */
function materialIconDirective() {
  return {
    restrict: 'E',
    template: '<object class="material-icon"></object>',
    compile: function(element, attr) {
      var object = angular.element(element[0].children[0]);
      if(angular.isDefined(attr.icon)) {
        object.attr('data', attr.icon);
      }
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.list
 * @description
 * List module
 */
angular.module('material.components.list', [])

.directive('materialList', [
  materialListDirective
])
.directive('materialItem', [
  materialItemDirective
]);

/**
 * @ngdoc directive
 * @name materialList
 * @module material.components.list
 *
 * @restrict E
 *
 * @description
 * The `<material-list>` directive is a list container for 1..n `<material-item>` tags.
 *
 * @usage
 * <hljs lang="html">
 * <material-list>
 *  <material-item ng-repeat="item in todos">
 *    <div class="material-tile-left">
 *      <img ng-src="{{item.face}}" class="face" alt="{{item.who}}">
 *    </div>
 *    <div class="material-tile-content">
 *      <h3>{{item.what}}</h3>
 *      <h4>{{item.who}}</h4>
 *      <p>
 *        {{item.notes}}
 *      </p>
 *    </div>
 *
 *  </material-item>
 * </material-list>
 * </hljs>
 *
 */
function materialListDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
      $element.attr({
        'role' : Constant.ARIA.ROLE.LIST
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name materialItem
 * @module material.components.list
 *
 * @restrict E
 *
 * @description
 * The `<material-item>` directive is a container intended for row items in a `<material-list>` container.
 *
 * @usage
 * <hljs lang="html">
 *  <material-list>
 *    <material-item>
 *            Item content in list
 *    </material-item>
 *  </material-list>
 * </hljs>
 *
 */
function materialItemDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
      $element.attr({
        'role' : Constant.ARIA.ROLE.LIST_ITEM
      });
    }
  };
}


/**
 * @ngdoc module
 * @name material.components.radioButton
 * @description radioButton module!
 */
angular.module('material.components.radioButton', [
  'material.animations',
  'material.services.aria'
])
  .directive('materialRadioGroup', [
    materialRadioGroupDirective
  ])
  .directive('materialRadioButton', [
    '$aria',
    materialRadioButtonDirective
  ]);

/**
 * @ngdoc directive
 * @module material.components.radioButton
 * @name materialRadioGroup
 *
 * @order 0
 * @restrict E
 *
 * @description
 * The `<material-radio-group>` directive identifies a grouping
 * container for the 1..n grouped material radio buttons; specified using nested
 * `<material-radio-button>` tags.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {boolean=} noink Use of attribute indicates flag to disable ink ripple effects.
 *
 * @usage
 * <hljs lang="html">
 * <material-radio-group ng-model="selected">
 *
 *   <material-radio-button
 *        ng-repeat="d in colorOptions"
 *        ng-value="d.value" aria-label="{{ d.label }}">
 *
 *          {{ d.label }}
 *
 *   </material-radio-button>
 *
 * </material-radio-group>
 * </hljs>
 *
 */
function materialRadioGroupDirective() {
  RadioGroupController.prototype = createRadioGroupControllerProto();

  return {
    restrict: 'E',
    controller: RadioGroupController,
    require: ['materialRadioGroup', '?ngModel'],
    link: link
  };

  function link(scope, element, attr, ctrls) {
    var rgCtrl = ctrls[0],
      ngModelCtrl = ctrls[1] || {
        $setViewValue: angular.noop
      };

    function keydownListener(ev) {

      if (ev.which === Constant.KEY_CODE.LEFT_ARROW) {
        ev.preventDefault();
        rgCtrl.selectPrevious(element);
      }
      else if (ev.which === Constant.KEY_CODE.RIGHT_ARROW) {
        ev.preventDefault();
        rgCtrl.selectNext(element);
      }
    }

    rgCtrl.init(ngModelCtrl);

    element.attr({
      'role': Constant.ARIA.ROLE.RADIO_GROUP,
      'tabIndex': '0'
    })
    .on('keydown', keydownListener);
  }

  function RadioGroupController() {
    this._radioButtonRenderFns = [];
  }

  function createRadioGroupControllerProto() {
    return {
      init: function(ngModelCtrl) {
        this._ngModelCtrl = ngModelCtrl;
        this._ngModelCtrl.$render = angular.bind(this, this.render);
      },
      add: function(rbRender) {
        this._radioButtonRenderFns.push(rbRender);
      },
      remove: function(rbRender) {
        var index = this._radioButtonRenderFns.indexOf(rbRender);
        if (index !== -1) {
          this._radioButtonRenderFns.splice(index, 1);
        }
      },
      render: function() {
        this._radioButtonRenderFns.forEach(function(rbRender) {
          rbRender();
        });
      },
      setViewValue: function(value, eventType) {
        this._ngModelCtrl.$setViewValue(value, eventType);
        // update the other radio buttons as well
        this.render();
      },
      getViewValue: function() {
        return this._ngModelCtrl.$viewValue;
      },
      selectNext: function(element) {
        return selectButton('next', element);
      },
      selectPrevious : function(element) {
        return selectButton('previous', element);
      }
    };
  }
  /**
   * Select the grouping parent's next or previous radio/checkbox button.
   * NOTE: this uses the iterator.js utility function...
   */
  function selectButton( direction,  parent, loop ) {
    loop = angular.isUndefined(loop) ? true : !!loop;

    var buttons = Util.iterator( findAllButtons(parent), loop );

    if ( buttons.count() ) {
      var selected = findSelectedButton(parent);
      var target = !selected                ? buttons.first()    :
                   (direction =='previous') ? buttons.previous( selected ) : buttons.next( selected );

      if ( target ) {
        // Activate radioButton's click listener (triggerHandler won't send an actual click event)
        angular.element(target).triggerHandler('click');
      }
    }
  }
  /**
   *  Find all button children for specified element
   *   NOTE: This guarantees giving us every radio, even grandchildren, and
   *               us getting them in the proper order.
   */
  function findAllButtons(element) {
    return Array.prototype.slice.call(
      element[0].querySelectorAll('material-radio-button')
    );
  }

  /**
   * Find the currently selected button element (if any)
   */
  function findSelectedButton(element) {
    return element[0].querySelector('material-radio-button.material-checked');
  }
}

/**
 * @ngdoc directive
 * @module material.components.radioButton
 * @name materialRadioButton
 *
 * @order 1
 * @restrict E
 *
 * @description
 * The `<material-radio-button>`directive is the child directive required to be used within `<material-radioo-group>` elements.
 *
 * While similar to the `<input type="radio" ng-model="" value="">` directive,
 * the `<material-radio-button>` directive provides material ink effects, ARIA support, and
 * supports use within named radio groups.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} ngChange Angular expression to be executed when input changes due to user
 *    interaction with the input element.
 * @param {string} ngValue Angular expression which sets the value to which the expression should
 *    be set when selected.*
 * @param {string} value The value to which the expression should be set when selected.
 * @param {string=} name Property name of the form under which the control is published.
 * @param {string=} ariaLabel Publish the button label used by screen-readers for accessibility. Defaults to the radio button's text.
 *
 * @usage
 * <hljs lang="html">
 *
 * <material-radio-button value="1" aria-label="Label 1">
 *   Label 1
 * </material-radio-button>
 *
 * <material-radio-button ng-model="color" ng-value="specialValue" aria-label="Green">
 *   Green
 * </material-radio-button>
 *
 * </hljs>
 *
 */
function materialRadioButtonDirective($aria) {

  var CHECKED_CSS = 'material-checked';

  return {
    restrict: 'E',
    require: '^materialRadioGroup',
    transclude: true,
    template: '<div class="material-container" ink-ripple="checkbox">' +
                '<div class="material-off"></div>' +
                '<div class="material-on"></div>' +
              '</div>' +
              '<div ng-transclude class="material-label"></div>',
    link: link
  };

  function link(scope, element, attr, rgCtrl) {
    var lastChecked;

    rgCtrl.add(render);
    attr.$observe('value', render);

    element
      .on('click', listener)
      .on('$destroy', function() {
        rgCtrl.remove(render);
      })
      .attr('role', Constant.ARIA.ROLE.RADIO);

    $aria.expect(element, Constant.ARIA.PROPERTY.LABEL, element.text());

    function listener(ev) {
      if (element[0].hasAttribute('disabled')) return;

      scope.$apply(function() {
        rgCtrl.setViewValue(attr.value, ev && ev.type);
      });
    }

    function render() {
      var checked = (rgCtrl.getViewValue() === attr.value);
      if (checked === lastChecked) {
        return;
      }
      lastChecked = checked;
      element.attr(Constant.ARIA.PROPERTY.CHECKED, checked);
      if (checked) {
        element.addClass(CHECKED_CSS);
      } else {
        element.removeClass(CHECKED_CSS);
      }
    }
  }
}



/**
 * @ngdoc module
 * @name material.components.sidenav
 *
 * @description
 * A Sidenav QP component.
 */
angular.module('material.components.sidenav', [
  'material.services.registry'
])
  .factory('$materialSidenav', [
    '$materialComponentRegistry', 
    materialSidenavService 
  ])
  .directive('materialSidenav', [
    '$timeout',
    materialSidenavDirective 
  ])
  .controller('$materialSidenavController', [
    '$scope',
    '$element',
    '$attrs',
    '$timeout',
    '$materialSidenav',
    '$materialComponentRegistry',
    materialSidenavController 
  ]);
  
/**
 * @private
 * @ngdoc object
 * @name materialSidenavController
 * @module material.components.sidenav
 *
 * @description
 * The controller for materialSidenav components.
 */
function materialSidenavController($scope, $element, $attrs, $timeout, $materialSidenav, $materialComponentRegistry) {

  var self = this;

  $materialComponentRegistry.register(this, $attrs.componentId);

  this.isOpen = function() {
    return !!$scope.isOpen;
  };

  /**
   * Toggle the side menu to open or close depending on its current state.
   */
  this.toggle = function() {
    $scope.isOpen = !$scope.isOpen;
  };

  /**
   * Open the side menu
   */
  this.open = function() {
    $scope.isOpen = true;
  };

  /**
   * Close the side menu
   */
  this.close = function() {
    $scope.isOpen = false;
  };
}

/**
 * @private
 * @ngdoc service
 * @name $materialSidenav
 * @module material.components.sidenav
 *
 * @description
 * $materialSidenav makes it easy to interact with multiple sidenavs
 * in an app.
 *
 * @usage
 *
 * ```javascript
 * // Toggle the given sidenav
 * $materialSidenav(componentId).toggle();
 *
 * // Open the given sidenav
 * $materialSidenav(componentId).open();
 *
 * // Close the given sidenav
 * $materialSidenav(componentId).close();
 * ```
 */
function materialSidenavService($materialComponentRegistry) {
  return function(handle) {
    var instance = $materialComponentRegistry.get(handle);
    if(!instance) {
      $materialComponentRegistry.notFoundError(handle);
    }

    return {
      isOpen: function() {
        if (!instance) { return; }
        return instance.isOpen();
      },
      /**
       * Toggle the given sidenav
       * @param handle the specific sidenav to toggle
       */
      toggle: function() {
        if(!instance) { return; }
        instance.toggle();
      },
      /**
       * Open the given sidenav
       * @param handle the specific sidenav to open
       */
      open: function(handle) {
        if(!instance) { return; }
        instance.open();
      },
      /**
       * Close the given sidenav
       * @param handle the specific sidenav to close
       */
      close: function(handle) {
        if(!instance) { return; }
        instance.close();
      }
    };
  };
}

/**
 * @ngdoc directive
 * @name materialSidenav
 * @module material.components.sidenav
 * @restrict E
 *
 * @description
 *
 * A Sidenav component that can be opened and closed programatically.
 *
 * When used properly with a layout, it will seamleslly stay open on medium
 * and larger screens, while being hidden by default on mobile devices.
 *
 * @usage
 * <hljs lang="html">
 * <div layout="horizontal" ng-controller="MyController">
 *   <material-sidenav class="material-sidenav-left">
 *     Left Nav!
 *   </material-sidenav>
 *
 *   <material-content>
 *     Center Content
 *     <material-button ng-click="openLeftMenu()">
 *       Open Left Menu
 *     </material-button>
 *   </material-content>
 *
 *   <material-sidenav class="material-sidenav-right">
 *     Right Nav!
 *   </material-sidenav>
 * </div>
 * </hljs>
 *
 * <hljs lang="js">
 * var app = angular.module('myApp', ['ngMaterial']);
 * app.controller('MainController', function($scope, $materialSidenav) {
 *   $scope.openLeftMenu = function() {
 *     $materialSidenav('left').toggle();
 *   };
 * });
 * </hljs>
 */
function materialSidenavDirective($timeout) {
  return {
    restrict: 'E',
    scope: {},
    controller: '$materialSidenavController',
    link: function($scope, $element, $attr, sidenavCtrl) {
      var backdrop = angular.element('<material-backdrop class="material-sidenav-backdrop">');

      $scope.$watch('isOpen', onShowHideSide);

      /**
       * Toggle the SideNav view and attach/detach listeners
       * @param isOpen
       */
      function onShowHideSide(isOpen) {
        var parent = $element.parent();

        $element.toggleClass('open', !!isOpen);

        if (isOpen) {
          parent.append(backdrop);
          backdrop.on( EVENT.CLICK, onBackdropClick );
          parent.on( EVENT.KEY_DOWN, onKeyDown );
        } else {
          backdrop.remove();
          backdrop.off( EVENT.CLICK, onBackdropClick);
          parent.off( EVENT.KEY_DOWN, onKeyDown );
        }
      }

      /**
       *  Auto-close the sideNav when the backdrop mask is clicked
       */
      function onBackdropClick() {
        close();
      }

      /**
       * Auto-close sideNav when the `escape` key is pressed.
       * @param evt
       */
      function onKeyDown(evt) {
        if(evt.which === Constant.KEY_CODE.ESCAPE){
          close();

          evt.preventDefault();
          evt.stopPropagation();
        }
      }

      /**
        * With backdrop `clicks` or `escape` key-press, immediately
       * apply the CSS close transition... Then notify the controller
       * to close() and perform its own actions.
       */
      function close() {

        onShowHideSide( false );

        $timeout(function(){
          sidenavCtrl.close();
        });
      }

    }
  };
}

/**
 * @ngdoc module
 * @name material.components.slider
 * @description Slider module!
 */
angular.module('material.components.slider', [])
  .directive('materialSlider', [
    '$window', 
    materialSliderDirective 
  ]);

/**
 * @ngdoc directive
 * @name materialSlider
 * @module material.components.slider
 * @restrict E
 *
 * @description
 * The `material-slider` directive creates a slider bar that you can use.
 *
 * Simply put a native `<input type="range">` element inside of a
 * `<material-slider>` container.
 *
 * On the range input, all HTML5 range attributes are supported.
 *
 * @usage
 * <hljs lang="html">
 * <material-slider>
 *   <input type="range" ng-model="slideValue" min="0" max="100">
 * </material-slider>
 * </hljs>
 */
function materialSliderDirective($window) {

  var MIN_VALUE_CSS = 'material-slider-min';
  var ACTIVE_CSS = 'material-active';

  function rangeSettings(rangeEle) {
    return {
      min: parseInt( rangeEle.min !== "" ? rangeEle.min : 0, 10 ),
      max: parseInt( rangeEle.max !== "" ? rangeEle.max : 100, 10 ),
      step: parseInt( rangeEle.step !== "" ? rangeEle.step : 1, 10 )
    };
  }

  return {
    restrict: 'E',
    scope: true,
    transclude: true,
    template: '<div class="material-track" ng-transclude></div>',
    link: link
  };

  // **********************************************************
  // Private Methods
  // **********************************************************

  function link(scope, element, attr) {
    var input = element.find('input');
    var ngModelCtrl = angular.element(input).controller('ngModel');

    if(!input || !ngModelCtrl || input[0].type !== 'range') return;

    var rangeEle = input[0];
    var trackEle = angular.element( element[0].querySelector('.material-track') );

    trackEle.append('<div class="material-fill"><div class="material-thumb"></div></div>');
    var fillEle = trackEle[0].querySelector('.material-fill');

    if(input.attr('step')) {
      var settings = rangeSettings(rangeEle);
      var tickCount = (settings.max - settings.min) / settings.step;
      var tickMarkersEle = angular.element('<div class="material-tick-markers"></div>');
      for(var i=0; i<tickCount; i++) {
        tickMarkersEle.append('<div class="material-tick"></div>');
      }
      if (tickCount > 0) {
        tickMarkersEle.addClass('visible');
      }
      trackEle.append(tickMarkersEle);
    }

    input.on('mousedown touchstart', function(e){
      trackEle.addClass(ACTIVE_CSS);
    });

    input.on('mouseup touchend', function(e){
      trackEle.removeClass(ACTIVE_CSS);
    });


    function render() {
      var settings = rangeSettings(rangeEle);
      var adjustedValue = parseInt(ngModelCtrl.$viewValue, 10) - settings.min;
      var fillRatio = (adjustedValue / (settings.max - settings.min));

      fillEle.style.width = (fillRatio * 100) + '%';

      if(fillRatio <= 0) {
        element.addClass(MIN_VALUE_CSS);
      } else {
        element.removeClass(MIN_VALUE_CSS);
      }

    }

    scope.$watch( function () { return ngModelCtrl.$viewValue; }, render );

  }

}


/**
 * @ngdoc module
 * @name material.components.switch
 */

angular.module('material.components.switch', [
  'material.components.checkbox',
  'material.components.radioButton',
])

.directive('materialSwitch', [
  'materialCheckboxDirective',
  'materialRadioButtonDirective',
  MaterialSwitch
]);

/**
 * @ngdoc directive
 * @module material.components.switch
 * @name materialSwitch
 * @restrict E
 *
 * The switch directive is used very much like the normal [angular checkbox](https://docs.angularjs.org/api/ng/input/input%5Bcheckbox%5D).
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} name Property name of the form under which the control is published.
 * @param {expression=} ngTrueValue The value to which the expression should be set when selected.
 * @param {expression=} ngFalseValue The value to which the expression should be set when not selected.
 * @param {string=} ngChange Angular expression to be executed when input changes due to user interaction with the input element.
 * @param {boolean=} noink Use of attribute indicates use of ripple ink effects.
 * @param {boolean=} disabled Use of attribute indicates the switch is disabled: no ink effects and not selectable
 * @param {string=} ariaLabel Publish the button label used by screen-readers for accessibility. Defaults to the switch's text.
 *
 * @usage
 * <hljs lang="html">
 * <material-switch ng-model="isActive" aria-label="Finished?">
 *   Finished ?
 * </material-switch>
 *
 * <material-switch noink ng-model="hasInk" aria-label="No Ink Effects">
 *   No Ink Effects
 * </material-switch>
 *
 * <material-switch disabled ng-model="isDisabled" aria-label="Disabled">
 *   Disabled
 * </material-switch>
 *
 * </hljs>
 */
function MaterialSwitch(checkboxDirectives, radioButtonDirectives) {
  var checkboxDirective = checkboxDirectives[0];
  var radioButtonDirective = radioButtonDirectives[0];

  return {
    restrict: 'E',
    transclude: true,
    template:
      '<div class="material-switch-bar"></div>' +
      '<div class="material-switch-thumb">' +
        radioButtonDirective.template +
      '</div>',
    require: '?ngModel', 
    compile: compile
  };

  function compile(element, attr) {
    
    var thumb = angular.element(element[0].querySelector('.material-switch-thumb'));
    //Copy down disabled attributes for checkboxDirective to use
    thumb.attr('disabled', attr.disabled);
    thumb.attr('ngDisabled', attr.ngDisabled);

    return function postLink(scope, element, attr, ngModelCtrl) {
      checkboxDirective.link(scope, thumb, attr, ngModelCtrl);
    };
  }
}

/**
 * @ngdoc module
 * @name material.components.subheader
 * @description
 * SubHeader module
 */
angular.module('material.components.subheader', ['material.components.sticky'])

.directive('materialSubheader', [
  materialSubheaderDirective
]);

/**
 * @ngdoc directive
 * @name materialSubheader
 * @module material.components.subheader
 *
 * @restrict E
 *
 * @description
 * The `<material-subheader>` directive is a subheader for a section
 *
 * @usage
 * <hljs lang="html">
 * <material-subheader>Online Friends</material-subheader>
 * </hljs>
 */

function materialSubheaderDirective() {
  return {
    restrict: 'E',
    compile: function($el, $attr) {
      var template = [
        '<h2 material-sticky class="material-subheader">',
          $el.html(),
        '</h2>'
      ].join('');

      $el.html(template);
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.tabs
 * @description
 *
 * Tabs
 */
angular.module('material.components.tabs', [
  'material.animations',
  'material.services.attrBind',
  'material.services.registry'
]);


/**
 * Conditionally configure ink bar animations when the
 * tab selection changes. If `nobar` then do not show the
 * bar nor animate.
 */
function linkTabInk(scope, element, tabsCtrl, $q, $materialEffects) {
  // TODO scope.nostretch
  if ( scope.nobar ) return;

  // Single inkBar is used for all tabs
  var tabsHeader = findNode('.tabs-header-items-container', element); // excludes paginators
  var inkBar = findNode("material-ink-bar", element);
  var lastLeft = 0;

  // Immediately place the ink bar
  updateInkBar(true);

  // Delay inkBar updates 1-frame until pagination updates...
  return updateInkBar;

  /**
   * Update the position and size of the ink bar based on the
   * specified tab DOM element. If all tabs have been removed, then
   * hide the inkBar.
   *
   * @param tab
   * @param skipAnimation
   */
  function updateInkBar( immediate ) {
    var selButton = tabsCtrl.selectedElement();
    var showInk = selButton && selButton.length && angular.isDefined(inkBar);
    var isHiding = selButton && selButton.hasClass('pagination-hide');

    var styles = { display : 'none', width : '0px' };
    var left = 0, width = 0;

    if ( !showInk || isHiding ) {
      // no animation
      inkBar.toggleClass('animate', (immediate !== true))
      .css({
        display : 'none',
        width : '0px'
      });

    } else {
      // Just a linear animation...

      width = selButton.prop('offsetWidth');
      left = tabsHeader.prop('offsetLeft') + (scope.pagingOffset || 0) + selButton.prop('offsetLeft');

      styles = {
        display : width > 0 ? 'block' : 'none',
        width: width + 'px'
      };
      styles[$materialEffects.TRANSFORM] = 'translate3d(' + left + 'px,0,0)';

      // Before we update the CSS to create a linear slide effect,
      // let's add/remove `animate` class for transition & duration

      inkBar
        .toggleClass('animate', (immediate !== true) )
        .css(styles)
    }

    // Listen for CSS transition completion and announce
    var dfd = $q.defer();
    inkBar.one( $materialEffects.TRANSITIONEND_EVENT, function() {
      dfd.resolve({ width: width, left:left });
    });

    return dfd.promise;

  }
}


/**
 * Configure pagination and add listeners for tab changes
 * and Tabs width changes...
 *
 * @returns {updatePagination}
 */
function linkTabPagination(scope, element, tabsCtrl, $q, $materialEffects ) {

  // TODO allow configuration of TAB_MIN_WIDTH
  var TAB_MIN_WIDTH = 8 * 12;           // Must match tab min-width rule in _tabs.scss
  var PAGINATORS_WIDTH = (8 * 4) * 2;   // Must match (2 * width of paginators) in scss

  var tabsHeader = findNode('.tabs-header-items-container', element); // excludes paginators
  var buttonBar = findNode('.tabs-header-items', element);
  var pagination = scope.pagination = {
    page : 0,
    next: function() {
      // selectPageAt(pagination.page + 1);
      tabsCtrl.selectAt( pagination.endIndex + 1  );
    },
    prev: function() {
      // selectPageAt(pagination.page - 1);
      tabsCtrl.selectAt( pagination.startIndex - 1  );
    }
  };

  scope.$on( EVENT.FOCUS_CHANGED, function() {

  });

  return updatePagination;

  /**
   * When the window resizes [`resize`] or the tabs are added/removed
   * [$materialTabsChanged], then calculate pagination-width and
   * update both the current page (if needed) and the tab headers width...
   *
   * @returns Promise that is resolved when the pagination transition finishes
   */
  function updatePagination() {
    var dfd = $q.defer();

    var tabs = buttonBar.children();
    var tabsWidth = element.prop('clientWidth') - PAGINATORS_WIDTH;
    var needPagination = (tabsWidth > 0) && ((TAB_MIN_WIDTH * tabs.length) > tabsWidth);
    var paginationToggled = (needPagination !== pagination.active);

    pagination.active = needPagination;

    if (needPagination) {

      pagination.pagesCount = Math.ceil((TAB_MIN_WIDTH * tabs.length) / tabsWidth);
      pagination.itemsPerPage = Math.max(1, Math.floor(tabs.length / pagination.pagesCount));
      pagination.tabWidth = tabsWidth / pagination.itemsPerPage;

      // If we just activated pagination, go to page 0 and watch the
      // selected tab index to be sure we're on the same page
      var pageIndex = getPageAtTabIndex(scope.$selIndex);
      var pageChange = (pagination.page != pageIndex);

      // Manually set width of page...
      buttonBar.css('width', pagination.tabWidth * tabs.length + 'px');

      selectPageAt( pageIndex );

      // If pagination.page changed, we need to wait for the transition to complete
      // before we announce status [and potentially update focus]

      if ( pageChange ) {

        tabsHeader.one($materialEffects.TRANSITIONEND_EVENT, function() {
            dfd.resolve(pageIndex);
        });

      } else {

        dfd.resolve(pageIndex);
      }

    } else {

      if (paginationToggled) {

        // Release buttonBar to be self-adjust to size of all tab buttons
        // Slide tab buttons to show all buttons (starting at first)

        buttonBar.css('width', '');

        selectPageAt( 0 );
      }

      dfd.resolve(0);
    }

    return dfd.promise;
  }

  /**
   * Select the specified page in the page group and
   * also change the selected the tab if the current
   * tab selected is **not** within the new page range.
   *
   * @param page
   */
  function selectPageAt(page, updateTabSelection) {
    var lastPage = pagination.pagesCount - 1;
    var lastTab = buttonBar.children().length - 1;

    if ( page < 0 ) page = 0;
    if ( page > lastPage ) page = lastPage;

    pagination.page = page;

    pagination.startIndex = !pagination.active ? 0       : page * pagination.itemsPerPage;
    pagination.endIndex   = !pagination.active ? lastTab : pagination.startIndex + pagination.itemsPerPage - 1;
    pagination.hasPrev    = !pagination.active ? false   : page > 0;
    pagination.hasNext    = !pagination.active ? false   : (page + 1) < pagination.pagesCount;

    slideTabButtons( -page * pagination.itemsPerPage * pagination.tabWidth );
  }

  /**
   * Determine the associated page for the specified tab index
   * @param tabIndex
   */
  function getPageAtTabIndex( tabIndex ) {

    var numPages = pagination.pagesCount;
    var lastTab = (pagination.itemsPerPage * pagination.pagesCount) - 1;
    var lastPage = pagination.pagesCount - 1;

    return (numPages < 1)       ? -1       :
      (tabIndex < 0)       ?  0       :
      (tabIndex > lastTab) ? lastPage : Math.floor(tabIndex / pagination.itemsPerPage);
  }

  /**
   * Perform animated CSS translation of the tab buttons container
   * @param xOffset
   */
  function slideTabButtons( xOffset ) {
    if ( scope.pagingOffset == xOffset ) return;
    if ( isNaN(xOffset) ) xOffset = 0;

    scope.pagingOffset = xOffset;
    buttonBar.css( $materialEffects.TRANSFORM, 'translate3d(' + xOffset + 'px,0,0)');
  }

  /**
   * Is the specified tabIndex with the tab range allowed
   * for the current page/pagination?
   *
   * @param tabIndex
   * @returns {boolean}
   */
  function isTabInRange( tabIndex ){
    return (tabIndex >= pagination.startIndex) &&
      (tabIndex <= pagination.endIndex);
  }

}

angular.module('material.components.tabs')
  .directive('materialTab', [ 
    '$attrBind',
    '$aria',
    '$materialInkRipple',
    TabDirective  
  ]);

/**
 * @ngdoc directive
 * @name materialTab
 * @module material.components.tabs
 * @order 1
 *
 * @restrict E
 *
 * @description
 * `<material-tab>` is the nested directive used [within `<material-tabs>`] to specify each tab with a **label** and optional *view content*
 *
 * If the `label` attribute is not specified, then an optional `<material-tab-label>` tag can be used to specified more
 * complex tab header markup. If neither the **label** nor the **material-tab-label** are specified, then the nested
 * markup of the `<material-tab>` is used as the tab header markup.
 *
 * If a tab **label** has been identified, then any **non-**`<material-tab-label>` markup
 * will be considered tab content and will be transcluded to the internal `<div class="tabs-content">` container.
 *
 * This container is used by the TabsController to show/hide the active tab's content view. This synchronization is
 * automatically managed by the internal TabsController whenever the tab selection changes. Selection changes can
 * be initiated via data binding changes, programmatic invocation, or user gestures.
 *
 * @param {string=} label Optional attribute to specify a simple string as the tab label
 * @param {boolean=} active Flag indicates if the tab is currently selected; normally the `<material-tabs selected="">`; attribute is used instead.
 * @param {boolean=} ngDisabled Flag indicates if the tab is disabled: not selectable with no ink effects
 * @param {expression=} deselected Expression to be evaluated after the tab has been de-selected.
 * @param {expression=} selected Expression to be evaluated after the tab has been selected.
 *
 *
 * @usage
 *
 * <hljs lang="html">
 * <material-tab label="" disabled="" selected="" deselected="" >
 *   <h3>My Tab content</h3>
 * </material-tab>
 *
 * <material-tab >
 *   <material-tab-label>
 *     <h3>My Tab content</h3>
 *   </material-tab-label>
 *   <p>
 *     Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
 *     totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae
 *     dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit,
 *     sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
 *   </p>
 * </material-tab>
 * </hljs>
 *
 */
function TabDirective( $attrBind, $aria, $materialInkRipple) {
  var noop = angular.noop;

  return {
    restrict: 'E',
    replace: false,
    require: "^materialTabs",
    transclude: 'true',
    scope: true,
    link: linkTab,
    template:
      '<material-tab-label></material-tab-label>'
  };

  function linkTab(scope, element, attrs, tabsCtrl, $transclude) {
    var defaults = { active: false, disabled: false, deselected: noop, selected: noop };

    // Since using scope=true for inherited new scope,
    // then manually scan element attributes for forced local mappings...

    $attrBind(scope, attrs, {
      label: '@?',
      active: '=?',
      disabled: '=?ngDisabled',
      deselected: '&onDeselect',
      selected: '&onSelect'
    }, defaults);

    scope.$watch('active', function(isActive) {
      element.toggleClass('active', isActive);
    });

    $materialInkRipple.attachButtonBehavior(element);

    configureWatchers();
    updateTabContent(scope);

    // Update ARIA values for each tab element
    configureAria(element, scope);

    element.on('click', function onRequestSelect()
      {
        // Click support for entire <material-tab /> element
        if ( !scope.disabled ) tabsCtrl.select(scope);

      })
      .on('keydown', function onRequestSelect(event)
      {
        if (event.which == Constant.KEY_CODE.SPACE )            tabsCtrl.select(scope);
        else if (event.which === Constant.KEY_CODE.LEFT_ARROW)  tabsCtrl.previous(scope);
        else if (event.which === Constant.KEY_CODE.RIGHT_ARROW) tabsCtrl.next(scope);

      });

    tabsCtrl.add(scope, element);

    // **********************************************************
    // Private Methods
    // **********************************************************


    /**
     * Inject ARIA-specific attributes appropriate for each Tab button
     */
    function configureAria( element, scope ){
      var ROLE = Constant.ARIA.ROLE;

      scope.ariaId = buildAriaID();
      $aria.update( element, {
        'id' :  scope.ariaId,
        'role' : ROLE.TAB,
        'aria-selected' : false,
        'aria-controls' : "content_" + scope.ariaId
      });

      /**
       * Build a unique ID for each Tab that will be used for WAI-ARIA.
       * Preserve existing ID if already specified.
       * @returns {*|string}
       */
      function buildAriaID() {
        return attrs.id || ( ROLE.TAB + "_" + tabsCtrl.$scope.$id + "_" + scope.$id );
      }
    }

    /**
     * Auto select the next tab if the current tab is active and
     * has been disabled.
     *
     * Set tab index for the current tab (0), with all other tabs
     * outside of the tab order (-1)
     *
     */
    function configureWatchers() {
      var unwatch = scope.$watch('disabled', function (isDisabled) {
        if (scope.active && isDisabled) {
          tabsCtrl.next(scope);
        }
      });

      scope.$watch('active', function (isActive) {

        $aria.update( element, {
          'aria-selected' : isActive,
          'tabIndex' : isActive === true ? 0 : -1
        });

      });

      scope.$on("$destroy", function () {
        unwatch();
        tabsCtrl.remove(scope);
      });
    }

    /**
     * Transpose the optional `label` attribute value or materialTabHeader or `content` body
     * into the body of the materialTabButton... all other content is saved in scope.content
     * and used by TabsController to inject into the `tabs-content` container.
     */
    function updateTabContent(scope) {
      var tab = scope;

      // Check to override label attribute with the content of the <material-tab-header> node,
      // If a materialTabHeader is not specified, then the node will be considered
      // a <material-view> content element...
      $transclude(function ( contents ) {

        // Transient references...
        tab.content = [ ];

        angular.forEach(contents, function (node) {

          if (!isNodeEmpty(node)) {
            if (isNodeType(node, 'material-tab-label')) {
              // Simulate use of `label` attribute

              tab.label = node.childNodes;

            } else {
              // Transient references...
              //
              // Attach to scope for future transclusion into materialView(s)
              // We need the bound scope for the content elements; which is NOT
              // the scope of tab or material-view container...

              tab.content.push(node);
            }
          }
        });

      });

      // Prepare to assign the materialTabButton content
      // Use the label attribute or fallback to TabHeader content

      var cntr = angular.element(element[0].querySelector('material-tab-label'));

      if (angular.isDefined(scope.label)) {
        // The `label` attribute is the default source

        cntr.append(scope.label);

        delete scope.label;

      } else {

        // NOTE: If not specified, all markup and content is assumed
        // to be used for the tab label.

        angular.forEach(scope.content, function (node) {
          cntr.append(node);
        });

        delete scope.content;
      }
    }

  }
}

angular.module('material.components.tabs')
  .factory('$materialTabs', [
    '$materialComponentRegistry',
    TabsService
  ])
  .controller('materialTabsController', [
    '$scope', 
    '$attrs', 
    '$materialComponentRegistry', 
    '$timeout',
    TabsController
  ]);


/**
 * @private
 * @ngdoc service
 * @name $materialTabs
 * @module material.components.tabs
 *
 * @description
 * $materialTabs makes it easy to programmatically interact with a specific Tabs group
 * in an app.
 *
 * @usage
 *
 * ```javascript
 * // Toggle the given sidenav
 * $materialTabs(tabsID).select(0);
 * ```
 */
function TabsService($materialComponentRegistry) {
  return function(handle) {
    var instance = $materialComponentRegistry.get(handle);
    if(!instance) {
      $materialComponentRegistry.notFoundError(handle);
    }

    return {
      /**
       * Select the tab at the specified index
       * @param index
       * @returns {*}
       */
      select: function(index) {
        return instance && instance.selectAt(index);
      }
    };
  };
}


/**
 * @ngdoc object
 * @name materialTabsController
 * @module material.components.tabs
 * @description Controller used within `<material-tabs>` to manage tab selection and iteration
 *
 * @private
 */
function TabsController($scope, $attrs, $materialComponentRegistry, $timeout ) {
  var list = Util.iterator([], false),
    componentID = "tabs" + $scope.$id,
    elements = { },
    selected = null,
    self = this;

  // Property for child access
  self.noink = !!$scope.noink;
  self.nobar = !!$scope.nobar;
  self.scope = $scope;

  // Special internal accessor to access scopes and tab `content`
  // Used by TabsDirective::buildContentItems()

  self.$scope = $scope;
  self.$$tabs = findTabs;
  self.$$hash = "";

  // Methods used by <material-tab> and children

  self.add = addTab;
  self.remove = removeTab;
  self.select = selectTab;
  self.selectAt = selectTabAt;
  self.next = selectNext;
  self.previous = selectPrevious;

  self.focusSelected = focusSelected;
  self.focusNext     = focusNext;
  self.focusPrevious = focusPrevious;

  self.selectedElement = selectedElement;

  $materialComponentRegistry.register( self, $attrs.componentId || componentID );


  /**
   * Accessor to look up the associated
   * @returns {*}
   */
  function selectedElement() {
    return findElementFor( selected );
  };


  /**
   * When the selected tab changes, broadcast notification
   */
  function onSelectedChange() {
    if (onSelectedChange.queued) return;
    onSelectedChange.queued = true;

    $scope.$evalAsync(function() {
      $scope.$broadcast(EVENT.TABS_CHANGED, selected);
      onSelectedChange.queued = false;
    });
  }


  /**
   * Make sure the currently selected tab is
   * focused. Do not! announce focus changes..
   *
   * NOTE: this is primarily used within pagination/ink updates after
   *       tab click handlers. @see tabsDirective.js
   * @returns {*}
   */
  function focusSelected() {
    return focusOn('current');
  }

  /**
   * Focus on the next enabled tab relative to `from`
   * Announce focus change with new focusIndex if appropriate
   * @param from
   */
  function focusNext(from) {
    var focusIndex = focusOn('next', from);
    if ( focusIndex != list.indexOf(selected)) {

      // Announce focus change
      $scope.$broadcast(EVENT.FOCUS_CHANGED, focusIndex);
    }
    return focusIndex;
  }

  /**
   * Focus on the previous enabled tab relative to `from`
   * Announce focus change with new focusIndex if appropriate
   * @param from
   */
  function focusPrevious(from) {
    var focusIndex = focusOn('previous', from );

    if ( focusIndex != list.indexOf(selected)) {
      // Announce focus change
      $scope.$broadcast(EVENT.FOCUS_CHANGED, focusIndex);
    }

    return focusIndex;
  }


  /**
   * Find the DOM element associated with the tab/scope
   * @param tab
   * @returns {*}
   */
  function findElementFor(tab) {
    if ( angular.isUndefined(tab) ) {
      tab = selected;
    }
    return tab ? elements[ tab.$id ] : undefined;
  }

  /**
   * Publish array of tab scope items
   * NOTE: Tabs are not required to have `contents` and the
   *       node may be undefined.
   * @returns {*} Array
   */
  function findTabs(filterBy) {
    return list.items().filter(filterBy || angular.identity);
  }

  /**
   * Create unique hashKey representing all available
   * tabs.
   */
  function updateHash() {
    self.$$hash = list.items()
      .map(function (it) {
        return it.$id;
      })
      .join(',');
  }

  /**
   * Select specified tab; deselect all others (if any selected)
   * @param tab
   */
  function selectTab(tab, noUpdate) {
    if ( tab == selected ) return;

    var activate = makeActivator(true),
      deactivate = makeActivator(false);

    // Turn off all tabs (if current active)
    angular.forEach(list.items(), deactivate);

    if ( tab != null ) {
      // Activate the specified tab (or next available)
      selected = activate(tab.disabled ? list.next(tab, isEnabled) : tab);

      // update external models and trigger databinding watchers
      $scope.$selIndex = selected ? String(selected.$index || list.indexOf(selected)) : -1;

      // update the tabs ink to indicate the selected tab
      if (!noUpdate) {
        onSelectedChange();
      }
    }

    return selected;
  }

  /**
   * Select tab based on its index position
   * @param index
   */
  function selectTabAt(index, noUpdate) {

    if (list.inRange(index)) {
      var matches = list.findBy("$index", index),
          it = matches ? matches[0] : null;

      if (it != selected) {

        // Tab must be selectable...
        if ( !isEnabled(it) ) {
          it = selectNext(it);
        }

        selectTab( it || list.first(), noUpdate );
      }
    }
  }

  /**
   * Add tab to list and auto-select; default adds item to end of list
   * @param tab
   */
  function addTab(tab, element) {

    if (angular.isUndefined(tab.$index)) {
      tab.$index = list.count();
    }

    // cache materialTab DOM element; these are not materialView elements
    elements[ tab.$id ] = element;

    if (!list.contains(tab)) {
      var pos = list.add(tab, tab.$index);

      // Should we auto-select it?
      if ($scope.$selIndex == pos || tab.active) {
        selectTab(tab);
      } else {
        onSelectedChange();
      }
    }


    updateHash();

    return tab.$index;
  }

  /**
   * Remove the specified tab from the list
   * Auto select the next tab or the previous tab (if last)
   * @param tab
   */
  function removeTab(tab) {
    if (list.contains(tab)) {

      selectTab( list.next(tab, isEnabled) || list.previous(tab, isEnabled) );
      list.remove(tab);

      onSelectedChange();
      // another tab was removed, make sure to update ink bar
      $timeout(function(){
        delete elements[tab.$id];
      },300);

    }

    updateHash();
  }

  /**
   * Focus on the specified tab (if available)
   * @returns {*} Tab
   */
  function focusOn(which, from) {
    var tab = (which === 'current' ) ? selected :
              (which === 'next')     ? list.next(from || selected, isEnabled) :
              (which === 'previous') ? list.previous(from || selected, isEnabled) : null;

    var el = findElementFor( tab );
    if ( el ) el[0].focus();

    return list.indexOf(tab);
  }

  /**
   * Select the next tab in the list or the
   * @returns {*} Tab
   */
  function selectNext(target) {
    return selectTab( list.next(target, isEnabled) || target );
  }

  /**
   * Select the previous tab
   * @returns {*} Tab
   */
  function selectPrevious(target) {
    return selectTab( list.previous(target, isEnabled) || target );
  }

  /**
   * Validation criteria for list iterator when List::next() or List::previous() is used..:
   * In this case, the list iterator should skip items that are disabled.
   * @param tab
   * @returns {boolean}
   */
  function isEnabled(tab) {
    return tab && !tab.disabled;
  }

  /**
   * Partial application to build function that will
   * mark the specified tab as active or not. This also
   * allows the `updateStatus` function to be used as an iterator.
   *
   * @param active
   */
  function makeActivator(active) {

    return function updateState(tab) {
      if (tab && (active != tab.active)) {
        tab.active = active;

        if (active) {
          selected = tab;

          tab.selected();

        } else {
          if (selected == tab) {
            selected = null;
          }

          tab.deselected();

        }
        return tab;
      }
      return null;
    };
  }

}

/* Disable Tab Pagination */
/**
 * @ngdoc module
 * @name material.components.tabs
 * @description
 *
 * Tabs
 */
angular.module('material.components.tabs')
  .directive('materialTabs', [
    '$q',
    '$window',
    '$timeout',
    '$compile',
    '$materialEffects',
    '$$rAF',
    '$aria',
    TabsDirective
  ]);

/**
 * @ngdoc directive
 * @name materialTabs
 * @module material.components.tabs
 * @order 0
 *
 * @restrict E
 *
 * @description
 * The `<material-tabs>` directive serves as the container for 1..n `<material-tab>` child directives to produces a Tabs components.
 * In turn, the nested `<material-tab>` directive is used to specify a tab label for the **header button** and a [optional] tab view
 * content that will be associated with each tab button.
 *
 * Below is the markup for its simplest usage:
 *
 *  <hljs lang="html">
 *  <material-tabs>
 *    <material-tab label="Tab #1"></material-tab>
 *    <material-tab label="Tab #2"></material-tab>
 *    <material-tab label="Tab #3"></material-tab>
 *  <material-tabs>
 *  </hljs>
 *
 * Tabs supports three (3) usage scenarios:
 *
 *  1. Tabs (buttons only)
 *  2. Tabs with internal view content
 *  3. Tabs with external view content
 *
 * **Tab-only** support is useful when tab buttons are used for custom navigation regardless of any other components, content, or views.
 * **Tabs with internal views** are the traditional usages where each tab has associated view content and the view switching is managed internally by the Tabs component.
 * **Tabs with external view content** is often useful when content associated with each tab is independently managed and data-binding notifications announce tab selection changes.
 *
 * > As a performance bonus, if the tab content is managed internally then the non-active (non-visible) tab contents are temporarily disconnected from the `$scope.$digest()` processes; which restricts and optimizes DOM updates to only the currently active tab.
 *
 * Additional features also include:
 *
 * *  Content can include any markup.
 * *  If a tab is disabled while active/selected, then the next tab will be auto-selected.
 * *  If the currently active tab is the last tab, then next() action will select the first tab.
 * *  Any markup (other than **`<material-tab>`** tags) will be transcluded into the tab header area BEFORE the tab buttons.
 *
 * @param {integer=} selected Index of the active/selected tab
 * @param {boolean=} noink Flag indicates use of ripple ink effects
 * @param {boolean=} nobar Flag indicates use of ink bar effects
 * @param {boolean=} nostretch Flag indicates use of elastic animation for inkBar width and position changes
 * @param {string=}  align-tabs Attribute to indicate position of tab buttons: bottom or top; default is `top`
 *
 * @usage
 * <hljs lang="html">
 * <material-tabs selected="selectedIndex" >
 *   <img ng-src="/img/angular.png" class="centered">
 *
 *   <material-tab
 *      ng-repeat="tab in tabs | orderBy:predicate:reversed"
 *      on-select="onTabSelected(tab)"
 *      on-deselect="announceDeselected(tab)"
 *      disabled="tab.disabled" >
 *
 *       <material-tab-label>
 *           {{tab.title}}
 *           <img src="/img/removeTab.png"
 *                ng-click="removeTab(tab)"
 *                class="delete" >
 *       </material-tab-label>
 *
 *       {{tab.content}}
 *
 *   </material-tab>
 *
 * </material-tabs>
 * </hljs>
 *
 */
function TabsDirective($q, $window, $timeout, $compile, $materialEffects, $$rAF, $aria) {

  return {
    restrict: 'E',
    replace: false,
    transclude: 'true',

    scope: {
      $selIndex: '=?selected'
    },

    compile: compileTabsFn,
    controller: [ '$scope', '$attrs', '$materialComponentRegistry', '$timeout', '$$rAF', TabsController ],

    template:
      '<div class="tabs-header" ng-class="{\'tab-paginating\': pagination.active}">' +

      '  <div class="tab-paginator prev" ng-if="pagination.active" ng-click="pagination.hasPrev && pagination.prev()" ng-class="{active: pagination.hasPrev}">' +
      '  </div>' +
      '  <div class="tabs-header-items-container">' +
      '    <div class="tabs-header-items"></div>' +
      '  </div>' +
      '  <div class="tab-paginator next" ng-if="pagination.active" ng-click="pagination.hasNext && pagination.next()" ng-class="{active: pagination.hasNext}">' +
      '  </div>' +
      '  <material-ink-bar></material-ink-bar>' +

      '</div>'+
      '<div class="tabs-content ng-hide"></div>'

  };

  /**
   * Use prelink to configure inherited scope attributes: noink, nobar, and nostretch;
   * do this before the child elements are linked.
   *
   * @param element
   * @param attr
   * @returns {{pre: materialTabsLink}}
   */
  function compileTabsFn() {

    return {
      pre: function tabsPreLink(scope, element, attrs, tabsCtrl) {
        // These attributes do not have values; but their presence defaults to value == true.
        scope.noink = angular.isDefined(attrs.noink);
        scope.nobar = angular.isDefined(attrs.nobar);
        scope.nostretch = angular.isDefined(attrs.nostretch);

        // Publish for access by nested `<material-tab>` elements
        tabsCtrl.noink = scope.noink;

        scope.$watch('$selIndex', function (index) {
          tabsCtrl.selectAt(index);
        });

        // Remove the `inkBar` element if `nobar` is defined
        var elBar = findNode("material-ink-bar",element);
        if ( elBar && scope.nobar ) {
          elBar.remove();
        }

      },
      post: function tabsPostLink(scope, element, attrs, tabsCtrl, $transclude) {
        var cache = {
          length: 0,
          contains: function (tab) {
            return !angular.isUndefined(cache[tab.$id]);
          }
        };

        var updateInk = linkTabInk(scope, element, tabsCtrl, $q, $materialEffects);
        var updatePagination = linkTabPagination( scope, element, tabsCtrl, $q, $materialEffects );

        var updateAll =  function() {

              updatePagination().then( function(){
                tabsCtrl.focusSelected();

                // Make sure the ink positioning is correct
                $timeout( updateInk );
              });

              // Make sure ink changes start just after pagination transitions have started...
              $$rAF( updateInk );
            };

        var onWindowResize = $$rAF.debounce( updateAll );
        var onWindowRelease = function() {
              angular.element($window).off('resize', onWindowResize);
            };

        angular.element($window).on( EVENT.WINDOW_RESIZE, onWindowResize);
        scope.$on( EVENT.TABS_CHANGED, updateAll );
        scope.$on( EVENT.SCOPE_DESTROY,onWindowRelease );

        transcludeHeaderItems();
        transcludeContentItems();

        configureAria();  // Update ARIA values for the Tab group (Tabs)

        alignTabButtons();
        selectDefaultTab();

        // **********************************************************
        // Private Methods
        // **********************************************************

        /**
         * Inject ARIA-specific attributes appropriate for Tab Groups
         */
        function configureAria() {
          var ROLE = Constant.ARIA.ROLE;

          $aria.update( element, {
            'id': buildAriaID(),
            'role': ROLE.TAB_LIST
          });

          /**
           * Build a unique Tabs ID for WAI-ARIA; preserve the existing ID if already
           * specified.
           * @returns {*|string}
           */
          function buildAriaID() {
            return  attrs.id || ("tabs" + "_" + scope.$id);
          }
        }


        /**
         * Change the positioning of the tab header and buttons.
         * If the tabs-align attribute is 'bottom', then the tabs-content
         * container is transposed with the tabs-header
         */
        function alignTabButtons() {
          var align  = attrs.tabsAlign || "top";
          var container = findNode('.tabs-content', element);

          if (align == "bottom") {
            element.prepend(container);
          }
        }

        /**
         * If an initial tab selection has not been specified, then
         * select the first tab by default
         */
        function selectDefaultTab() {
          var tabs = tabsCtrl.$$tabs();

          if ( tabs.length && angular.isUndefined(scope.$selIndex)) {
            tabsCtrl.select(tabs[0]);
          }
        }


        /**
         * Transclude the materialTab items into the tabsHeaderItems container
         *
         */
        function transcludeHeaderItems() {
          $transclude( function (content) {
            var header = findNode('.tabs-header-items', element);
            var parent = angular.element(element[0]);

            angular.forEach(content, function (node) {
              var intoHeader = isNodeType(node, 'material-tab') || isNgRepeat(node);

              if (intoHeader) {
                header.append(node);
              } else {
                parent.prepend(node);
              }
            });
          });
        }


        /**
         * Transclude the materialTab view/body contents into materialView containers; which
         * are stored in the tabsContent area...
         */
        function transcludeContentItems() {
          var cntr = findNode('.tabs-content', element),
              materialViewTmpl = '<div class="material-view" ng-show="active"></div>';

          scope.$watch(getTabsHash, function buildContentItems() {
            var tabs = tabsCtrl.$$tabs(notInCache),
              views = tabs.map(extractContent);

            // At least 1 tab must have valid content to build; otherwise
            // we hide/remove the tabs-content container...

            if (views.some(notEmpty)) {
              angular.forEach(views, function (content, j) {

                var tab = tabs[j++],
                  materialView = $compile(materialViewTmpl)(tab);

                // For ARIA, link the tab content container with the tab button...
                configureAria( materialView, tab );

                // Allow dynamic $digest() disconnect/reconnect of tab content's scope
                enableDisconnect(tab, content.scope);

                // Do we have content DOM nodes ?
                // If transcluded content is not undefined then add all nodes to the materialView

                if (content.nodes) {
                  angular.forEach(content.nodes, function (node) {
                    if ( !isNodeEmpty(node) ) {
                      materialView.append(node);
                    }
                  });
                }

                cntr.append(materialView);
                addToCache(cache, { tab:tab, element: materialView });

              });

              // We have some new content just added...
              showTabContent();

            } else {

              showTabContent(false);

            }


            /**
             * Add class to hide or show the container for the materialView(s)
             * NOTE: the `<div.tabs-content>` is **hidden** by default.
             * @param visible Boolean a value `true` will remove the `class="ng-hide"` setting
             */
            function showTabContent(visible) {
              cntr.toggleClass('ng-hide', !!visible);
            }

            /**
             * Configure ARIA attributes to link tab content back to their respective
             * 'owning' tab buttons.
             */
            function configureAria( cntr, tab ) {

              $aria.update( cntr, {
                'id' : "content_" + tab.ariaId,
                'role' : Constant.ARIA.ROLE.TAB_PANEL,
                'aria-labelledby' : tab.ariaId
              });

            }

          });

          /**
           * Allow tabs to disconnect or reconnect their content from the $digest() processes
           * when unselected or selected (respectively).
           *
           * @param content Special content scope which is a direct child of a `tab` scope
           */
          function enableDisconnect(tab,  content) {
            if ( !content ) return;

            var selectedFn = angular.bind(tab, tab.selected),
                deselectedFn = angular.bind(tab, tab.deselected);

            addDigestConnector(content);

            // 1) Tail-hook deselected()
            tab.deselected = function() {
              deselectedFn();
              tab.$$postDigest(function(){
                content.$disconnect();
              });
            };

             // 2) Head-hook selected()
            tab.selected = function() {
              content.$reconnect();
              selectedFn();
            };

            // Immediate disconnect all non-actives
            if ( !tab.active ) {
              tab.$$postDigest(function(){
                content.$disconnect();
              });
            }
          }

          /**
           * Add tab scope/DOM node to the cache and configure
           * to auto-remove when the scope is destroyed.
           * @param cache
           * @param item
           */
          function addToCache(cache, item) {
            var scope = item.tab;

            cache[ scope.$id ] = item;
            cache.length = cache.length + 1;

            // When the tab is removed, remove its associated material-view Node...
            scope.$on("$destroy", function () {
              angular.element(item.element).remove();

              delete cache[ scope.$id];
              cache.length = cache.length - 1;
            });
          }

          function getTabsHash() {
            return tabsCtrl.$$hash;
          }

          /**
           * Special function to extract transient data regarding transcluded
           * tab content. Data includes dynamic lookup of bound scope for the transcluded content.
           *
           * @see TabDirective::updateTabContent()
           *
           * @param tab
           * @returns {{nodes: *, scope: *}}
           */
          function extractContent(tab) {
            var content = hasContent(tab) ? tab.content : undefined;
            var scope   = (content && content.length) ? angular.element(content[0]).scope() : null;

            // release immediately...
            delete tab.content;

            return { nodes:content, scope:scope };
          }

          function hasContent(tab) {
            return tab.content && tab.content.length;
          }

          function notEmpty(view) {
            var hasContent = false;
            if (angular.isDefined(view.nodes)) {
              angular.forEach(view.nodes, function(node) {
                hasContent = hasContent || !isNodeEmpty(node);
              });
            }
            return hasContent;
          }

          function notInCache(tab) {
            return !cache.contains(tab);
          }
        }

      }
    };

  }
}


/**
 * Determine if the DOM element is of a certain tag type
 * or has the specified attribute type
 *
 * @param node
 * @returns {*|boolean}
 */
var isNodeType = function (node, type) {
  return node.tagName && (
    node.hasAttribute(type) ||
    node.hasAttribute('data-' + type) ||
    node.tagName.toLowerCase() === type ||
    node.tagName.toLowerCase() === 'data-' + type
  );
};

var isNgRepeat = function (node) {
  var COMMENT_NODE = 8;
  return node.nodeType == COMMENT_NODE && node.nodeValue.indexOf('ngRepeat') > -1;
};

/**
 * Is the an empty text string
 * @param node
 * @returns {boolean}
 */
var isNodeEmpty = function (node) {
  var TEXT_NODE = 3,
      COMMENT_NODE = 8;
  return (node.nodeType == COMMENT_NODE) ||
    (node.nodeType == TEXT_NODE && !(node.nodeValue || '').trim());
};

function findNode(selector, element) {
  var parentNode = element[0];
  return angular.element(parentNode.querySelector(selector));
}

/*
 *  This function() provides scope-relative features to disconnect and reconnect to the $digest() processes
 *  NOTE: this is essentially a reversible $destroy() for scopes.
 *
 *  Detaching the scope would mean:
 *
 *    Detaching the scope from the scope's current parent so that watchers no
 *    longer fire when the scope's current parent's $digest is called
 *
 *  On re-attaching to a DOM element (as a child):
 *
 *    It would be attached as he child scope of the DOM element. This is useful
 *    for optimizations such as not running watchers on hidden DOM (that could be detached).
 *
 *  @see https://github.com/angular/angular.js/issues/5301
 *
 */
function addDigestConnector (scope) {
  var disconnect = function () {

    // we can't destroy the root scope or a scope that has been already destroyed
    if (this.$root === this) return;
    if (this.$$destroyed ) return;

    var parent = this.$parent;
    this.$$disconnected = true;

    // See Scope.$destroy
    if (parent.$$childHead === this) parent.$$childHead = this.$$nextSibling;
    if (parent.$$childTail === this) parent.$$childTail = this.$$prevSibling;
    if (this.$$prevSibling) this.$$prevSibling.$$nextSibling = this.$$nextSibling;
    if (this.$$nextSibling) this.$$nextSibling.$$prevSibling = this.$$prevSibling;

    this.$$nextSibling = this.$$prevSibling = null;
  };
  var reconnect = function () {

    // we can't disconnect the root node or scope already disconnected
    if (this.$root === this) return;
    if (!this.$$disconnected) return;

    var child = this;

    var parent = child.$parent;
    child.$$disconnected = false;
    // See Scope.$new for this logic...
    child.$$prevSibling = parent.$$childTail;
    if (parent.$$childHead) {
      parent.$$childTail.$$nextSibling = child;
      parent.$$childTail = child;
    } else {
      parent.$$childHead = parent.$$childTail = child;
    }
  };

  scope.$disconnect = angular.bind( scope, disconnect );
  scope.$reconnect  = angular.bind( scope, reconnect );

  return scope;
}

/**
 * @ngdoc module
 * @name material.components.toast
 * @description
 * Toast
 */
angular.module('material.components.toast', ['material.services.compiler'])
  .directive('materialToast', [
    QpToastDirective
  ])
  .factory('$materialToast', [
    '$timeout',
    '$rootScope',
    '$materialCompiler',
    '$rootElement',
    '$animate',
    QpToastService
  ]);

function QpToastDirective() {
  return {
    restrict: 'E'
  };
}

/**
 * @ngdoc service
 * @name $materialToast
 * @module material.components.toast
 *
 * @description
 * Open a toast notification on any position on the screen, with an optional 
 * duration.
 *
 * Only one toast notification may ever be active at any time. If a new toast is
 * shown while a different toast is active, the old toast will be automatically
 * hidden.
 *
 * `$materialToast` takes one argument, options, which is defined below.
 *
 * @usage
 * <hljs lang="html">
 * <div ng-controller="MyController">
 *   <material-button ng-click="openToast()">
 *     Open a Toast!
 *   </material-button>
 * </div>
 * </hljs>
 * <hljs lang="js">
 * var app = angular.module('app', ['ngMaterial']);
 * app.controller('MyController', function($scope, $materialToast) {
 *   $scope.openToast = function($event) {
 *     var hideToast = $materialToast({
 *       template: '<material-toast>Hello!</material-toast>',
 *       duration: 3000
 *     });
 *   };
 * });
 * </hljs>
 *
 * @returns {function} `hideToast` - A function that hides the toast.
 *
 * @paramType Options
 * @param {string=} templateUrl The url of an html template file that will
 * be used as the content of the toast. Restrictions: the template must
 * have an outer `material-toast` element.
 * @param {string=} template Same as templateUrl, except this is an actual
 * template string.
 * @param {number=} duration How many milliseconds the toast should stay
 * active before automatically closing.  Set to 0 to disable duration. 
 * Default: 3000.
 * @param {string=} position Where to place the toast. Available: any combination
 * of 'bottom', 'left', 'top', 'right', 'fit'. Default: 'bottom left'.
 * @param {string=} controller The controller to associate with this toast.
 * The controller will be injected the local `$hideToast`, which is a function
 * used to hide the toast.
 * @param {string=} locals An object containing key/value pairs. The keys will
 * be used as names of values to inject into the controller. For example, 
 * `locals: {three: 3}` would inject `three` into the controller with the value
 * of 3.
 * @param {object=} resolve Similar to locals, except it takes promises as values
 * and the toast will not open until the promises resolve.
 * @param {string=} controllerAs An alias to assign the controller to on the scope.
 */
function QpToastService($timeout, $rootScope, $materialCompiler, $rootElement, $animate) {
  var recentToast;
  function toastOpenClass(position) {
    return 'material-toast-open-' + 
      (position.indexOf('top') > -1 ? 'top' : 'bottom');
  }

  // If the $rootElement is the document (<html> element), be sure to append it to the
  // body instead.
  var toastParent = $rootElement.find('body');
  if ( !toastParent.length ) {
    toastParent = $rootElement;
  }

  return showToast;

  /**
   * TODO fully document this
   * Supports all options from $materialPopup, in addition to `duration` and `position`
   */
  function showToast(options) {
    options = angular.extend({
      // How long to keep the toast up, milliseconds
      duration: 3000,
      // [unimplemented] Whether to disable swiping
      swipeDisabled: false,
      // Supports any combination of these class names: 'bottom top left right fit'. 
      // Default: 'bottom left'
      position: 'bottom left',
    }, options || {});

    recentToast && recentToast.then(function(destroy) { destroy(); });

    recentToast = $materialCompiler.compile(options).then(function(compileData) {
      // Controller will be passed a `$hideToast` function
      compileData.locals.$hideToast = destroy;
      
      var scope = $rootScope.$new();
      var element = compileData.link(scope);

      var toastParentClass = toastOpenClass(options.position);
      element.addClass(options.position);
      toastParent.addClass(toastParentClass);

      var delayTimeout;
      $animate.enter(element, toastParent, null, function() {
        if (options.duration) {
          delayTimeout = $timeout(destroy, options.duration);
        }
      });

      var hammertime = new Hammer(element[0], {
        recognizers: [
          [Hammer.Swipe, { direction: Hammer.DIRECTION_HORIZONTAL }]
        ]
      });
      hammertime.on('swipeleft swiperight', onSwipe);
      
      function onSwipe(ev) {
        //Add swipeleft/swiperight class to element so it can animate correctly
        element.addClass(ev.type);
        $timeout(destroy);
      }

      return destroy;

      function destroy() {
        if (destroy.called) return;
        destroy.called = true;

        hammertime.destroy();
        toastParent.removeClass(toastParentClass);
        $timeout.cancel(delayTimeout);
        $animate.leave(element, function() {
          scope.$destroy();
        });
      }
    });

    return recentToast;
  }
}

/**
 * @ngdoc module
 * @name material.components.toolbar
 */
angular.module('material.components.toolbar', [
  'material.components.content',
  'material.animations'
])
  .directive('materialToolbar', [
    '$$rAF',
    '$materialEffects',
    materialToolbarDirective
  ]);

/**
 * @ngdoc directive
 * @name materialToolbar
 * @restrict E
 * @description
 * `material-toolbar` is used to place a toolbar in your app.
 *
 * Toolbars are usually used above a content area to display the title of the
 * current page, and show relevant action buttons for that page.
 *
 * You can change the height of the toolbar by adding either the
 * `material-medium-tall` or `material-tall` class to the toolbar.
 *
 * @usage
 * <hljs lang="html">
 * <div layout="vertical" layout-fill>
 *   <material-toolbar>
 *
 *     <div class="material-toolbar-tools">
 *       <span>My App's Title</span>
 *
 *       <!-- fill up the space between left and right area -->
 *       <span flex></span>
 *
 *       <material-button>
 *         Right Bar Button
 *       </material-button>
 *     </div>
 *
 *   </material-toolbar>
 *   <material-content>
 *     Hello!
 *   </material-content>
 * </div>
 * </hljs>
 *
 * @param {boolean=} scrollShrink Whether the header should shrink away as 
 * the user scrolls down, and reveal itself as the user scrolls up. 
 *
 * Note: for scrollShrink to work, the toolbar must be a sibling of a 
 * `material-content` element, placed before it. See the scroll shrink demo.
 */ 
function materialToolbarDirective($$rAF, $materialEffects) {

  return {
    restrict: 'E',
    controller: angular.noop,
    link: function(scope, element, attr) {

      if (angular.isDefined(attr.scrollShrink)) {
        setupScrollShrink();
      }

      function setupScrollShrink() {
        //makes it take X times as long for header to dissapear
        var HEIGHT_FACTOR = 2; 
        var height = element.prop("offsetHeight") * HEIGHT_FACTOR;
        // Current "y" position of scroll
        var y = 0;
        // Store the last scroll top position
        var prevScrollTop = 0;

        // Wait for $materialContentLoaded event from materialContent directive.
        // If the materialContent element is a sibling of our toolbar, hook it up
        // to scroll events.
        scope.$on('$materialContentLoaded', onMaterialContentLoad);

        var contentElement;
        function onMaterialContentLoad($event, contentEl) {

          if (Util.elementIsSibling(element, contentEl)) {
            // unhook old content event listener if exists
            contentElement && contentElement.off('scroll', onContentScroll);
            contentEl.on('scroll', onContentScroll).css('position','relative');
            contentElement = contentEl;
          }

        }

        function onContentScroll(e) {
          shrink(e.target.scrollTop);
          prevScrollTop = e.target.scrollTop;
        }

        // Shrink the given target element based on the scrolling
        // of the scroller element.
        function shrink(scrollTop) {
          y = Math.min(height, Math.max(0, y + scrollTop - prevScrollTop));
          // If we are scrolling back "up", show the header condensed again
          // if (prevScrollTop > scrollTop && scrollTop > margin) {
          //   y = Math.max(y, margin);
          // }
          $$rAF(transform);
        }

        function transform() {
          var translate = y ?
            'translate3d(0,' + (-y / HEIGHT_FACTOR) + 'px, 0)' : 
            '';
          element.css($materialEffects.TRANSFORM, translate);
          contentElement.css('margin-top', y ?
                             (-y / HEIGHT_FACTOR) + 'px' :
                            '');
        }
      }

    }
  };

}

angular.module('material.components.whiteframe', []);

/**
 * @ngdoc module
 * @name material.components.divider
 * @description Divider module!
 */
angular.module('material.components.divider', [
  'material.animations',
  'material.services.aria'
])
  .directive('materialDivider', MaterialDividerDirective);

function MaterialDividerController(){}

/**
 * @ngdoc directive
 * @name materialDivider
 * @module material.components.divider
 * @restrict E
 *
 * @description
 * Dividers group and separate content within lists and page layouts using strong visual and spatial distinctions. This divider is a thin rule, lightweight enough to not distract the user from content.
 *
 * @param {boolean=} inset Add this attribute to activate the inset divider style.
 * @usage
 * <hljs lang="html">
 * <material-divider></material-divider>
 *
 * <material-divider inset></material-divider>
 * </hljs>
 *
 */
function MaterialDividerDirective() {
  return {
    restrict: 'E',
    controller: [MaterialDividerController]
  };
}

angular.module('material.decorators', [])
.config(['$provide', function($provide) {
  $provide.decorator('$$rAF', ['$delegate', '$rootScope', rAFDecorator]);

  function rAFDecorator($$rAF, $rootScope) {

    /**
     * Use this to debounce events that come in often.
     * The debounced function will always use the *last* invocation before the
     * coming frame.
     *
     * For example, window resize events that fire many times a second:
     * If we set to use an raf-debounced callback on window resize, then
     * our callback will only be fired once per frame, with the last resize
     * event that happened before that frame.
     *
     * @param {function} callback function to debounce
     * @param {boolean=} invokeApply If set to false skips dirty checking, otherwise will invoke fn within the $apply block.
     */
    $$rAF.debounce = function(cb, invokeApply) {
      if (arguments.length === 1) {
        invokeApply = true;
      }
      var queueArgs, alreadyQueued, queueCb, context;
      return function debounced() {
        queueArgs = arguments;
        context = this;
        queueCb = cb;
        if (!alreadyQueued) {
          alreadyQueued = true;
          $$rAF(function() {
            invokeApply ? 
              $rootScope.$apply(function() {
                queueCb.apply(context, queueArgs);
              }) :
                queueCb.apply(context, queueArgs);
            alreadyQueued = false;
          });
        }
      };
    };

    return $$rAF;
  }
}]);

angular.module('material.services.aria', [])

.service('$aria', [
  '$log',
  AriaService
]);

function AriaService($log) {
  var messageTemplate = 'ARIA: Attribute "%s", required for accessibility, is missing on "%s"!';
  var defaultValueTemplate = 'Default value was set: %s="%s".';

  return {

    expect : expectAttribute,
    update : assignAttributes
  };

  /**
   * Assign 1..n ARIA values to the target element
   * @param element
   * @param options
   */
  function assignAttributes(element, options )
  {
    angular.forEach(options, Util.spread(function( attrValue, attrName ) {
       element.attr(attrName,  attrValue);
    }));

    return element;
  }

  /**
   * Check if expected ARIA has been specified on the target element
   * @param element
   * @param attrName
   * @param defaultValue
   */
  function expectAttribute(element, attrName, defaultValue) {

    var node = element[0];
    if (!node.hasAttribute(attrName)) {
      var hasDefault = angular.isDefined(defaultValue);

      if (hasDefault) {
        defaultValue = String(defaultValue).trim();
        // $log.warn(messageTemplate + ' ' + defaultValueTemplate,
        //           attrName, getTagString(node), attrName, defaultValue);
        element.attr(attrName, defaultValue);
      } else {
        // $log.warn(messageTemplate, attrName, getTagString(node));
      }
    }
  }



  /**
   * Gets the tag definition from a node's outerHTML
   * @example getTagDefinition(
   *   '<material-button foo="bar">Hello</material-button>'
   * ) // => '<material-button foo="bar">'
   */
  function getTagString(node) {
    var html = node.outerHTML;
    var closingIndex = html.indexOf('>');
    return html.substring(0, closingIndex + 1);
  }
}

angular.module('material.services.attrBind', [
])
  .factory('$attrBind', [
    '$parse', 
    '$interpolate', 
    MaterialAttrBind 
  ]);

/**
 *  This service allows directives to easily databind attributes to private scope properties.
 *
 * @private
 */
function MaterialAttrBind($parse, $interpolate) {
  var LOCAL_REGEXP = /^\s*([@=&])(\??)\s*(\w*)\s*$/;

  return function (scope, attrs, bindDefinition, bindDefaults) {
    angular.forEach(bindDefinition || {}, function (definition, scopeName) {
      //Adapted from angular.js $compile
      var match = definition.match(LOCAL_REGEXP) || [],
        attrName = match[3] || scopeName,
        mode = match[1], // @, =, or &
        parentGet,
        unWatchFn;

      switch (mode) {
        case '@':   // One-way binding from attribute into scope

          attrs.$observe(attrName, function (value) {
            scope[scopeName] = value;
          });
          attrs.$$observers[attrName].$$scope = scope;

          if (!bypassWithDefaults(attrName, scopeName)) {
            // we trigger an interpolation to ensure
            // the value is there for use immediately
            scope[scopeName] = $interpolate(attrs[attrName])(scope);
          }
          break;

        case '=':   // Two-way binding...

          if (!bypassWithDefaults(attrName, scopeName)) {
            // Immediate evaluation
            scope[scopeName] = (attrs[attrName] === "") ? true : scope.$eval(attrs[attrName]);

            // Data-bind attribute to scope (incoming) and
            // auto-release watcher when scope is destroyed

            unWatchFn = scope.$watch(attrs[attrName], function (value) {
              scope[scopeName] = value;
            });
            scope.$on('$destroy', unWatchFn);
          }

          break;

        case '&':   // execute an attribute-defined expression in the context of the parent scope

          if (!bypassWithDefaults(attrName, scopeName, angular.noop)) {
            /* jshint -W044 */
            if (attrs[attrName] && attrs[attrName].match(RegExp(scopeName + '\(.*?\)'))) {
              throw new Error('& expression binding "' + scopeName + '" looks like it will recursively call "' +
                attrs[attrName] + '" and cause a stack overflow! Please choose a different scopeName.');
            }

            parentGet = $parse(attrs[attrName]);
            scope[scopeName] = function (locals) {
              return parentGet(scope, locals);
            };
          }

          break;
      }
    });

    /**
     * Optional fallback value if attribute is not specified on element
     * @param scopeName
     */
    function bypassWithDefaults(attrName, scopeName, defaultVal) {
      if (!angular.isDefined(attrs[attrName])) {
        var hasDefault = bindDefaults && bindDefaults.hasOwnProperty(scopeName);
        scope[scopeName] = hasDefault ? bindDefaults[scopeName] : defaultVal;
        return true;
      }
      return false;
    }

  };
}

angular.module('material.services.compiler', [
])
  .service('$materialCompiler', [
    '$q',
    '$http',
    '$injector',
    '$compile',
    '$controller',
    '$templateCache',
    materialCompilerService
  ]);

function materialCompilerService($q, $http, $injector, $compile, $controller, $templateCache) {

  /**
   * @ngdoc service
   * @name $materialCompiler
   * @module material.services.compiler
   *
   * @description
   * The $materialCompiler service is an abstraction of angular's compiler, that allows the developer
   * to easily compile an element with a templateUrl, controller, and locals.
   */

   /**
    * @ngdoc method
    * @name $materialCompiler#compile
    * @param {object} options An options object, with the following properties:
    *
    *    - `controller` â€“ `{(string=|function()=}` â€“ Controller fn that should be associated with
    *      newly created scope or the name of a {@link angular.Module#controller registered
    *      controller} if passed as a string.
    *    - `controllerAs` â€“ `{string=}` â€“ A controller alias name. If present the controller will be
    *      published to scope under the `controllerAs` name.
    *    - `template` â€“ `{string=}` â€“ html template as a string or a function that
    *      returns an html template as a string which should be used by {@link
    *      ngRoute.directive:ngView ngView} or {@link ng.directive:ngInclude ngInclude} directives.
    *      This property takes precedence over `templateUrl`.
    *
    *    - `templateUrl` â€“ `{string=}` â€“ path or function that returns a path to an html
    *      template that should be used by {@link ngRoute.directive:ngView ngView}.
    *
    *    - `transformTemplate` â€“ `{function=} â€“ a function which can be used to transform
    *      the templateUrl or template provided after it is fetched.  It will be given one
    *      parameter, the template, and should return a transformed template.
    *
    *    - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
    *      be injected into the controller. If any of these dependencies are promises, the compiler
    *      will wait for them all to be resolved or one to be rejected before the controller is
    *      instantiated.
    *
    *      - `key` â€“ `{string}`: a name of a dependency to be injected into the controller.
    *      - `factory` - `{string|function}`: If `string` then it is an alias for a service.
    *        Otherwise if function, then it is {@link api/AUTO.$injector#invoke injected}
    *        and the return value is treated as the dependency. If the result is a promise, it is
    *        resolved before its value is injected into the controller.
    *
    * @returns {object=} promise A promsie which will be resolved with a `compileData` object,
    * with the following properties:
    *
    *   - `{element}` â€“ `element` â€“ an uncompiled angular element compiled using the provided template.
    *   
    *   - `{function(scope)}`  â€“ `link` â€“ A link function, which, when called, will compile
    *     the elmeent and instantiate options.controller.
    *
    *   - `{object}` â€“ `locals` â€“ The locals which will be passed into the controller once `link` is
    *     called.
    *
    * @usage
    * $materialCompiler.compile({
    *   templateUrl: 'modal.html',
    *   controller: 'ModalCtrl',
    *   locals: {
    *     modal: myModalInstance;
    *   }
    * }).then(function(compileData) {
    *   compileData.element; // modal.html's template in an element
    *   compileData.link(myScope); //attach controller & scope to element
    * });
    */
  this.compile = function(options) {
    var templateUrl = options.templateUrl;
    var template = options.template || '';
    var controller = options.controller;
    var controllerAs = options.controllerAs;
    var resolve = options.resolve || {};
    var locals = options.locals || {};
    var transformTemplate = options.transformTemplate || angular.identity;

    // Take resolve values and invoke them.  
    // Resolves can either be a string (value: 'MyRegisteredAngularConst'),
    // or an invokable 'factory' of sorts: (value: function ValueGetter($dependency) {})
    angular.forEach(resolve, function(value, key) {
      if (angular.isString(value)) {
        resolve[key] = $injector.get(value);
      } else {
        resolve[key] = $injector.invoke(value);
      }
    });
    //Add the locals, which are just straight values to inject
    //eg locals: { three: 3 }, will inject three into the controller
    angular.extend(resolve, locals);

    if (templateUrl) {
      resolve.$template = $http.get(templateUrl, {cache: $templateCache})
        .then(function(response) {
          return response.data;
        });
    } else {
      resolve.$template = $q.when(template);
    }

    // Wait for all the resolves to finish if they are promises
    return $q.all(resolve).then(function(locals) {

      var template = transformTemplate(locals.$template);
      var element = angular.element('<div>').html(template).contents();
      var linkFn = $compile(element);

      //Return a linking function that can be used later when the element is ready
      return {
        locals: locals,
        element: element,
        link: function link(scope) {
          locals.$scope = scope;

          //Instantiate controller if it exists, because we have scope
          if (controller) {
            var ctrl = $controller(controller, locals);
            //See angular-route source for this logic
            element.data('$ngControllerController', ctrl);
            element.children().data('$ngControllerController', ctrl);

            if (controllerAs) {
              scope[controllerAs] = ctrl;
            }
          }

          return linkFn(scope);
        }
      };
    });
  };
}

/**
 * Adapted from ui.bootstrap.position
 * https://github.com/angular-ui/bootstrap/blob/master/src/position/position.js
 * https://github.com/angular-ui/bootstrap/blob/master/LICENSE
 */

angular.module('material.services.position', [])
  .factory('$position', [
    '$document', 
    '$window', 
    MaterialPositionService
  ]);

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
function MaterialPositionService($document, $window) {
  function getStyle(el, cssprop) {
    if (el.currentStyle) { //IE
      return el.currentStyle[cssprop];
    } else if ($window.getComputedStyle) {
      return $window.getComputedStyle(el)[cssprop];
    }
    // finally try and get inline style
    return el.style[cssprop];
  }

  /**
   * Checks if a given element is statically positioned
   * @param element - raw DOM element
   */
  function isStaticPositioned(element) {
    return (getStyle(element, 'position') || 'static' ) === 'static';
  }

  /**
   * returns the closest, non-statically positioned parentOffset of a given element
   * @param element
   */
  var parentOffsetEl = function (element) {
    var docDomEl = $document[0];
    var offsetParent = element.offsetParent || docDomEl;
    while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
      offsetParent = offsetParent.offsetParent;
    }
    return offsetParent || docDomEl;
  };

  return {
    /**
     * Provides read-only equivalent of jQuery's position function:
     * http://api.jquery.com/position/
     */
    position: function (element) {
      var elBCR = this.offset(element);
      var offsetParentBCR = { top: 0, left: 0 };
      var offsetParentEl = parentOffsetEl(element[0]);
      if (offsetParentEl != $document[0]) {
        offsetParentBCR = this.offset(angular.element(offsetParentEl));
        offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
        offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
      }

      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: elBCR.top - offsetParentBCR.top,
        left: elBCR.left - offsetParentBCR.left
      };
    },

    /**
     * Provides read-only equivalent of jQuery's offset function:
     * http://api.jquery.com/offset/
     */
    offset: function (element) {
      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
        left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
      };
    },

    /**
     * Provides coordinates for the targetEl in relation to hostEl
     */
    positionElements: function (hostEl, targetEl, positionStr, appendToBody) {

      var positionStrParts = positionStr.split('-');
      var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

      var hostElPos,
      targetElWidth,
      targetElHeight,
      targetElPos;

      hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

      targetElWidth = targetEl.prop('offsetWidth');
      targetElHeight = targetEl.prop('offsetHeight');

      var shiftWidth = {
        center: function () {
          return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
        },
        left: function () {
          return hostElPos.left;
        },
        right: function () {
          return hostElPos.left + hostElPos.width;
        }
      };

      var shiftHeight = {
        center: function () {
          return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
        },
        top: function () {
          return hostElPos.top;
        },
        bottom: function () {
          return hostElPos.top + hostElPos.height;
        }
      };

      switch (pos0) {
        case 'right':
          targetElPos = {
          top: shiftHeight[pos1](),
          left: shiftWidth[pos0]()
        };
        break;
        case 'left':
          targetElPos = {
          top: shiftHeight[pos1](),
          left: hostElPos.left - targetElWidth
        };
        break;
        case 'bottom':
          targetElPos = {
          top: shiftHeight[pos0](),
          left: shiftWidth[pos1]()
        };
        break;
        default:
          targetElPos = {
          top: shiftHeight[pos0](),
          left: shiftWidth[pos1]()
        };
        break;
      }

      return targetElPos;
    }
  };
}

/**
 * @ngdoc overview
 * @name material.services.registry
 *
 * @description
 * A component registry system for accessing various component instances in an app.
 */
angular.module('material.services.registry', [
])
  .factory('$materialComponentRegistry', [
    '$log', 
    materialComponentRegistry 
  ]);

/**
 * @ngdoc service
 * @name material.services.registry.service:$materialComponentRegistry
 *
 * @description
 * $materialComponentRegistry enables the user to interact with multiple instances of
 * certain complex components in a running app.
 */
function materialComponentRegistry($log) {
  var instances = [];

  return {
    /**
     * Used to print an error when an instance for a handle isn't found.
     */
    notFoundError: function(handle) {
      $log.error('No instance found for handle', handle);
    },
    /**
     * Return all registered instances as an array.
     */
    getInstances: function() {
      return instances;
    },

    /**
     * Get a registered instance.
     * @param handle the String handle to look up for a registered instance.
     */
    get: function(handle) {
      var i, j, instance;
      for(i = 0, j = instances.length; i < j; i++) {
        instance = instances[i];
        if(instance.$$materialHandle === handle) {
          return instance;
        }
      }
      return null;
    },

    /**
     * Register an instance.
     * @param instance the instance to register
     * @param handle the handle to identify the instance under.
     */
    register: function(instance, handle) {
      instance.$$materialHandle = handle;
      instances.push(instance);

      return function deregister() {
        var index = instances.indexOf(instance);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      };
    },
  }
}


angular.module('material.services.throttle', [ ])
  .factory('$throttle', [
    '$timeout',
    '$$q',
    '$log', 
    MaterialThrottleService
  ]);
  /**
   *   var ripple, watchMouse,
   *       parent = element.parent(),
   *       makeRipple = $throttle({
   *         start : function() {
   *           ripple = ripple || $materialEffects.inkRipple( element[0], options );
   *           watchMouse = watchMouse || buildMouseWatcher(parent, makeRipple);
   *           // Ripples start with mouseDow (or taps)
   *           parent.on('mousedown', makeRipple);
   *         },
   *         throttle : function(e, done) {
   *           if ( effectAllowed() )
   *           {
   *             switch(e.type)
   *             {
   *               case 'mousedown' :
   *                 watchMouse(true);
   *                 ripple.createAt( options.forceToCenter ? null : localToCanvas(e) );
   *                 break;
   *               default:
   *                 watchMouse(false);
   *                 ripple.draw( localToCanvas(e) );
   *                 break;
   *             }
   *           } else {
   *             done();
   *           }
   *         },
   *         end : function() {
   *           watchMouse(false);
   *         }
   *       });
   *
   *   makeRipple();
   *
   */
function MaterialThrottleService($timeout, $$q, $log) {

  var STATE_READY= 0, STATE_START=1, STATE_THROTTLE=2, STATE_END=3;

  return function( config ){
    return function( done, otherwise ){
      return buildInstance( angular.extend({}, config), done || angular.noop, otherwise || angular.noop );
    };
  };

  function buildInstance( phases, done, otherwise ) {
    var pendingActions = [ ],
        cancel = angular.noop,
        state = STATE_READY;

    // Defer the call to the start function ... so `throttle` reference can be returned...
    $timeout(function(){
      start().then(function(){
         if ( !phases.throttle ) {
           end();
         }
      });
    },0,false);

    return throttle;

    /**
     * Facade function that validates throttler
     * state BEFORE processing the `throttle` request.
     */
    function throttle( data, done ) {

      if ( state != STATE_THROTTLE ) {
          cacheRquest();
      }

      switch( state )
      {
        case STATE_READY :
          start();
          break;

        case STATE_START:
          break;

        // Proxy throttle call to custom, user-defined throttle handler
        case STATE_THROTTLE:
          invokeThrottleHandler(data, done);
          break;

        case STATE_END :
          restart();
          break;
      }

      // **********************************************************
      // Internal Methods
      // **********************************************************

      /**
       *  Cache for later submission to 'throttle()'
       */
      function cacheRquest() {
        pendingActions.push({ data:data, done:done });
      }

      /**
       * Delegate to the custom throttle function...
       * When CTF reports complete, then proceed to the `end` state
       *
       * @param data  Data to be delegated to the throttle function
       * @param done  Callback when all throttle actions have completed
       */
      function invokeThrottleHandler(data, done) {

        if ( angular.isFunction(phases.throttle) ) {
          done = done || angular.noop;

          try {

            phases.throttle.apply( null, [data, function(response) {
              done.apply( null, [response] );
              end();
            }]);

          } catch( error ) {
            // Report error... and end()

            otherwise(error);
            end();
          }

        } else {
          end();
        }
      }
    }


    /**
     * Initiate the async `start` phase of the Throttler
     * @returns {*} promise
     */
    function start() {
      return gotoState.apply(null, [ STATE_START, phases.start ] )
                      .then( feedPendingActions, otherwise );

      /**
       * Process all pending actions (if any)
       */
      function feedPendingActions( response ) {
        logResponse(response);

        state = STATE_THROTTLE;

        angular.forEach(pendingActions, function (it) {
          throttle( it.data, function(response) {
            logResponse(response);

            if ( angular.isFunction(it.done) ) {
              it.done(response);
            }
          });
        });

        pendingActions = [ ];
      }
    }

    /**
     * Initiate the async `end` phase of the Throttler
     * @returns {*} promise
     */
    function end() {

      return gotoState.apply(null,[ STATE_END, phases.end ])
                      .then( finish, otherwise );

      /**
       * Mark throttle as ready to start... and announce completion
       * of the current activity cycle
       */
      function finish( response ) {
        logResponse(response);

        if ( state == STATE_END ){
          state = STATE_READY;
          done();
        }
      }

    }

    /**
     * Cancel any `end` process and restart state machine processes
     */
    function restart() {
      try {

        if ( !angular.isFunction(cancel) ) {
          cancel = angular.noop;
        }

        cancel();
        state = STATE_READY;

      } finally {

        start();
      }
    }

    /**
     * Change to next state and call the state function associated with that state...
     * @param nextState
     * @param targetFn
     * @returns {*}
     */
    function gotoState( nextState , targetFn  )
    {

      var dfd = $$q.defer(),
          hasFn = angular.isFunction(targetFn),
          goNext = hasFn && (targetFn.length < 1),
          fn = hasFn ? targetFn : resolved;

      try {

        state = nextState;

        cancel = fn.apply( null, [
          goNext ? resolved(dfd) :
          hasFn ? callbackToResolve(dfd) : dfd
        ]);

      } catch( error ) {
        dfd.reject( error );
      }

      return dfd.promise;
    }

  }

  // **********************************************************
  // Internal Methods
  // **********************************************************

  /**
   * Create callback function that will resolve the specified deferred.
   * @param dfd
   * @returns {Function}
   */
  function callbackToResolve( dfd )
  {
    return function(response){
      dfd.resolve.apply(null, [response ]);
    };
  }

  /**
   * Prepare fallback promise for start, end, throttle phases of the Throttler
   * @param dfd
   * @returns {*}
   */
  function resolved(dfd)
  {
    dfd = dfd || $$q.defer();
    dfd.resolve.apply(null, arguments.length > 1 ? [].slice.call(arguments,1) : [ ]);

    return dfd.promise;
  }

  function logResponse(response)
  {
    if ( angular.isDefined(response) ) {
      $log.debug(response);
    }
  }
}

})();