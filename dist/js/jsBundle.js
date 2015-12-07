(function () {
    "use strict";
    angular.module('app', ['ui.router', 'ngMaterial', 'ngMdIcons', 'ngMessages', 'ngFacebook']).config(Config).run(fb);

    function Config($stateProvider, $urlRouterProvider, $httpProvider, $urlMatcherFactoryProvider, $locationProvider, $facebookProvider) {
        $urlMatcherFactoryProvider.caseInsensitive(true);
        $urlMatcherFactoryProvider.strictMode(false);
        $stateProvider.state('Home', {
            url: '/',
            templateUrl: 'templates/home.html',
            controller: 'HomeController as vm'
        });

        $urlRouterProvider.otherwise('/');
        $locationProvider.html5Mode(true);
        $facebookProvider.setPermissions('email');
        $facebookProvider.setAppId(838183259630461);
    }

    function fb() {
        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s);
            js.id = id;
            js.src = "//connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }
})();

/**
 * Angular Facebook service
 * ---------------------------
 *
 * Authored by  AlmogBaku (GoDisco)
 *              almog@GoDisco.net
 *              http://www.GoDisco.net/
 *
 * 9/8/13 10:25 PM
 */

angular.module('ngFacebook', []).provider('$facebook', function () {
    var config = {
        permissions: 'email',
        appId: null,
        version: 'v1.0',
        customInit: {}
    };

    this.setAppId = function (appId) {
        config.appId = appId;
        return this;
    };
    this.getAppId = function () {
        return config.appId;
    };
    this.setVersion = function (version) {
        config.version = version;
        return this;
    };
    this.getVersion = function () {
        return config.version;
    };
    this.setPermissions = function (permissions) {
        if (permissions instanceof Array) {
            permissions.join(',');
        }
        config.permissions = permissions;
        return this;
    };
    this.getPermissions = function () {
        return config.permissions;
    };
    this.setCustomInit = function (customInit) {
        if (angular.isDefined(customInit.appId)) {
            this.setAppId(customInit.appId);
        }
        config.customInit = customInit;
        return this;
    };
    this.getCustomInit = function () {
        return config.customInit;
    };

    this.$get = ['$q', '$rootScope', '$window', function ($q, $rootScope, $window) {
        var $facebook = $q.defer();
        $facebook.config = function (property) {
            return config[property];
        };

        //Initialization
        $facebook.init = function () {
            if ($facebook.config('appId') == null) throw "$facebookProvider: `appId` cannot be null";

            $window.FB.init(
            angular.extend({
                appId: $facebook.config('appId'),
                version: $facebook.config('version')
            }, $facebook.config("customInit")));
            $rootScope.$broadcast("fb.load", $window.FB);
        };

        $rootScope.$on("fb.load", function (e, FB) {
            $facebook.resolve(FB);

            //Define action events
            angular.forEach(['auth.login', 'auth.logout', 'auth.prompt', 'auth.sessionChange', 'auth.statusChange', 'auth.authResponseChange', 'xfbml.render', 'edge.create', 'edge.remove', 'comment.create', 'comment.remove', 'message.send'], function (event) {
                FB.Event.subscribe(event, function (response) {
                    $rootScope.$broadcast("fb." + event, response, FB);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });
            });

            // Make sure 'fb.auth.authResponseChange' fires even if the user is not logged in.
            $facebook.getLoginStatus();
        });

        /**
         * Internal cache
         */
        $facebook._cache = {};
        $facebook.setCache = function (attr, val) {
            $facebook._cache[attr] = val;
        };
        $facebook.getCache = function (attr) {
            if (angular.isUndefined($facebook._cache[attr])) return false;
            return $facebook._cache[attr];
        };
        $facebook.clearCache = function () {
            $facebook._cache = {};
        };

        /**
         * Authentication
         */

        var firstAuthResp = $q.defer();
        var firstAuthRespReceived = false;

        function resolveFirstAuthResp(FB) {
            if (!firstAuthRespReceived) {
                firstAuthRespReceived = true;
                firstAuthResp.resolve(FB);
            }
        }

        $facebook.setCache("connected", null);
        $facebook.isConnected = function () {
            return $facebook.getCache("connected");
        };
        $rootScope.$on("fb.auth.authResponseChange", function (event, response, FB) {
            $facebook.clearCache();

            if (response.status == "connected") {
                $facebook.setCache("connected", true);
            } else {
                $facebook.setCache("connected", false);
            }
            resolveFirstAuthResp(FB);
        });

        $facebook.getAuthResponse = function () {
            return FB.getAuthResponse();
        };
        $facebook.getLoginStatus = function (force) {
            var deferred = $q.defer();

            return $facebook.promise.then(function (FB) {
                FB.getLoginStatus(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        deferred.resolve(response);
                        if ($facebook.isConnected() == null) $rootScope.$broadcast("fb.auth.authResponseChange", response, FB);
                    }
                    if (!$rootScope.$$phase) $rootScope.$apply();
                }, force);
                return deferred.promise;
            });
        };
        $facebook.login = function (permissions, rerequest) {
            if (permissions == undefined) permissions = $facebook.config("permissions");
            var deferred = $q.defer();

            var loginOptions = {
                scope: permissions
            };
            if (rerequest) {
                loginOptions.auth_type = 'rerequest';
            }

            return $facebook.promise.then(function (FB) {
                FB.login(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                }, loginOptions);
                return deferred.promise;
            });
        };
        $facebook.logout = function () {
            var deferred = $q.defer();

            return $facebook.promise.then(function (FB) {
                FB.logout(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(response);
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });
                return deferred.promise;
            });
        };
        $facebook.ui = function (params) {
            var deferred = $q.defer();

            return $facebook.promise.then(function (FB) {
                FB.ui(params, function (response) {
                    if (response && response.error_code) {
                        deferred.reject(response.error_message);
                    } else {
                        deferred.resolve(response);
                    }
                    if (!$rootScope.$$phase) $rootScope.$apply();
                });
                return deferred.promise;
            });
        };
        $facebook.api = function () {
            var deferred = $q.defer();
            var args = arguments;
            args[args.length++] = function (response) {
                if (response.error) deferred.reject(response.error);
                if (response.error_msg) deferred.reject(response);
                else deferred.resolve(response);
                if (!$rootScope.$$phase) $rootScope.$apply();
            };

            return firstAuthResp.promise.then(function (FB) {
                FB.api.apply(FB, args);
                return deferred.promise;
            });
        };

        /**
         * API cached request - cached request api with promise
         *
         * @param path
         * @returns $q.defer.promise
         */
        $facebook.cachedApi = function () {
            if (typeof arguments[0] !== 'string') throw "$facebook.cacheApi can works only with graph requests!";

            var promise = $facebook.getCache(arguments[0]);
            if (promise) return promise;

            var result = $facebook.api.apply($facebook, arguments);
            $facebook.setCache(arguments[0], result);

            return result;
        };

        return $facebook;
    }];
}).run(['$rootScope', '$window', '$facebook', function ($rootScope, $window, $facebook) {
    $window.fbAsyncInit = function () {
        $facebook.init();
        if (!$rootScope.$$phase) $rootScope.$apply();
    };
}]);

