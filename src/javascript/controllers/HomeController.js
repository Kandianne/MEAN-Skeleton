(function() {
  "use strict";
  angular.module('app').controller('HomeController', HomeController);

  function HomeController($location, UserFactory) {
    var vm = this;
    var params = $location.search();
    if (params.code) {
      UserFactory.setToken(params.code);
			UserFactory.setUser();
			$location.search('code', null);
    }
  }
})();
