(function() {
  "use strict";
  angular.module('app').factory('AuthInterceptor', AuthInterceptor);
  
  function AuthInterceptor($window) {
    var auth = {
      request: function(config) {
        if($window.localStorage.getItem('token')) {
          config.headers.authorization = "Bearer " + $window.localStorage.getItem('token');
        }
        return config;
      }
    };
    return auth;
  }
})();
