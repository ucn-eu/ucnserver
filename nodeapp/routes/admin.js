var path = require('path');
var _ = require('underscore');
var express = require('express');
var router = express.Router();
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:admin');

router.get('/', function(req, res, next) {
    if (!req.user) {
	var err = new Error('error_authentication');
	err.status = 401; // Not authorized
	return next(err);
    }
    if (!req.user.isactivated || !res.user.isadmin) {
	var err = new Error('error_not_active');
	err.status = 403; // Forbidden
	return next(err);
    }

    var connections = [];
    var render = function() {
	return res.render('aindex',{
	    locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	    loggedin : true,
	    pagetitle : res.__('aindex_pagetitle'),
	    email : req.user.email,
	    created : req.user.created,
	    connections : connections,
	    partials: {
		footer : 'footer', 
		header : 'header', 
		nav : 'anav'
	    }
	});
    };
    return render();
});


module.exports = router;


