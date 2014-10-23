var express = require('express');
var router = express.Router();
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:install');

/** Links. */
router.all('/:what', function(req, res, next) {
    var dev = req.params.what;
    return res.render('install', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : (req.user ? true : false),
	country : app.get('country'),
	isandroid : (dev && dev==='android' ? true : false),
	isios : (dev && dev==='ios' ? true : false),
	isosx : (dev && dev==='osx' ? true : false),
	islinux : (dev && dev==='linux' ? true : false),
	iswin : (dev && dev==='win' ? true : false),
	partials : { header : 'header', footer : 'footer'}
    });
});

router.all('*', function(req, res, next) {
    return res.render('install', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : (req.user ? true : false),
	country : app.get('country'),
	partials : { header : 'header', footer : 'footer'}
    });
});

module.exports = router;
