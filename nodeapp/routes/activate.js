var express = require('express');
var router = express.Router();
var User = require('../models/User');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:activate');

/** 
 * Handle email activation links. If token is valid, redirect to index, else error.
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
	    err.status = 500;
	    return next(err); 
	}
	if (!user) {
	    var err = new Error('error_activation');
	    err.status = 400; // Bad Request
	    return next(err);
	}

	debug("activating: " + user.username);
	user.activate(token, function(err, user) {
	    if (err) { 
		// some db error - should not happen in prod ..
		debug('activation error: ' + err);
		err.status = 500;
		return next(err);
	    }
	    // ok!
	    return res.render('index', { 
		locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
		loggedin : false,
		pagetitle : res.__('index_pagetitle'),
		errorclass : "success",
		error : res.__('index_activation_success'),
		partials : { header : 'header', footer : 'footer'}
	    });
	});
    });
});

module.exports = router;
