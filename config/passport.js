"use strict";
let passport = require('passport');
let LocalStrategy = require('passport-local').Strategy;
let FacebookStrategy = require('passport-facebook').Strategy;
let TwitterStrategy = require('passport-twitter').Strategy;
let GoogleStrategy = require('passport-google-oauth2').Strategy
let mongoose = require('mongoose');
let User = mongoose.model('User');

passport.serializeUser((user, done) => {
  /* istanbul ignore next */
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  /* istanbul ignore next */
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

// =========================================================================
// LOCAL ===================================================================
// =========================================================================
passport.use('local-signup', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, (req, email, password, done) => {
  if(!email) return done({err: `Email field is required.`, custom: true, status: 400});
  if(!password) return done({err: `Password field is required.`, custom: true, status: 400});
  process.nextTick(() => {
    User.findOne({
      'local.email': email
    }, (err, user) => {
      /* istanbul ignore next */
      if (err)
        return done(err);
      if (user) {
        return done({
          err: `User with an email of ${email} already exists in the database.`,
          custom: true,
          status: 400
        });
      } else {
        let newUser = new User();
        newUser.local.email = email;
        newUser.primaryEmail = email;
        newUser.createHash(password, (err, hash) => {
          /* istanbul ignore next */
          if (err) return done(err);
          newUser.password = hash;
          newUser.save((err) => {
            /* istanbul ignore next */
            if (err) return done(err);
            req.tempUser = newUser;
            return done(null, newUser);
          });
        });
      }
    });
  })
}));


passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, (req, email, password, done) => {
  if(!email) return done({err: `An email is required.`, custom: true, status: 400});
  if(!password) return done({err: `A password is required.`, custom: true, status: 400});
  process.nextTick(() => {
    User.findOne({
      'local.email': email
    }, (err, user) => {
      /* istanbul ignore next */
      if (err) return done(err);
      if (!user) return done({
        err: `A user with that email does not exist.`,
        custom: true
      });
      if (user.isDeleted) return done({
        err: `User has been deleted.`,
        custom: true
      })
      user.validatePassword(password, user.local.password, (err, isMatch) => {
        /* istanbul ignore next */
        if (err) return done(err);
        if (!isMatch) return done({
          err: `Incorrect email and password combination.`,
          custom: true,
          status: 400
        });
        req.tempUser = user;
        return done(null, user);
      });
    });
  });
}));

// =========================================================================
// FACEBOOK ================================================================
// =========================================================================
/* istanbul ignore next */
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  passReqToCallback: true,
  profileFields: ['emails', 'name', 'gender', 'profileUrl']
}, (req, accessToken, refreshToken, profile, done) => {
  process.nextTick(() => {
    User.findOne({
      'facebook.id': profile.id
    }, (err, user) => {
      if (err) return done(err);
      if (user) {
        if (user.isDeleted) return done({
          err: `User has been deleted.`,
          custom: true
        });
        req.tempUser = user;
        return done(null, user);
      } else {
        let newUser = new User();
        newUser.facebook.id = profile.id;
        newUser.facebook.token = accessToken;
        newUser.facebook.email = profile.emails[0].value;
        newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
        newUser.facebook.gender = profile.gender;
        newUser.facebook.profileUrl = profile.profileUrl;
        newUser.facebook.displayName = profile.displayName;
        newUser.primaryEmail = profile.emails[0].value;
        newUser.save((err) => {
          if (err) return done(err);
          req.login(newUser, (err) => {
            if (err) return done(err);
            req.tempUser = newUser;
            return done(null, newUser);
          });
        });
      }
    });
  });
}));

// =========================================================================
// TWITTER =================================================================
// =========================================================================
/* istanbul ignore next */
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL,
  passReqToCallback: true
}, (req, token, tokenSecret, profile, done) => {
  process.nextTick(() => {
    User.findOne({
      'twitter.id': profile.id
    }, (err, user) => {
      if (err) return done(err);
      if (user) {
        if (user.isDeleted) return done({
          err: `User has been deleted.`,
          custom: true
        });
        req.tempUser = user;
        return done(null, user);
      } else {
        let newUser = new User();
        newUser.twitter.id = profile.id;
        newUser.twitter.token = token;
        newUser.twitter.username = profile.username;
        newUser.twitter.displayName = profile.displayName;
        newUser.twitter.location = profile._json.location;
        newUser.twitter.profile_photo = profile._json.profile_image_url;
        newUser.save((err) => {
          if (err) return done(err);
          req.tempUser = newUser;
          return done(null, newUser);
        });
      }
    });
  });
}));

// =========================================================================
// GOOGLE ==================================================================
// =========================================================================
/* istanbul ignore next */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true
}, (req, token, refreshToken, profile, done) => {
  process.nextTick(() => {
    User.findOne({
      'google.id': profile.id
    }, (err, user) => {
      if (err) return done(err);
      if (user) {
        if (user.isDeleted) return done({
          err: `User has been deleted.`
        });
        req.tempUser = user;
        return done(null, user);
      } else {
        let newUser = new User();
        newUser.google.id = profile.id;
        newUser.google.token = token;
        newUser.google.name = profile.displayName;
        newUser.google.email = profile.emails[0].value;
        newUser.google.occupation = profile._json.occupation;
        newUser.google.skills = profile._json.skills;
        newUser.google.gender = profile._json.gender;
        newUser.google.url = profile._json.url;
        newUser.google.profile_photo = profile._json.image.url;
        newUser.google.displayName = profile.displayName;
        newUser.google.primaryEmail = profile.emails[0].value;
        newUser.save((err) => {
          if (err) return done(err);
          req.tempUser = newUser;
          return done(null, newUser);
        });
      }
    });
  });
}));
