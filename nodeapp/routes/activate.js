var express = require('express');
var router = express.Router();
var User = require('../models/User');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+'routes:activate');

/** 
 * Handle email activation links. If the token is valid, renders 
 * ../install for installation instructions, else goes to error page.
 */
router.get('/:activationtoken', function(req, res, next) {
    var token = req.params.activationtoken;
    if (!token) {
	var err = new Error('error_activation');
	err.status = 400; // Bad Request
	return next(err);
    }

    User.findOne({activationtoken : token}, function(err, user) {
        if (err) { 
	    // some db error - should not happen in prod ..
	    debug(err);
	    return next(err); 
	}

	if (user) {
	    debug("activating " + user.email);
	    user.activate(token, function(err, user) {
		if (err) {
		    err.status = 400; // Bad Request
		    return next(err);
		} else {
		    // activated, move on to install
		    return res.render('install', {
			locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
			loggedin : false,
			pagetitle : res.__('install_pagetitle'),
			successclass : 'success',
			successtxt : res.__('install_activation_ok'),
			partials : { 
			    helpvpn: 'helpvpn',
			    helplogger: 'helplogger',
			    header : 'header', 
			    footer : 'footer'}
		    });
		}
	    });
	} else {
	    var err = new Error('error_activation');
	    err.status = 400; // Bad Request
	    return next(err);
	}
    });
});

module.exports = router;
