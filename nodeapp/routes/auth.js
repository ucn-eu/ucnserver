var express = require('express');
var router = express.Router();
var passport = require('passport');
var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:auth');

/** Render login form. */
router.get('/login', function(req, res, next) {
    return res.render('login', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	partials : { header : 'header', footer : 'footer'}
    });
});

/** Handle login form. */
router.post('/login', function(req, res, next) {
    if (req.body.submit2) {
	debug("forgot passwd: "+req.body.email);

	if (!req.body.email || req.body.email.trim().length<=0) {
	    return res.render('login', {
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		error : res.__('error_missing_email'),
		partials : { header : 'header', footer : 'footer'},
	    })
	}

	// password reminder request
	User.findOne({email : req.body.email.trim()}, function(err, user) {
            if (err) { 
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err); 
	    }

            if (!user || user.removed) { 
		return res.render('login', {
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    error : res.__('error_user_not_found'),
		    partials : { header : 'header', footer : 'footer'},
		});
	    }

	    // create unique url for resetting the password
	    user.resetpasswdreq(function(err, user) {
		if (err) { 
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err); 
		}
		
		var opt = {
		    template : 'passwd',
		    contactemail : app.get('mailer'),
		    url : app.get('baseurl') + "resetpassword/"+user.resetpasswdtoken,
		    username : user.username,
		    to: user.email,
		}
		
		var cb = function(err, mailerres) {
		    if (err) {
			// some email error - should not happen in prod ..
			debug("sendmail error: " + err);
			return res.render('login', { 
			    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
			    loggedin : false,
			    success : res.__('error_email'),
			    partials : { header : 'header', footer : 'footer'}
			});
		    }

		    return res.render('login', { 
			locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
			loggedin : false,
			success : res.__('login_email_success'),
			partials : { header : 'header', footer : 'footer'}
		    });
		};		
		emailer.sendmail(req, res, opt, cb);
	    });
	});
    } else {
	debug("authenticate: "+req.body.username);

	if (!req.body.username || req.body.username.trim().length<=0) {
	    return res.render('login', {
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		error : res.__('error_missing_username'),
		partials : { header : 'header', footer : 'footer'},
	    })

	} else if (!req.body.password || req.body.password.trim().length<=0) {
	    return res.render('login', {
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		error : res.__('error_missing_password'),
		partials : { header : 'header', footer : 'footer'},
	    })

	}

	passport.authenticate('local', function(err, user, info) {
	    debug('auth ok? ' + (user && user!==undefined));

	    if (err) { return next(err); }

	    if (!user || user.removed) { 
		return res.render('login', { 
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : false,
		    error : res.__('error_authentication'),
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
    }
});

/** Handle logouts from the admin & users spaces. */
router.all('/logout', function(req, res) {
    req.logout();
    return res.render('login', { 
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	success : res.__('login_logout_success'),
	partials : { header : 'header', footer : 'footer'}
    });
});

module.exports = router;
