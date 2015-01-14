var express = require('express');
var router = express.Router();
var _ = require('underscore');
var Device = require('../models/Device');
var app = require('../app');
var emailer = require('../lib/emailer');
var debug = require('debug')(app.get('debugns')+':routes:users');

/* All requests to the /ucn/users go to here first. Make sure we have an 
 * authenticated user in the req. 
 */
router.use(function(req, res, next) {
    if (!req.user) {
	var robj =  res.locals.renderobj;
	robj.loggedin = false;
	robj.error = res.__('error_not_authorized');
	return res.render('login', robj);
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

	var robj =  res.locals.renderobj;
	robj.loggedin = true;
	robj.devices = devices;
	robj.vizurl = app.get('vizurl');
	return res.render('uindex', robj);
    }); // findAll
});

/* Account mgmt page. */
router.get('/account', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = true;
    robj.vizurl = app.get('vizurl');
    return res.render('uaccount', robj);
});

/* Account mgmt actions. */
router.post('/account', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = true;
    robj.vizurl = app.get('vizurl');

    if (req.body.submitpw) {
	if (!req.body.password || req.body.password.trim().length <= 0) {
	    robj.error = res.__('error_missing_password');
	    return res.render('uaccount', robj);
	}

	req.user.resetpassword(req.body.password.trim(), function(err, user) {
	    if (err) {
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err);
	    }

	    robj.success = res.__('account_change_password_succ');
	    return res.render('uaccount', robj);
	});
    } else if (req.body.submitunreg) {
	var opt = {
	    to: app.get('usercontact'),
	    subject : '[UCN Study] Withdraw Request',
	    text : 'User "'+req.user.username+
		'" requested to quit the study:\n'+
		'Email: '+req.user.email+'\n'+
		'Familyname: '+req.user.familyname+'\n\n'+
		'-- ucnwebapp'
	};

	// email callback
	var cb = function(err, mailerres) {
	    if (err) {
		debug("sendmail error: " + err);
		robj.error = res.__('account_unregister_fail');
	    } else {
		robj.success = res.__('account_unregister_succ');
	    }
	    return res.render('uaccount', robj);
	};
	emailer.sendmail(req, res, opt, cb);
    } else {
	return res.render('uaccount', robj);
    }
});

module.exports = router;
