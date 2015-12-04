'use strict';
let mongoose = require('mongoose'),
    bcrypt   = require('bcrypt'),
    jwt      = require('jsonwebtoken');

let UserSchema = new mongoose.Schema({
  local: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
        index: {
          unique: true,
          sparse: true
        }
      },
      password: String,
      confirm_email: String
    },
    facebook: {
      id: {type: String, unique: true, sparse: true},
      token: String,
      name: String,
      email: String,
      gender: String,
      profileUrl: String
    },
    twitter: {
      id: {type: String, unique: true, sparse: true},
      token: String,
      displayName: String,
      userName: String,
      profile_photo: String,
      location: String
    },
    google: {
      id: {type: String, unique: true, sparse: true},
      token: String,
      email: String,
      name: String,
      occupation: String,
      skills: String,
      gender: String,
      url: String,
      profile_photo: String,
      displayName: String,
      organizations: [],
      urls: [],
      emails: []
    },
    primaryEmail: String
});

UserSchema.methods.createHash = function(password, cb) {
  let user = this;
  let BCRYPT_COST = 12;
  if(process.env.NODE_ENV === 'test') BCRYPT_COST = 1;
  bcrypt.genSalt(BCRYPT_COST, (err, salt) => {
    if (err) return cb(err);
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) return cb(err);
      // user.local.password = hash;
      cb(null, hash);
    });
  });
};

UserSchema.methods.validatePassword = function(password, hash, cb) {
  bcrypt.compare(password, hash, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

UserSchema.methods.generateJWT = function() {
  let today = new Date();
  let exp = new Date(today);
  exp.setDate(today.getDate() + 36500); //expires in 100 years (365 days * 100 years);
  let local = (this.local.password) ? true : false;
  let facebook = (this.facebook.token) ? true : false;
  let twitter = (this.twitter.token) ? true : false;
  let google = (this.google.token) ? true : false;
  let email = this.local.email || this.google.email || this.facebook.email;
  let username = this.twitter.displayName || this.twitter.userName || this.google.name || this.facebook.name || this.local.email;
  return jwt.sign({
    _id: this._id,
    email: email,
    local: local,
    facebook: facebook,
    twitter: twitter,
    google: google,
    username: username,
    exp: parseInt(exp.getTime() / 1000) //get the time in milliseconds and convert to seconds
  }, process.env.AUTH_SECRET);
};

module.exports = mongoose.model('User', UserSchema);
