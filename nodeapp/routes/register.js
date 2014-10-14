var express = require('express');
var router = express.Router();
var path = require('path');

var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:register');

/** Show the registration help + form. */
router.get('/', function(req, res, next) {
    return res.render('register', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	partials : { header : 'header', footer : 'footer'}
    });
});

/** Handle registration form submit. */
router.post('/', function(req, res, next) {
    var rendererr = function(msg) {
	return res.render('register', {
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    error : msg,
	    partials : { header : 'header', footer : 'footer'},
	    // return the form values so we can fill-in already entered data
	    username : req.body.username,
	    email : req.body.email,
	    familyname : req.body.familyname,
	    accept1 : req.body.accept1,
	    accept2 : req.body.accept2,
	    accept3 : req.body.accept3,
	    accept4 : req.body.accept4
	});
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

    User.findOne(uobj, function(err, user) {
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
		url : app.get('baseurl') + 'auth/login',
		contactemail : app.get('mailer'),
		attachments: [{
		    path : path.join(__dirname, '../downloads',vpnconffile),
		    filename : "ucn.ovpn"
		}]
	    }
	    
	    // email callback
	    var cb = function(err, mailerres) {
		debug("sendmail resp: " + 
		      (mailerres ? mailerres.response : "na"));

		if (err) {
		    debug("sendmail error: " + err);
		    User.remove(uobj, function(err2) {
			if (err2) debug("db user remove error: " + err2);
		    });
		    // assume it's because user gave invalid email or something
		    return rendererr(res.__('error_email', uobj.email));
		}

		return res.render('register', {
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    success : res.__('register_success', uobj.email),
		    partials : { header : 'header', footer : 'footer'}
		});
	    };

	    emailer.sendmail(req, res, opt, cb);

	}); // createUser
    }); // findUser
});

module.exports = router;
