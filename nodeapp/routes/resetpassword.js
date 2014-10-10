var express = require('express');
var router = express.Router();
var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:resetpassword');

/** 
 * Handle email passwordreset links. If valid token given, renders a form 
 * for new password.
 */
router.get('/:token', function(req, res, next) {
    var token = req.params.token;
    if (!token) {
	var err = new Error('error_not_found');
	err.status = 400; // Bad Request
	return next(err);
    }

    User.findOne({resetpasswdtoken : token}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}

	if (!user || user.removed) {
	    var err = new Error('error_not_found');
	    err.status = 400; // Bad Request
	    return next(err);
	}

	// render the password form
	return res.render('resetpassword', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    token : token,
	    partials : { header : 'header', footer : 'footer'}
	});

    }); // findOne
});

/** 
 * Handle email passwordreset form.
 */
router.post('/:token', function(req, res, next) {
    var token = req.params.token;
    if (!token) {
	var err = new Error('error_not_found');
	err.status = 400; // Bad Request
	return next(err);
    }

    if (!req.body.password || req.body.password.trim().length <= 0) {
	return res.render('resetpassword', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    token : token,
	    error : res.__('error_missing_password'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }

    User.findOne({resetpasswdtoken : token}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}

	if (!user || user.removed) {
	    var err = new Error('error_not_found');
	    err.status = 400; // Bad Request
	    return next(err);
	}

	debug("reset password for " + user.username);
	user.resetpassword(req.body.password.trim(), function(err, user) {
	    if (err) {
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err);
	    }

	    return res.render('login', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		token : token,
		success : res.__('login_reset_success'),
		partials : { header : 'header', footer : 'footer'}
	    });
	});
    }); // findOne
});

module.exports = router;

