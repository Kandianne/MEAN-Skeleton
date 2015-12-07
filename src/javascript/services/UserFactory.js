(function() {
  'use strict';
  angular.module('app')
    .factory('UserFactory', UserFactory);

  function UserFactory($http, $q, $window) {
    var status = { };
    var o = {
      status: status,
      register: register,
      login: login,
      logout: logout,
      externalLogin: externalLogin,
      getUser: getUser,
      connectFacebook: connectFacebook,
      connectTwitter: connectTwitter,
      connectGoogle: connectGoogle,
      connectLocal: connectLocal,
      disconnectFromProvider: disconnectFromProvider,
      setToken: setToken,
      setUser: setUser
    };
    if (getToken()) setUser();
    return o;

    function register(user) {
      var q = $q.defer();
      $http.post('/api/Users/Register', user).then(function(res) {
        setToken(res.data.token);
        setUser();
        q.resolve();
      });
      return q.promise;
    }

    function login(user) {
      var u = {
        email: user.email.toLowerCase(),
        password: user.password
      };
      var q = $q.defer();
      $http.post('/api/Users/Login', u).then(function(res) {
        setToken(res.data.token);
        setUser();
        q.resolve();
      }, function(res) {
        if(res.data.err) q.reject(res.data.err);
        else q.reject();
      });
      return q.promise;
    }

    function externalLogin(token) {
      setToken(token);
      setUser();
    }

    function logout() {
      clearUser();
      removeToken();
    }

    function getUser() {
      var q = $q.defer();
      $http.get('/api/Users/profile').then(function(res) {
        q.resolve(res.data);
      }, function() {
        q.reject();
      });
      return q.promise;
    }

    function setToken(token) {
      $window.localStorage.setItem('token', token);
    }

    function getToken() {
      return $window.localStorage.getItem('token');
    }

    function removeToken() {
      $window.localStorage.removeItem('token');
    }

    function setUser() {
      var user = JSON.parse(urlBase64Decode(getToken().split('.')[1]));
      status.username = user.username;
      status._id = user._id;
      status.email = user.email;
      status.isLoggedIn = true;
      status.facebook = user.facebook;
      status.twitter = user.twitter;
      status.google = user.google;
      status.local = user.local;
    }

    function connectFacebook(info) {
      var q = $q.defer();
      $http.post('/api/Users/connect/facebook', info).then(function(res) {
        setToken(res.data.token);
        setUser();
        q.resolve(res);
      }, function(err) {
        q.reject(err);
      });
      return q.promise;
    }

    function connectTwitter() {
      var q = $q.defer();
      $http.get('/api/Users/connect/twitter').then(function(res) {
        console.log(res);
        q.resolve(res.data.token);
      }, function(res) {
        console.error(res);
      });
      return q.promise;
    }

    function connectGoogle() {
      var q = $q.defer();
      $http.get('/api/Users/connect/google').then(function(res) {
        q.resolve(res.data.url);
      }, function(err) {
        console.log(err);
        q.reject(err);
      });
      return q.promise;
    }

    function connectLocal(user) {
      var q = $q.defer();
      $http.post('/api/Users/connect/local', user).then(function(res) {
        setToken(res.data.token);
        setUser();
        q.resolve();
      }, function(err) {
        if(typeof err.data === 'object') err = err.data.err;
        q.reject(err);
      });
      return q.promise;
    }

    function disconnectFromProvider(provider, pass) {
      var q = $q.defer();
      $http.put('/api/Users/disconnect/' + provider, {password: pass}).then(function(res) {
        setToken(res.data.token);
        setUser();
        q.resolve();
      }, function(err) {
        if(err.data.err) q.reject(err.data.err);
        else q.reject();
      });
      return q.promise;
    }

    function clearUser() {
      status.username = null;
      status.email = null;
      status._id = null;
      status.isLoggedIn = false;
      status.facebook = false;
      status.twitter = false;
      status.google = false;
      status.local = false;
    }

    function urlBase64Decode(str) {
      var output = str.replace(/-/g, '+').replace(/_/g, '/');
      switch (output.length % 4) {
        case 0:
            break;
        case 2:
            output += '==';
            break;
        case 3:
            output += '=';
            break;
        default:
            throw 'Illegal base64url string!';
      }
      return decodeURIComponent(encodeURIComponent($window.atob(output))); //polifyll https://github.com/davidchambers/Base64.js
    }
  }
})();
