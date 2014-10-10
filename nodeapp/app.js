var express = require('express');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var path = require('path');
var favicon = require('serve-favicon');
var serveStatic = require('serve-static')
var serveIndex = require('serve-index')
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var i18n = require("i18n");

// the app, exported so that other modules can use the global instance
var app = express();
module.exports = exports = app; 

// debug logger main namespace
var debug = require('debug')('ucnweb');
app.set('debugns', 'ucnweb');

// language support
app.set('available_locales', ['en', 'fr']);
app.set('default_locale', 'en');
i18n.configure({
  locales: app.get('available_locales'),
  defaultLocale: app.get('default_locale'),
  cookie: 'ucnlang',
  directory: __dirname + "/locales"
});

if (app.get('env') === 'production') {
    debug('setting up in production environment (cmon)');

    app.set('country', 'fr');

    app.set('dbname', 'ucnexp');
    app.set('dbhost', 'ucn');
    app.set('mongouri', 'mongodb://'+app.get('dbhost')+'/'+app.get('dbname'));
    app.set('port', 3002);    

    app.set('trust proxy', 1); // trust first proxy

    app.set('mailerconfig', {
	host: '127.0.0.1',
	port: 25,
	ignoreTLS : true,
	secure : false
    });
    app.set('mailer', "ucn@cmon.lip6.fr");
    app.set('baseurl', 'https://cmon.lip6.fr/ucn/');

} else if (app.get('env') === 'ukproduction') {
    debug('setting up in production environment (uk)');

    app.set('country', 'uk');

    app.set('dbname', 'ucnexp');
    app.set('dbhost', 'localhost');
    app.set('mongouri', 'mongodb://'+app.get('dbhost')+'/'+app.get('dbname'));
    app.set('port', 3002);

    app.set('trust proxy', 1); // trust first proxy

    app.set('mailerconfig', {
	host: '127.0.0.1',
	port: 25,
	ignoreTLS : true,
	secure : false
    });
    app.set('mailer', "ucn@horizab4.memset.net");
    app.set('baseurl', 'https://horizab4.memset.net/ucn/');

} else {
    debug('setting up in development environment');

    app.set('country', 'fr');

    app.set('dbname', 'ucntest');
    app.set('dbhost', 'localhost');
    app.set('mongouri', 'mongodb://'+app.get('dbhost')+'/'+app.get('dbname'));
    app.set('port', 3002);

    app.set('mailerconfig', {
	service: "Gmail",
	auth: {
            user: (process.env.GMLU || "annakaisa.pietilainen@gmail.com"),
            pass: (process.env.GMLP || "k0val4nrannant!e")
	}
    });

    app.set('mailer', "annakaisa.pietilainen@gmail.com");
    app.set('baseurl', 'http://localhost:'+app.get('port')+'/ucn/');

    // strip proxy path from all urls in testing (done by the proxy in prod)
    app.use(function(req, res, next) {
	if (req.url.slice(0,4) == '/ucn') {
	    req.url = req.url.replace('/ucn','');
	}
	return next();
    });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
if (app.get('env') === 'development') {
    app.use(logger('dev'));
}

// middleware
app.use(favicon(path.join(__dirname, 'public','favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(i18n.init);

// session handling
const hour = 3600000;
app.use(session({secret: 'VikyowyogBocHatAckdi', 
		 cookie: { maxAge: hour},
		 store: new RedisStore()
		}));

// authentication
var User = require('./models/User');
passport.use('local', User.localStrategy);
passport.serializeUser(User.serializeUser);
passport.deserializeUser(User.deserializeUser);
app.use(passport.initialize());
app.use(passport.session());

// lang helper
app.use(function(req,res,next) {
    res.locals.__ = function () {
	return function () {
	    return i18n.__.apply(req, arguments);
	};
    };
    next();
});

// no-login routes
app.use('/', require('./routes/index'));
app.use('/downloads', function(req, res) {
  // force download
  var file = __dirname + '/downloads/' + req.path;
  res.download(file);
});
app.use('/auth', require('./routes/auth'));
app.use('/register', require('./routes/register'));
app.use('/resetpassword', require('./routes/resetpassword'));

// login protected
app.use('/users', require('./routes/users'));
app.use('/admin', require('./routes/admin'));

// locale switching
app.use('/fr', function(req, res, next) {
    res.cookie('ucnlang', 'fr', { maxAge: 30*24*hour });
    res.redirect(req.headers['referer'] || '/ucn/');
});
app.use('/en', function(req, res, next) {
    res.cookie('ucnlang', 'en', { maxAge: 30*24*hour });
    res.redirect(req.headers['referer'] || '/ucn/');
});

// default handler (on no matching route)
app.use(function(req, res, next) {
    var err = new Error('error_not_found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    var msg = err.message;
    var status = err.status || 500;
    res.status(status);

    // App errors are localized (other runtime errors are
    // not but should only happend in dev).
    try {	
	msg = (res.__ ? res.__(msg) : msg);
    } catch (e) {
    }

    debug(JSON.stringify(err));

    if (app.get('env') !== 'development') {
	err = {}; // don't leak the stack trace in production
    }

    return res.render('error', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
        message: msg,
	status: status,
        error: err,
	partials : {header : 'header', footer : 'footer'}
    });
});
