"use strict";
let mongoose  = require('mongoose'),
    should    = require('should'),
    request   = require('supertest'),
    app       = require('../server'),
    User      = mongoose.model('User'),
    assert    = require('assert');


describe('User Routes', () => {
  describe('POST /Register', () => {
    describe('Invalid parameters', () => {
      it('no email - should respond with errors', (done) => {
        let u = {password: 'secret'};
        request(app)
        .post('/api/v1/Users/Register')
        .send(u)
        .expect(400)
        .end(done);
      });
      it('no password - should respond with errors', (done) => {
        let u = { email: 'test@test.com'};
        request(app)
        .post('/api/v1/Users/Register')
        .send(u)
        .expect(400)
        .end(done);
      });
      it('email exists - should repond with errors', (done) => {
        let u = { email: 'exists@test.com', password: 'secret' };
        request(app)
        .post('/api/v1/Users/Register')
        .send(u)
        .expect(400)
        .end(done);
      });
    });
    describe('valid parameters', () => {
      it('should register a new local user', (done) => {
        let u = { email: 'test@test.com', password: 'secret' };
        request(app)
        .post('/api/v1/Users/Register')
        .send(u)
        .expect(200)
        .expect((res) => {
          should.exist(res.body.token);
        })
        .end(done);
      });
      it('should have saved the user', (done) => {
        User.findOne({'local.email' : 'test@test.com'}, (err, user) => {
          should.not.exist(err);
          should.exist(user);
          should.equal(user.local.email, 'test@test.com');
          should.notEqual(user.local.password, 'secret');
          done();
        });
      });
    });
  }); // END of POST / Register
  describe('POST /Login', () => {
    describe('invalid parameters', () => {
      it('no email - should throw and error', (done) => {
        request(app)
        .post('/api/v1/Users/Login')
        .send({password: 'secret'})
        .expect(400)
        .end(done);
      });
      it('no password - should throw an error', (done) => {
        request(app)
        .post('/api/v1/Users/Login')
        .send({email: 'exists@test.com'})
        .expect(400)
        .end(done);
      });
      it('wrong password - should throw an error', (done) => {
        request(app)
        .post('/api/v1/Users/Login')
        .send({ email: 'exists@test.com', password: 'wrong password' })
        .expect(400)
        .end(done);
      });
    });
    describe('valid parameters', () => {
      it('should find the user and return a jwt', (done) => {
        request(app)
        .post('/api/v1/Users/Login')
        .send({ email: 'exists@test.com', password: 'secret' })
        .expect(200)
        .expect((res) => {
          should.exist(res.body.token);
        })
        .end(done);
      });
    });
  }); // END of POST /Login
});
