var _ = require('underscore');
var express = require('express');
var router = express.Router();
var app = require('../app');
var Device = require('../models/Device');
var User = require('../models/User');
var debug = require('debug')(app.get('debugns')+':routes:admin');

/* All requests to the /ucn/admin go to here first. Make sure we have an 
 * authenticated user in the req. 
 */
router.use(function(req, res, next) {
    if (!req.user || !req.user.isadmin) {
	return res.render('login', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    error : res.__('error_not_authorized'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }
    next();
});

router.get('/', function(req, res, next) {
    User.findUniqueHouses(function(err, houses) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err);
	}

	return res.render('aindex',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    houses : houses,
	    partials: {footer : 'footer', header : 'header'}
	});
    }); // findHouses
});

router.post('/', function(req, res, next) {
    User.findUniqueHouses(function(err, houses) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err);
	}
	User.findAllUsersOfHouse(req.body.house, function(err, users) {
	    if (err) {
		// some db error - should not happen in prod ..
		debug(err);
		err.status = 500;
		return next(err);
	    }

	    if (req.body.submithouse) {
		return res.render('aindex',{
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : true,
		    house : req.body.house,
		    houses : houses,
		    users : users,
		    partials: {footer : 'footer', header : 'header'}
		});
	    } else if (req.body.submitremove) {
		_.each(users, function(u) {
		    var rem = _.find(req.body.disable, function(uname) { 
			return u.username === uname; 
		    });
		    if (rem && !u.removed) { // marked
			u.remove(function() {});
		    } else if (!rem && u.removed) { // un-marked
			u.unremove(function() {});
		    }
		});

		return res.render('aindex',{
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : true,
		    house : req.body.house,
		    houses : houses,
		    users : users,
		    partials: {footer : 'footer', header : 'header'}
		});
	    }
	}); // findAllUsers	
    }); // findHouses
});

router.get('/devices', function(req, res, next) {
});

router.get('/help', function(req, res, next) {
});

router.all('/help/:platform', function(req, res, next) {
});

module.exports = router;


