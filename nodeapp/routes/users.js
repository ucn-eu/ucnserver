var express = require('express');
var router = express.Router();
var _ = require('underscore');
var Device = require('../models/Device');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:users');

/* All requests to the /ucn/users go to here first. Make sure we have an authenticated user in the req. */
router.use(function(req, res, next) {
    if (!req.user) {
	return res.render('index', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : false,
	    pagetitle : res.__('index_pagetitle'),
	    errorclass : "error",
	    error : res.__('error_not_authorized'),
	    partials : { header : 'header', footer : 'footer'}
	});
    }
    next();
});

/* Index page for this user. */
router.get('/', function(req, res, next) {
    Device.findAllForUser(req.user.username, function(err, devices) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug('activation error: ' + err);
	    err.status = 500;
	    return next(err);
	}
	return res.render('uindex',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('uindex_pagetitle'),
	    firsttime : (!devices || devices.length == 0),
	    username : req.user.username,
	    devices : devices,
	    partials: {
		footer : 'footer', 
		header : 'header', 
		nav : 'unav'
	    }
	});
    }); // findAll
});

/* Platform specific device install help pages */
router.get('/help/:platform', function(req, res, next) {
    var platform = req.params.platform || 'na';
    var params = {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,	
	pagetitle : res.__('uindex_pagetitle'),
	partials: {
	    footer : 'footer', 
	    header : 'header', 
	    nav : 'unav',
	    help : 'help'
	}
    };
    // which help to show ?
    params[platform] = true;
    params['ismobile'] = Device.isMobilePlatform(platform);
    return res.render('uhelp', params);
});

/** Help main. */
router.get('/help', function(req, res, next) {
    return res.render('uhelp', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,	
	pagetitle : res.__('uindex_pagetitle'),
	partials: {
	    footer : 'footer', 
	    header : 'header', 
	    nav : 'unav'
	}
    });
});

/** Change password tab. */
router.get('/passwd', function(req, res, next) {
    return res.render('upasswd',{
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,
	pagetitle : res.__('uindex_pagetitle'),
	partials: {
	    footer : 'footer', 
	    header : 'header', 
	    nav : 'unav'
	}
    });
});

/** Update password */
router.post('/passwd', function(req, res, next) {
    if (!req.body.password || req.body.password.trim().length <= 0) {
	return res.render('upasswd', { 
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('uindex_pagetitle'),
	    errorclass : "error",
	    error : res.__('error_missing_password'),
	    partials: {
		footer : 'footer', 
		header : 'header', 
		nav : 'unav'
	    }
	});
    }

    var user = req.user;
    debug("reset password for " + user.username);
    user.resetpassword(req.body.password.trim(), function(err, user) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug('activation error: ' + err);
	    err.status = 500;
	    return next(err);
	}
	return res.render('upasswd',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('uindex_pagetitle'),
	    errorclass : "success",
	    error : res.__('uindex_passwd_changed'),
	    partials: {
		footer : 'footer', 
		header : 'header', 
		nav : 'unav'
	    }
	});
    });
});

/** Add device tab */
router.get('/adddev', function(req, res, next) {
    var devices = _.map(Device.getAllTypes(), function(v) {
	return { name : v, value : v};
    });
    return res.render('uadddev',{
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : true,
	pagetitle : res.__('uindex_pagetitle'),
	devices : devices,
	partials: {
	    footer : 'footer', 
	    header : 'header', 
	    nav : 'unav'
	}
    });
});

/** Add device */
router.post('/adddev', function(req, res, next) {
    var dev = { username : req.user.username, type : req.body.type };
    Device.findOne(dev, function(err, device) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    err.status = 500;
	    return next(err); 
	}

        if (!device) { 
	    dev.platform = Device.type2platform(dev.type);

	    Device.create(dev, function(err, device) {
		if (err) { 
		    // some db error - should not happen in prod ..
		    debug(err);
		    err.status = 500;
		    return next(err); 
		}

		// rendering params
		var params = {
		    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		    loggedin : true,	
		    pagetitle : res.__('uindex_pagetitle'),
		    cred : {
			username : device.username + '.' + device.type
		    },
		    type : device.type,
		    partials: {
			footer : 'footer', 
			header : 'header', 
			nav : 'unav',
			help : 'help'
		    }
		};
		// for rendering right help
		params[device.platform] = true;
		params['ismobile'] = device.isMobilePlatform();

		return res.render('uadddevinst',params);
	    }); // create
	} else {
	    // FIXME: user already has a device of this type, add counter ?
	    debug("FIXME: can't have two devices of same type...");
	    return next(new Error('FIXME: can\'t have two deviecs of same type...')); 
	}
    }); // findOne
});

module.exports = router;
