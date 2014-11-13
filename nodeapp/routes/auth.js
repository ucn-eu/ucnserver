var express = require('express');
var router = express.Router();
var passport = require('passport');
var app = require('../app');
var emailer = require('../lib/emailer');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:auth');

/** Render login form. */
router.get('/login', function(req, res, next) {
    return res.render('login', res.locals.renderobj);
});

/** Handle login form. */
router.post('/login', function(req, res, next) {
    var robj =  res.locals.renderobj;

    if (req.body.submit2) {
	// handle password reminder
	debug("forgot passwd: "+req.body.email);

	if (!req.body.email || req.body.email.trim().length<=0) {
	    robj.error = res.__('error_missing_email');
	    return res.render('login', robj);
	}

	User.findOne({email : req.body.email.trim()}, function(err, user) {
            if (err) { 
		// some db error - should not happen in prod ..
		err.status = 500;
		return next(err); 
	    }
            if (!user || user.removed) { 
		robj.error = res.__('error_email_not_found');
		return res.render('login', robj);
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
		    url : app.get('baseurl') + "/resetpassword/"+user.resetpasswdtoken,
		    username : user.username,
		    to: user.email,
		};

		emailer.sendmail(req, res, opt, function(err, mailerres) {
		    if (err) {
			// some email error - should not happen in prod ..
			debug("sendmail error: " + err);
			robj.error = res.__('error_email');
			return res.render('login', robj);
		    }
		    robj.success = res.__('login_email_success');
		    return res.render('login', robj);
		});
	    });
	});
    } else {
	// handle login
	debug("authenticate: "+req.body.username);

	if (!req.body.username || req.body.username.trim().length<=0) {
	    robj.error = res.__('error_missing_username');
	    return res.render('login', robj);
	} else if (!req.body.password || req.body.password.trim().length<=0) {
	    robj.error = res.__('error_missing_password');
	    return res.render('login', robj);
	}

	passport.authenticate('local', function(err, user, info) {
	    if (err) { return next(err); } // dberror should not happen

	    // auth error
	    if (!user || user.removed) { 
		robj.error = res.__('error_authentication');
		return res.render('login', robj);
	    }

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
    var robj =  res.locals.renderobj;
    robj.success = res.__('login_logout_success');
    return res.render('login', robj);
});

module.exports = router;
