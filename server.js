"use strict";
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}
let express       = require('express'),
    bodyParser    = require('body-parser'),
    helmet        = require('helmet'),
    session       = require('express-session'),
    mongoose      = require('mongoose'),
    passport      = require('passport'),
    logger        = require('morgan'),
    cookieParser  = require('cookie-parser');

let app = express();
require('./models/User');
require('./config/passport');
if (process.env.NODE_ENV === 'test') mongoose.connect('mongodb://localhost/appname-test');
else mongoose.connect(process.env.DATABASE)

app.set('views', './views');
app.engine('.html', require('ejs').renderFile);
app.use(express.static('./dist'));
app.use(express.static('./bower_components'));
// app.use('/ngFacebook', express.static('./node_modules/ng-facebook'));
app.set('view engine', 'html');
app.set('view options', {
  layout: false
});

if(process.env.NODE_ENV !== 'test') app.use(logger('dev'));
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
let nosniff = require('dont-sniff-mimetype');
app.use(nosniff());

app.use('/api/v1/users', require('./routes/userRoutes'));
app.get('/*', (req, res) => {
  res.render('index');
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    if(process.env.NODE_ENV !== 'test') console.log(err);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  if(process.env.NODE_ENV !== 'test') console.log(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
