var express = require('express');
var router = express.Router();
var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:resetpassword');

/** Handle password reminder request from index page. */
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
	    err.status = 500;
	    return next(err); 
	}

        if (!user || user.removed) { 
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "error",
		error : res.__('error_user_not_found'),
		partials : { header : 'header', footer : 'footer'}
	    });
	} else if (!user.isactivated) {
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "error",
		error : res.__('error_not_active'),
		partials : { header : 'header', footer : 'footer'}
	    });
	}

	debug("reset password req for " + user.username);
	user.resetpasswordreq(function (err, user) {
	    if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err); 
	    }

	    var opt = {
		template : 'passwd',
		contactemail : app.get('mailer'),
		url : app.get('baseurl') + "resetpassword/"+user.passwordresettoken,
		username : user.username,
		to: user.email,
	    }
	    
	    var cb = function(err, mailerres) {
		debug("sendmail resp: " + 
		      (mailerres ? mailerres.response : "na"));

		if (err) {
		    // some email error - should not happen in prod ..
		    debug("sendmail error: " + err);
		    err.status = 500;
		    return next(err);
		}

		return res.render('index', { 
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    pagetitle : res.__('index_pagetitle'),
		    errorclass : "success",
		    error : res.__('index_resetreq_success'),
		    partials : { header : 'header', footer : 'footer'}
		});
	    };

	    emailer.sendmail(req, res, opt, cb);
	});
    }); // findUser
});

/** 
 * Handle email passwordreset links. If valid token given, renders a form for new password.
 */
router.get('/:passwordresettoken', function(req, res, next) {
    var token = req.params.passwordresettoken;
    if (!token) {
	var err = new Error('error_passwordreset');
	err.status = 400; // Bad Request
	return next(err);
    }

    User.findOne({passwordresettoken : token}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}
	if (!user) {
	    var err = new Error('error_passwordreset');
	    err.status = 400; // Bad Request
	    return next(err);
	}

	// render the password form
	return res.render('resetpassword', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    token : token,
	    errorclass : "noerror",
	    pagetitle : res.__('resetpassword_pagetitle'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }); // findOne
});

/** 
 * Handle email passwordreset form.
 */
router.post('/:passwordresettoken', function(req, res, next) {
    var token = req.params.passwordresettoken;
    if (!token) {
	var err = new Error('error_passwordreset');
	err.status = 400; // Bad Request
	return next(err);
    }

    if (!req.body.password || req.body.password.trim().length <= 0) {
	return res.render('resetpassword', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    pagetitle : res.__('resetpassword_pagetitle'),
	    errorclass : "error",
	    error : res.__('error_missing_password'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }

    User.findOne({passwordresettoken : token}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}

	if (!user) {
	    var err = new Error('error_passwordreset');
	    err.status = 400; // Bad Request
	    return next(err);
	}

	debug("reset password for " + user.username);
	user.resetpassword(req.body.password.trim(), function(err, user) {
	    if (err) {
		// some db error - should not happen in prod ..
		debug('activation error: ' + err);
		err.status = 500;
		return next(err);
	    }

	    // go to index upon success
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "success",
		error : res.__('index_reset_success'),
		partials : { header : 'header', footer : 'footer'}
	    });
	});
    }); // findOne
});

module.exports = router;

