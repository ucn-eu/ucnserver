var express = require('express');
var router = express.Router();
var passport = require('passport');
var passwordgen = require('password-generator');

var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+'routes:resetpassword');

/** Handle password reminder request. */
router.post('/', function(req, res, next) {
    if (!req.body.email) {
	return res.render('index', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    pagetitle : res.__('index_pagetitle'),
	    errorclass : "error",
	    error : res.__('error_missing_email'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }
    
    User.findOne({email : req.body.email}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    return next(err); 
	}

        if (!user) { 
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "error",
		error : res.__('error_user_not_found'),
		partials : { header : 'header', footer : 'footer'}
	    });
	};

	// generate new random password
	var newpassword = passwordgen(12, false); 
	user.password = newpassword;
	user.save(function (err, user) {
	    if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		return next(err); 
	    }

	    var opt = {
		template : 'passwd',
		portalurl : app.get('baseurl'),
		email : user.email,
		password : newpassword,
		to: user.email
	    }
	    
	    var cb = function(err, mailerres) {
		debug("sendmail resp: " + 
		      (mailerres ? mailerres.response : "na"));

		if (err) {
		    // some email error - should not happen in prod ..
		    debug("sendmail error: " + err);
		    return next(err);
		}

		return res.render('index', { 
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    pagetitle : res.__('index_pagetitle'),
		    errorclass : "success",
		    error : res.__('index_reset_success'),
		    partials : { header : 'header', footer : 'footer'}
		});
	    };

	    emailer.sendmail(req, res, opt, cb);

	}); // saveUser
    }); // findUser
});

module.exports = router;

