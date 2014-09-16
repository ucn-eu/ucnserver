var express = require('express');
var router = express.Router();

/** Software installation steps. */
router.all('/', function(req, res) {
    return res.render('install', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	pagetitle : res.__('install_pagetitle'),
	successclass : 'noerror',
	partials : { 
	    helpvpn: 'helpvpn',
	    helplogger: 'helplogger',
	    header : 'header', 
	    footer : 'footer'}
    });
});

module.exports = router;
