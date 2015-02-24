var http = require('http');
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
	var robj =  res.locals.renderobj;
	robj.loggedin = false;
	robj.error = res.__('error_not_authorized');
	return res.render('login', robj);
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

	var robj =  res.locals.renderobj;
	robj.loggedin = true;
	robj.houses = houses;
	robj.vizurl = app.get('vizurl');
	return res.render('aindex', robj);
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

	    // FIXME: this is a bit ugly ... what's a better way?
	    var ulist = [];
	    var f = function(idx) {
		if (idx >= users.length) {
		    // done - render users
		    var robj =  res.locals.renderobj;
		    robj.loggedin = true;
		    robj.houses = houses;
		    robj.users = ulist;
		    robj.house = req.body.house;
		    robj.vizurl = app.get('vizurl');
		    return res.render('aindex', robj);
		}

		var u = users[idx].toJSON({virtuals : true});
		Device.findDevicesForUser(u.username, function(err, devs) {
		    if (err) {
			// some db error - should not happen in prod ..
			debug(err);
			err.status = 500;
			return next(err);
		    }
		    u.devcount = devs.length;
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

	var robj =  res.locals.renderobj;
	robj.vizurl = app.get('vizurl');
	robj.loggedin = true;
	robj.users = users;
	return res.render('adevs', robj);
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

	var robj =  res.locals.renderobj;
	var rendererr = function(err) {
	    robj.vizurl = app.get('vizurl');
	    robj.loggedin = true;
	    robj.users = users;
	    robj.error = err;
	    robj.username = req.body.username;
	    return res.render('adevs', robj);
	};

	var rendersucc = function(succ) {
	    Device.findDevicesForUser(req.body.username, function(err, devices) {
		if (err) {
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err);
		}
		robj.vizurl = app.get('vizurl');
		robj.loggedin = true;
		robj.users = users;
		robj.devices = devices;
		robj.success = succ;
		robj.username = req.body.username;
		return res.render('adevs', robj);
	    });
	};

	if (!req.body.username) {
	    return rendererr("Select user!");
	}
	
	if (req.body.submitclear) {
	    var notifs = req.body.notif || [];
	    // remove selected notification flags
	    Device.findDevicesForUser(req.body.username,function(err, devices) {
		if (err) {
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err);
		}

		_.each(devices, function(d) {
		    var checked = _.find(notifs, function(login) { 
			return d.login === login; 
		    });
		    // db object has the flag, but removed on the form .. 
		    // -> unset in db
		    if (!checked && d.inactivity_notif_sent) {
			d.unsetnotif(function(err,dev) {});
		    }
		});

		// yield so that the db operations are done
		setTimeout(rendersucc,0,"Selected flags cleared!");
	    });	

	} else if (req.body.submitadd) {
	    // adding a new device

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
		    setTimeout(rendersucc,0,"Added device '"+d.devname+"'");
		}); // create
	    }); // findOne
	} else {
	    // render devs
	    return rendersucc();
	}
    }); // findAllUsers
});

router.get('/help', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.vizurl = app.get('vizurl');
    robj.baseurl = app.get('baseurl');
    robj.loggedin = true;
    robj.country = app.get('country');
    return res.render('ahelp', robj);
});

module.exports = router;