(function () {
    "use strict";
    angular.module('app').controller('HomeController', HomeController);

    function HomeController() {
        var vm = this;
    }
})();

(function () {
    "use strict";
    angular.module('app').factory('AuthInterceptor', AuthInterceptor);

    function AuthInterceptor($window) {
        var auth = {
            request: function (config) {
                if ($window.localStorage.getItem('token')) {
                    config.headers.authorization = "Bearer " + $window.localStorage.getItem('token');
                }
                return config;
            }
        };
        return auth;
    }
})();

(function () {
    'use strict';
    angular.module('app').factory('UserFactory', UserFactory);

    function UserFactory($http, $q, $window) {
        var status = {};
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
            $http.post('/api/Users/Register', user).then(function (res) {
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
            $http.post('/api/Users/Login', u).then(function (res) {
                setToken(res.data.token);
                setUser();
                q.resolve();
            }, function (res) {
                if (res.data.err) q.reject(res.data.err);
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
            $http.get('/api/Users/profile').then(function (res) {
                q.resolve(res.data);
            }, function () {
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
            $http.post('/api/Users/connect/facebook', info).then(function (res) {
                setToken(res.data.token);
                setUser();
                q.resolve(res);
            }, function (err) {
                q.reject(err);
            });
            return q.promise;
        }

        function connectTwitter() {
            var q = $q.defer();
            $http.get('/api/Users/connect/twitter').then(function (res) {
                console.log(res);
                q.resolve(res.data.token);
            }, function (res) {
                console.error(res);
            });
            return q.promise;
        }

        function connectGoogle() {
            var q = $q.defer();
            $http.get('/api/Users/connect/google').then(function (res) {
                q.resolve(res.data.url);
            }, function (err) {
                console.log(err);
                q.reject(err);
            });
            return q.promise;
        }

        function connectLocal(user) {
            var q = $q.defer();
            $http.post('/api/Users/connect/local', user).then(function (res) {
                setToken(res.data.token);
                setUser();
                q.resolve();
            }, function (err) {
                if (typeof err.data === 'object') err = err.data.err;
                q.reject(err);
            });
            return q.promise;
        }

        function disconnectFromProvider(provider, pass) {
            var q = $q.defer();
            $http.put('/api/Users/disconnect/' + provider, {
                password: pass
            }).then(function (res) {
                setToken(res.data.token);
                setUser();
                q.resolve();
            }, function (err) {
                if (err.data.err) q.reject(err.data.err);
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