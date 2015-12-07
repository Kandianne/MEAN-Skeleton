"use strict";
let express           = require('express'),
    https             = require('https'),
    router            = express.Router(),
    mongoose          = require('mongoose'),
    passport          = require('passport'),
    User              = mongoose.model('User'),
    uuid              = require('uuid'),
    jwt               = require('express-jwt'),
    google            = require('googleapis'),
    Twitter           = require('node-twitter-api'),
    OAuth2            = google.auth.OAuth2,
    plus              = google.plus('v1'),
    TWITTER_CONNECT   = {},
    GOOGLE_CONNECT    = {},
    GOOGLE_SCOPES     = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];
let auth = jwt({
  userProperty: 'payload',
  secret: process.env.AUTH_SECRET
});
let twitter = new Twitter({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callback: process.env.TWITTER_CONNECT_CALLBACK
});

//#############################################
//## LOCAL ####################################
//#############################################
router.post('/Register', passport.authenticate('local-signup'), (req, res) => {
  res.send({
    token: req.tempUser.generateJWT()
  });
});
router.post('/Login', passport.authenticate('local-login'), (req, res) => {
  res.send({
    token: req.tempUser.generateJWT()
  });
});

router.post('/connect/local', auth, (req, res, next) => {
  User.findOne({
    'local.email': req.body.email
  }).exec((err, user) => {
    if(err) return next(err);
    if(user) return next({err: `User already found with the email: ${req.body.email}.`, custom: true});
  });
  User.findOne({
    _id: req.payload._id
  }).exec((err, user) => {
    user.local.email = req.body.email;
    user.primaryEmail = req.body.email;
    user.setPassword(req.body.password, (err) => {
      if (err) return next(err);
      user.save((err) => {
        if (err) return next(err);
        res.send({
          token: user.generateJWT()
        });
      });
    });
  });
});

//#############################################
//## FACEBOOK #################################
//#############################################
router.get('/auth/facebook',  passport.authenticate('facebook', {
  scope: ['email']
}));
router.get('/auth/facebook/callback',  passport.authenticate('facebook', {
  failureRedirect: '/Login'
}), (req, res) => {
  // if (req.isAuthenticated()) {
    res.redirect('/?code=' + req.user.generateJWT());
  // } else {
    // res.status(403).send("You are not authenticated.");
  // }
});

router.post('/connect/facebook/', auth, (req, res, next) => {
  https.get(`https://graph.facebook.com/v2.5/me?access_token=${req.body.accessToken}&format=json&method=get&fields=email%2Cname%2Cid%2Cgender%2Clink&pretty=0&suppress_http_code=1`, (response) => {
    response.on('data', (d) => {
      d = JSON.parse(d);
      if (!d.error) {
        User.findOne({
          _id: req.payload._id
        }).exec((err, user) => {
          user.facebook.id = d.id;
          user.facebook.email = d.email;
          user.facebook.name = d.name;
          user.facebook.token = req.body.accessToken;
          user.facebook.profileUrl = d.link;
          user.facebook.gender = d.link;
          user.primaryEmail = user.primaryEmail || d.email;
          user.save((err) => {
            if (err) return next(err);
            res.send({
              token: user.generateJWT()
            });
          });
        });
      }
    });
  }).on('error', (e) => {
    console.log(`Got error: ${e.message}`);
    return res.next(e);
  });
});

//#############################################
//## GOOGLE ###################################
//#############################################
router.get('/auth/google', passport.authenticate('google', {
  scope: GOOGLE_SCOPES.join(" ")
}));
router.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/Login'
}), (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/?code=' + req.user.generateJWT());
  } else res.status(403).send('You are not authenticated.');
});

