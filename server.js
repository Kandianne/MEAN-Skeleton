"use strict";
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}
var express = require('express');
var bodyParser = require('body-parser');
var helmet = require('helmet');
var session = require('express-session');
var mongoose = require('mongoose');
var passport = require('passport');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var app = express();
require('./models/User');
require('./config/passport');
if (process.env.NODE_ENV === 'test')
    mongoose.connect('mongodb://localhost/appname-test');
else
    mongoose.connect(process.env.DATABASE);
app.set('views', './views');
app.engine('.html', require('ejs').renderFile);
app.use(express.static('./dist'));
app.use(express.static('./src'));
app.use(express.static('./bower_components'));
app.set('view engine', 'html');
app.set('view options', {
    layout: false
});
if (process.env.NODE_ENV !== 'test')
    app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet.csp({
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", '*.google-analytics.com', 'cdnjs.cloudflare.com', "'unsafe-inline'", "code.jquery.com", "ajax.googleapis.com", 'connect.facebook.net', 'api.twitter.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', "ajax.googleapis.com", "cdnjs.cloudflare.com"],
    imgSrc: ["'self'", '*.google-analytics.com', 'data:', "www.facebook.com"],
    connectSrc: ["'self'", 'api.twitter.com'],
    fontSrc: ['fonts.gstatic.com'],
    objectSrc: [],
    mediaSrc: [],
    frameSrc: ["'self'", "static.ak.facebook.com", "s-static.ak.facebook.com", "www.facebook.com"]
}));
app.use(helmet.xssFilter());
app.use(helmet.xframe('deny'));
app.use(helmet.hidePoweredBy());
var nosniff = require('dont-sniff-mimetype');
app.use(nosniff());
app.use('/api/v1/users', require('./routes/userRoutes'));
app.get('/*', function (req, res) {
    res.render('index');
});
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        console.log(err);
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
module.exports = app;
