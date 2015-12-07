(function() {
  "use strict";
  angular.module('app', ['ui.router', 'ngMaterial', 'ngMdIcons', 'ngMessages', 'ngFacebook'])
    .config(Config)
		.run(fb);

  function Config($stateProvider, $urlRouterProvider, $httpProvider, $urlMatcherFactoryProvider, $locationProvider, $facebookProvider) {
    $urlMatcherFactoryProvider.caseInsensitive(true);
    $urlMatcherFactoryProvider.strictMode(false);
    $stateProvider.state('Home', {
      url: '/',
      templateUrl: 'templates/home.html',
      controller: 'HomeController as vm'
    }).state('Login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginController as vm'
    }).state('Register', {
      url: '/register',
      templateUrl: 'templates/register.html',
      controller: 'RegisterController as vm'
    });

    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(true);
    $facebookProvider.setPermissions('email');
    $facebookProvider.setAppId(838183259630461);
  }

  function fb() {
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = "//connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }
})();
