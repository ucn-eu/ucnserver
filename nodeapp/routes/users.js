var debug = require('debug')('dataweb:routes:users');
var express = require('express');
var router = express.Router();
var app = require('../app');
var debug = require('debug')(app.get('debugns')+'routes:users');

/* Index page for this user. */
router.get('/', function(req, res, next) {
    if (!req.user) {
	var err = new Error('error_authentication');
	err.status = 401; // Not authorized
	return next(err);
    }
    if (!req.user.isactivated) {
	var err = new Error('error_not_active');
	err.status = 403; // Forbidden
	return next(err);
    }

    var connections = [];
    var render = function() {
	res.render('uindex',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('uindex_pagetitle'),
	    email : req.user.email,
	    created : req.user.created,
	    connections : connections,
	    partials: {
		footer : 'footer', 
		header : 'header', 
		nav : 'unav'
	    }
	});
    };

    /**
    // get most recent VPN connections
    var search = function(err, collection) {
	if (err) {
	    debug(err); 
	    return;
	}

	collection.find(
	    {'common_name' : req.user.email}).toArray(
		function(err, results) {
		    if (err) {
			debug(err); 
			return;
		    }
		    var r = {
			starttime : null,
			endtime : null,
			len : null,
			publicip : null,
			geolocation : null			
		    };
		}
	    );
    }; //search
    mongoose.connection.db.collection('openvpn_log', search);
    */
    return render();
});

router.get('/help', function(req, res) {
    if (!req.user || !res.user.isactivated) { // not authorized
	return res.send(401);
    }
    return res.render('help',{
	partials: {
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('uindex_pagetitle'),
	    header : 'header', 
	    footer : 'footer', 
	    nav : 'unav',
	    helpvpn: 'helpvpn',
	    helplogger: 'helplogger'
	}});
});

module.exports = router;