router.get('/connect/google', auth, (req, res) => {
  let oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CONNECT_CALLBACK);
  let state = uuid.v4();
  GOOGLE_CONNECT[state] = {
    userID: req.payload._id
  };
  let url = oauth2Client.generateAuthUrl({
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
router.get('/connect/google/callback', (req, res, next) => {
  let oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CONNECT_CALLBACK);
  let code = JSON.parse(req.query.state).security_code;
  if (!GOOGLE_CONNECT[code]) return next(`Could not find a user for Code: ${code}`);
  let userID = GOOGLE_CONNECT[code].userID;
  oauth2Client.getToken(req.query.code, (err, tokens) => {
    if (err) return next(err);
    oauth2Client.setCredentials(tokens);
    plus.people.get({
      userId: "me",
      auth: oauth2Client
    }, (err, response) => {
      if (err) return next(err);
      User.findOne({
        _id: userID
      }).exec((err, user) => {
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
        res.redirect(`/Account?code=${user.generateJWT()}&provider=Google`);
      });
    });
  });
});


//#############################################
//## TWITTER ##################################
//#############################################
router.get('/auth/twitter', passport.authenticate('twitter'));
router.get('/auth/twitter/callback', passport.authenticate('twitter', {
  failureRedirect: '/Login'
}), (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/?code=' + req.user.generateJWT());
  } else res.status(403).send('You are not authenticated.');
});

//Twitter authorization routes
router.get('/connect/twitter', auth, (req, res, next) => {
  twitter.getRequestToken((err, requestToken, requestSecret) => {
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
router.get('/access-token', (req, res, next) => {
  let requestToken = req.query.oauth_token;
  let verifier = req.query.oauth_verifier;
  let connect_user = TWITTER_CONNECT[requestToken];
  if (!connect_user) return next(`could not find connect_user with token of ${requestToken}`);

  twitter.getAccessToken(requestToken, connect_user.requestSecret, verifier, (err, accessToken, accessSecret) => {
    if (err) return next(err);
    else
      twitter.verifyCredentials(accessToken, accessSecret, (err, user) => {
        if (err) return next(err);
        let twit = {
          id: user.id,
          token: accessToken,
          userName: user.screen_name,
          displayName: user.name,
          location: user.location,
          profile_photo: user.profile_image_url
        };
        User.findOne({
          _id: connect_user.userID
        }, (err, newUser) => {
          if (err) return next(err);
          newUser.twitter = twit;
          newUser.save();
          delete TWITTER_CONNECT[requestToken];
          res.redirect(`/Account?code=${newUser.generateJWT()}&provider=Twitter`);
        });
      });
  });
});

//#############################################
//## DISCONNECT ###############################
//#############################################
router.put('/disconnect/:provider', auth, (req, res, next) => {
  let provider = req.params.provider;
  User.findOne({
    _id: req.payload._id
  }).exec((err, user) => {
    if (typeof user[provider] !== "object") return next(`Provider: ${provider} has been passed in, and does not exist.`);
    let count = 0;
    if (!user.local.email) count++;
    if (!user.facebook.token) count++;
    if (!user.google.token) count++;
    if (!user.twitter.token) count++;
    if (count === 3) return next(`Cannot disconnect from all accounts. Please look into deleting your account.`);

    if (provider === 'local') {
      user.validatePassword(req.body.password, (err, isMatch) => {
        if (err) return next(err);
        if (!isMatch) return res.status(400).send({
          err: `Your password must match to disconnect the local account.`
        });
        user.local.email = null;
        user.local.password = null;
        user.save((err) => {
          if (err) return next(err);
          return res.send({
            token: user.generateJWT()
          });
        });
      });
    } else if (provider === 'google' || provider === 'facebook' || provider === 'twitter') {
      user[provider].token = null;
      user.save((err) => {
        if (err) return next(err);
        res.send({
          token: user.generateJWT()
        });
      });
    } else {
      return next(`Provider: ${provider} does not exist on the user.`);
    }
  });
});

function Base64EncodeUrl(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}

// function Base64DecodeUrl(str) {
//   str = (str + '===').slice(0, str.length + (str.length % 4));
//   return str.replace(/-/g, '+').replace(/_/g, '/');
// }

module.exports = router;
