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

/** Main page : users. */
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

/** Main page : fetch users by household or update removed flags. */
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

	    if (req.body.submitremove) {
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
	    }

	    // FIXME: this is not very efficient solution to get devs...
	    // tried sub-doc but it doesn't work well with the IP assignment
	    var ulist = [];
	    var f = function(idx) {
		if (idx >= users.length) {
		    // done - render users
		    return res.render('aindex',{
			locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
			loggedin : true,
			house : req.body.house,
			houses : houses,
			users : ulist,
			partials: {footer : 'footer', header : 'header'}
		    });
		}
		var u = users[idx].toJSON({virtuals : true});
		Device.findDeviceStatsForUser(u.username, function(err, dstat) {
		    if (err) {
			// some db error - should not happen in prod ..
			debug(err);
			err.status = 500;
			return next(err);
		    }
		    u.dev = dstat;
		    ulist.push(u);
		    f(idx+1);
		});
	    }
	    f(0);
	}); // findAllUsers	
    }); // findHouses
});

/** Devices page: initially just populate the user list. */
router.get('/devices', function(req, res, next) {
    User.findAllUsers(function(err, users) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err);
	}

	return res.render('adevs',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    users : users,
	    partials: {footer : 'footer', header : 'header'}
	});
    });
});

/** Devices page: handle form action. */
router.post('/devices', function(req, res, next) {
    User.findAllUsers(function(err, users) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err);
	}

	var rendererr = function(err) {
	    return res.render('adevs',{
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : true,
		username : req.body.username,
		users : users,
		error : err,
		partials: {footer : 'footer', header : 'header'}
	    });
	};

	var rendersucc = function(succ) {
	    Device.findDevicesForUser(req.body.username,function(err, devices) {
		if (err) {
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err);
		}

		return res.render('adevs',{
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : true,
		    username : req.body.username,
		    users : users,
		    devices : devices,
		    success : succ,
		    partials: {footer : 'footer', header : 'header'}
		});
	    });
	};

	if (!req.body.username) {
	    return rendererr("Select user!");
	}

	if (req.body.submitadd) {
	    if (!req.body.devname || req.body.devname.trim().length <= 0)
		return rendererr("Missing 'Device Name'");
	    // This is because the OpenVPN clients replace ' ' by '_' ...
	    if (req.body.devname.indexOf(' ')>=0)
		return rendererr("No spaces allowed in 'Device Name'");

	    var d = {
		login : req.body.username + '.' + req.body.devname.trim(),
		username : req.body.username,
		devname : req.body.devname.trim(),
		type : req.body.devtype,
		usage : req.body.devusage
	    };

	    Device.findOne({login : d.login}, function(err, dev) {
		if (err) {
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err);
		}
		if (dev)
		    return rendererr("User already has a device named '"+
				     d.devname+"'");

		Device.create(d, function(err, dev) {
		    if (err) {
			// some db error - should not happen in prod ..
			debug(err);
			err.status = 500;
			return next(err);
		    }
		    return rendersucc("Added device '"+d.devname+"'");
		}); // create
	    }); // findOne
	} else {
	    return rendersucc();
	}
    }); // findAllUsers
});

router.get('/help', function(req, res, next) {
    return res.render('ahelp',{
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,
	country: app.get('country'),
	partials: {footer : 'footer', header : 'header'}
    });
});

module.exports = router;


