var express = require('express');
var router = express.Router();
var path = require('path');
var passwordgen = require('password-generator');

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

    // check input
    if (!req.body.email) {
	return rendererr(res.__('error_missing_email'));
    } else if (!req.body.familyname) {
	return rendererr(res.__('error_missing_familyname'));
    } else if (!req.body.accept || req.body.accept !== 'ok') {
	return rendererr(res.__('error_missing_accept'));
    }

    // new user
    var uobj = { email : req.body.email };
    User.findOne(uobj, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    return next(err); 
	}

	// found somebody with the same email ?
        if (user) { 
	    return rendererr(res.__('error_user_exists', uobj.email));
	}
	
	// generate password
	uobj.password = passwordgen(12, false);    

	User.create(uobj, function(err, user) {
            if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		return next(err); 
	    }

	    var opt = {
		template : 'welcome',
		activationurl : app.get('baseurl') + "activate/"+user.activationtoken,
		portalurl : app.get('baseurl'),
		contactemail : app.get('mailer'),
		email : uobj.email,
		password : uobj.password,
		to: uobj.email,
		attachments: [{
		    path : path.join(__dirname, '../downloads','cmon.lip6.fr.ovpn'),
		    filename : "cmon.lip6.fr.ovpn"
		}]
	    }
	    
	    var cb = function(err, mailerres) {
		debug("sendmail resp: " + 
		      (mailerres ? mailerres.response : "na"));

		if (err) {
		    // some email error - should not happen in prod ..
		    debug("sendmail error: " + err);
		    User.remove(uobj, function(err2) {
			if (err2) debug("db error: " + err2);
		    });
		    return next(err);
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
