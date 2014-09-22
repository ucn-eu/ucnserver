var express = require('express');
var router = express.Router();
var passport = require('passport');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:auth');

/** Get forwards to the login page. */
router.get('/login', function(req, res, next) {
    return res.redirect('/ucn/');
});

/** Handle index page login form. */
router.post('/login', function(req, res, next) {
    debug("authenticate: "+req.body.username);

    passport.authenticate('local', function(err, user, info) {
	debug('auth ok? ' + (user && user!==undefined));
	if (err) { return next(err); }

	if (!user || user.removed) { 
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "error",
		error : res.__('error_authentication'),
		partials : { header : 'header', footer : 'footer'}
	    });
	} else if (!user.isactivated) { 
	    // is not active
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "error",
		error : res.__('error_not_active'),
		partials : { header : 'header', footer : 'footer'}
	    });
	} // else ok

	// authenticated, init session and redirect to user space
	req.login(user, function(err) {
	    if (err) { return next(err); }
	    if (user.isadmin) {
		return res.redirect('/ucn/admin');
	    } else {
		return res.redirect('/ucn/users');
	    }
	});
    })(req, res, next);
});

/** Handle logouts from the admin & users spaces. */
router.all('/logout', function(req, res) {
    req.logout();
    return res.render('index', { 
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	pagetitle : res.__('index_pagetitle'),
	errorclass : "success",
	error : res.__('index_logout_success'),
	partials : { header : 'header', footer : 'footer'}
    });
});

module.exports = router;
