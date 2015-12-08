"use strict";
var express = require('express');
var https = require('https');
var mongoose = require('mongoose');
var passport = require('passport');
var uuid = require('uuid');
var jwt = require('express-jwt');
var google = require('googleapis');
var Twitter = require('node-twitter-api');
var router = express.Router(), User = mongoose.model('User'), OAuth2 = google.auth.OAuth2, plus = google.plus('v1'), TWITTER_CONNECT = {}, GOOGLE_CONNECT = {}, GOOGLE_SCOPES = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];
var auth = jwt({
    userProperty: 'payload',
    secret: process.env.AUTH_SECRET
});
var twitter = new Twitter({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callback: process.env.TWITTER_CONNECT_CALLBACK
});
router.post('/Register', passport.authenticate('local-signup'), function (req, res) {
    res.send({
        token: req['tempUser'].generateJWT()
    });
});
router.post('/Login', passport.authenticate('local-login'), function (req, res) {
    res.send({
        token: req['tempUser'].generateJWT()
    });
});
router.post('/connect/local', auth, function (req, res, next) {
    User.findOne({
        'local.email': req.body.email
    }).exec(function (err, user) {
        if (err)
            return next(err);
        if (user)
            return next({ err: "User already found with the email: " + req.body.email + ".", custom: true });
    });
    User.findOne({
        _id: req.payload._id
    }).exec(function (err, user) {
        user.local.email = req.body.email;
        user.primaryEmail = req.body.email;
        user.setPassword(req.body.password, function (err) {
            if (err)
                return next(err);
            user.save(function (err) {
                if (err)
                    return next(err);
                res.send({
                    token: user.generateJWT()
                });
            });
        });
    });
});
router.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));
router.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/Login'
}), function (req, res) {
    res.redirect('/?code=' + req.user.generateJWT());
});
router.post('/connect/facebook/', auth, function (req, res, next) {
    https.get("https://graph.facebook.com/v2.5/me?access_token=" + req.body.accessToken + "&format=json&method=get&fields=email%2Cname%2Cid%2Cgender%2Clink&pretty=0&suppress_http_code=1", function (response) {
        response.on('data', function (d) {
            d = JSON.parse(d);
            if (!d.error) {
                User.findOne({
                    _id: req.payload._id
                }).exec(function (err, user) {
                    user.facebook.id = d.id;
                    user.facebook.email = d.email;
                    user.facebook.name = d.name;
                    user.facebook.token = req.body.accessToken;
                    user.facebook.profileUrl = d.link;
                    user.facebook.gender = d.link;
                    user.primaryEmail = user.primaryEmail || d.email;
                    user.save(function (err) {
                        if (err)
                            return next(err);
                        res.send({
                            token: user.generateJWT()
                        });
                    });
                });
            }
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
        return res.next(e);
    });
});
router.get('/auth/google', passport.authenticate('google', {
    scope: GOOGLE_SCOPES.join(" ")
}));
router.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/Login'
}), function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/?code=' + req.user.generateJWT());
    }
    else
        res.status(403).send('You are not authenticated.');
});
router.get('/connect/google', auth, function (req, res) {
    var oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CONNECT_CALLBACK);
    var state = uuid.v4();
    GOOGLE_CONNECT[state] = {
        userID: req.payload._id
    };
    var url = oauth2Client.generateAuthUrl({
        access_type: 'online',
        scope: GOOGLE_SCOPES,
        state: Base64EncodeUrl(JSON.stringify({
            security_code: state
        }))
    });
    res.send({
        url: url
    });
});
router.get('/connect/google/callback', function (req, res, next) {
    var oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CONNECT_CALLBACK);
    var code = JSON.parse(req.query.state).security_code;
    if (!GOOGLE_CONNECT[code])
        return next("Could not find a user for Code: " + code);
    var userID = GOOGLE_CONNECT[code].userID;
    oauth2Client.getToken(req.query.code, function (err, tokens) {
        if (err)
            return next(err);
        oauth2Client.setCredentials(tokens);
        plus.people.get({
            userId: "me",
            auth: oauth2Client
        }, function (err, response) {
            if (err)
                return next(err);
            User.findOne({
                _id: userID
            }).exec(function (err, user) {
                user.google.id = response.id;
                user.google.token = tokens.access_token;
                user.google.name = response.name.givenName + " " + response.name.familyName;
                user.google.email = (response.emails[0]) ? response.emails[0].value : "";
                user.google.occupation = response.occupation;
                user.google.skills = response.skills;
                user.google.gender = response.gender;
                user.google.url = response.url;
                user.google.profile_photo = response.image.url;
                user.google.displayName = response.displayName;
                user.google.organizations = response.organizations;
                user.google.urls = response.urls;
                user.google.emails = response.emails;
                user.primaryEmail = user.primaryEmail || user.google.email;
                user.save();
                res.redirect("/Account?code=" + user.generateJWT() + "&provider=Google");
            });
        });
    });
});
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback', passport.authenticate('twitter', {
    failureRedirect: '/Login'
}), function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect('/?code=' + req.user.generateJWT());
    }
    else
        res.status(403).send('You are not authenticated.');
});
router.get('/connect/twitter', auth, function (req, res, next) {
    twitter.getRequestToken(function (err, requestToken, requestSecret) {
        if (err)
            return next(err);
        else {
            TWITTER_CONNECT[requestToken] = {
                requestSecret: requestSecret,
                userID: req.payload._id
            };
            res.send({
                token: requestToken
            });
        }
    });
});
router.get('/access-token', function (req, res, next) {
    var requestToken = req.query.oauth_token;
    var verifier = req.query.oauth_verifier;
    var connect_user = TWITTER_CONNECT[requestToken];
    if (!connect_user)
        return next("could not find connect_user with token of " + requestToken);
    twitter.getAccessToken(requestToken, connect_user.requestSecret, verifier, function (err, accessToken, accessSecret) {
        if (err)
            return next(err);
        else
            twitter.verifyCredentials(accessToken, accessSecret, function (err, user) {
                if (err)
                    return next(err);
                var twit = {
                    id: user.id,
                    token: accessToken,
                    userName: user.screen_name,
                    displayName: user.name,
                    location: user.location,
                    profile_photo: user.profile_image_url
                };
                User.findOne({
                    _id: connect_user.userID
                }, function (err, newUser) {
                    if (err)
                        return next(err);
                    newUser.twitter = twit;
                    newUser.save();
                    delete TWITTER_CONNECT[requestToken];
                    res.redirect("/Account?code=" + newUser.generateJWT() + "&provider=Twitter");
                });
            });
    });
});
router.put('/disconnect/:provider', auth, function (req, res, next) {
    var provider = req.params.provider;
    User.findOne({
        _id: req.payload._id
    }).exec(function (err, user) {
        if (typeof user[provider] !== "object")
            return next("Provider: " + provider + " has been passed in, and does not exist.");
        var count = 0;
        if (!user.local.email)
            count++;
        if (!user.facebook.token)
            count++;
        if (!user.google.token)
            count++;
        if (!user.twitter.token)
            count++;
        if (count === 3)
            return next("Cannot disconnect from all accounts. Please look into deleting your account.");
        if (provider === 'local') {
            user.validatePassword(req.body.password, function (err, isMatch) {
                if (err)
                    return next(err);
                if (!isMatch)
                    return res.status(400).send({
                        err: "Your password must match to disconnect the local account."
                    });
                user.local.email = null;
                user.local.password = null;
                user.save(function (err) {
                    if (err)
                        return next(err);
                    return res.send({
                        token: user.generateJWT()
                    });
                });
            });
        }
        else if (provider === 'google' || provider === 'facebook' || provider === 'twitter') {
            user[provider].token = null;
            user.save(function (err) {
                if (err)
                    return next(err);
                res.send({
                    token: user.generateJWT()
                });
            });
        }
        else {
            return next("Provider: " + provider + " does not exist on the user.");
        }
    });
});
function Base64EncodeUrl(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}
module.exports = router;
