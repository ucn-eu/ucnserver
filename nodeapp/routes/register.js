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
	errorclass : "noerror",
	pagetitle : res.__('register_pagetitle'),
	partials : { header : 'header', footer : 'footer'}
    });
});

/** Handle registration form submit. */
router.post('/', function(req, res, next) {
    var rendererr = function(msg) {
	return res.render('register', {
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    errorclass : "error",
	    error : msg,
	    pagetitle : res.__('register_pagetitle'),
	    partials : { header : 'header', footer : 'footer'}
	});
    };

    // input verifications
    if (!req.body.username || req.body.username.trim().length<=0) {
	return rendererr(res.__('error_missing_username'));
    } else if (!req.body.familyname || req.body.familyname.trim().length<=0) {
	return rendererr(res.__('error_missing_familyname'));
    } else if (!req.body.email || req.body.email.trim().length<=0) {
	return rendererr(res.__('error_missing_email'));
    } else if (!req.body.password || req.body.password.trim().length<=0) {
	return rendererr(res.__('error_missing_password'));
    } else if (!req.body.accept || req.body.accept !== 'ok') {
	return rendererr(res.__('error_missing_accept'));
    }

    // new user
    var uobj = { username : req.body.username.trim(), email : req.body.email.trim() };
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
	uobj.familyname = req.body.familyname.trim();

	User.create(uobj, function(err, user) {
            if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err); 
	    }

	    // welcome email
	    // FIXME: pick VPN config by lang ? ask user ?
	    var opt = {
		template : 'welcome',
		contactemail : app.get('mailer'),
		url : app.get('baseurl') + "activate/"+user.activationtoken,
		username : user.username,
		to: user.email,
		attachments: [{
		    path : path.join(__dirname, '../downloads','fr.server.ovpn'),
		    filename : "fr.server.ovpn"
		},{
		    path : path.join(__dirname, '../downloads','uk.server.ovpn'),
		    filename : "uk.server.ovpn"
		}]
	    }
	    
	    // email callback
	    var cb = function(err, mailerres) {
		debug("sendmail resp: " + 
		      (mailerres ? mailerres.response : "na"));

		if (err) {
		    debug("sendmail error: " + err);
		    User.remove(uobj, function(err2) {
			if (err2) debug("db error: " + err2);
		    });
		    // assume it's because user gave invalid email or something
		    return rendererr(res.__('error_email', uobj.email));
		}

		return res.render('register', {
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    errorclass : "success",
		    error : res.__('register_success', uobj.email),
		    pagetitle : res.__('register_pagetitle'),
		    partials : { header : 'header', footer : 'footer'}
		});
	    };

	    emailer.sendmail(req, res, opt, cb);
	}); // createUser
    }); // findUser
});

module.exports = router;
