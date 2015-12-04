"use strict"
process.env.NODE_ENV = "test";

let mongoose    = require('mongoose'),
    async       = require('async'),
    app         = require('../server'),
    User        = mongoose.model('User')


// Create two users so we can test with them
before((done) => {
  let u = new User();
  u.local.email = 'exists@test.com';
  u.createHash('secret', (err, hash) => {
    u.local.password = hash;
    u.save();
    let user = new User();
    user.local.email = 'other@test.com';
    user.createHash('secret', (err, hash) => {
      user.local.password = hash;
      user.save();
      done();
    });
  });
});

// Clear out the databases
after((done) => {
 async.parallel([
   (cb) => {
     User.collection.remove(cb);
   }
 ], done)
});
