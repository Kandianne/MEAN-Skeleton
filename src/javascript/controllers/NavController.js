(function() {
  "use strict";
  angular.module('app').controller('NavController', NavController);
  function NavController(UserFactory, $state) {
      var vm = this;
      vm.status = UserFactory.status;

      vm.logout = function() {
        UserFactory.logout()
        $state.go('Home');
      };
  }
})();
