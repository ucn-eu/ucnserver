var express = require('express');
var router = express.Router();
var path = require('path');

var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:register');

/** Show the registration help + form. */
router.get('/', function(req, res, next) {
    return res.render('register', res.locals.renderobj);
});

/** Handle registration form submit. */
router.post('/', function(req, res, next) {
    var robj =  res.locals.renderobj;

    // error helper
    var rendererr = function(msg) {
	robj.error = msg;
	// return the form values so we can fill-in already entered data
	robj.username = req.body.username;
	robj.email = req.body.email;
	robj.familyname = req.body.familyname;
	robj.accept1 = req.body.accept1;
	robj.accept2 = req.body.accept2;
	robj.accept3 = req.body.accept3;
	robj.accept4 = req.body.accept4;
	return res.render('register', robj);
    };

    // basic input verifications
    if (!req.body.username || req.body.username.trim().length<=0) {
	return rendererr(res.__('error_missing_username'));
    } else if (!req.body.email || req.body.email.trim().length<=0) {
	return rendererr(res.__('error_missing_email'));
    } else if (!req.body.password || req.body.password.trim().length<=0) {
	return rendererr(res.__('error_missing_password'));
    } else if (!req.body.accept1 || req.body.accept1 !== 'ok') {
	return rendererr(res.__('error_missing_accept'));
    } else if (!req.body.accept2 || req.body.accept2 !== 'ok') {
	return rendererr(res.__('error_missing_accept'));
    } // the other accepts are optional (apply only when they have kids)

    // new user
    var uobj = { username : req.body.username.trim(), 
		 email : req.body.email.trim() 
	       };

    var q = {'$or':[{username : uobj.username},{email : uobj.email}]};
    User.findOne(q, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}

        if (user) { 
	    return rendererr(res.__('error_user_exists', uobj.username));
	}

	uobj.password = req.body.password.trim();
	uobj.familyname = (req.body.familyname ? req.body.familyname.trim() : undefined);

	User.create(uobj, function(err, user) {
            if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err); 
	    }

	    // welcome email	    
	    var vpnconffile = app.get('country')+'.server.ovpn';
	    var opt = {
		to: user.email,
		template : 'welcome',
		username : user.username,
		password : req.body.password.trim(), // use cleartext version
		url : app.get('baseurl') + '/auth/login',
		contactemail : app.get('mailer'),
		attachments: [{
		    path : path.join(__dirname, '../downloads',vpnconffile),
		    filename : "ucn.ovpn"
		}]
	    }
	    
	    // email callback
	    var cb = function(err, mailerres) {
		if (err) {
		    debug("sendmail error: " + err);
		    User.remove(uobj, function(err2) {
			if (err2) debug("db user remove error: " + err2);
		    });
		    // assume it's because user gave invalid email or something
		    return rendererr(res.__('error_email', uobj.email));
		}
		robj.success = res.__('register_success', uobj.email);
		return res.render('register', robj);
	    };
	    emailer.sendmail(req, res, opt, cb);
	}); // createUser
    }); // findUser
});

module.exports = router;
