(function() {
  "use strict";
  angular.module('app').controller('RegisterController', RegisterController);
  function RegisterController($state, UserFactory) {
      var vm = this;
      vm.user = {};

      vm.register = function() {
        UserFactory.register(vm.user).then(function() {
          $state.go('Home');
        });
      };
  }
})();
