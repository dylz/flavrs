app.directive('ig', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      fid: '@'
    },
    template: 
      '<material-input-group>' +
        '<label for="input-{{fid}}" class="title-me">{{fid}}</label>' +
        '<material-input id="input-{{fid}}" type="text" ng-model="data.description">' +
      '</material-input-group>'
  };
});