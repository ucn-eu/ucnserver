var express = require('express');
var router = express.Router();
var _ = require('underscore');
var Device = require('../models/Device');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:users');

/* All requests to the /ucn/users go to here first. Make sure we have an 
 * authenticated user in the req. 
 */
router.use(function(req, res, next) {
    if (!req.user) {
	return res.render('login', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    error : res.__('error_not_authorized'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }
    next();
});

/* Index page with device list. */
router.get('/', function(req, res, next) {
    Device.findDevicesForUser(req.user.username, function(err, devices) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err);
	}

	return res.render('uindex',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    devices : devices,
	    partials: {footer : 'footer', header : 'header'}
	});
    }); // findAll
});

/* Account mgmt page. */
router.get('/account', function(req, res, next) {
    return res.render('uaccount',{
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,
	partials: {footer : 'footer', header : 'header'}
    });
});

/* Account mgmt actions. */
router.post('/account', function(req, res, next) {
    if (req.body.submitpw) {
	if (!req.body.password || req.body.password.trim().length <= 0) {
	    return res.render('uaccount',{
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : true,
		error : res.__('error_missing_password'),
		partials: {footer : 'footer', header : 'header'}
	    });
	}

	req.user.resetpassword(req.body.password.trim(), function(err, user) {
	    if (err) {
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err);
	    }

	    return res.render('uaccount',{
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : true,
		success : res.__('account_change_password_succ'),
		partials: {footer : 'footer', header : 'header'}
	    });
	});
    } else {
	return res.render('uaccount',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    partials: {footer : 'footer', header : 'header'}
	});
    }
});


module.exports = router;
