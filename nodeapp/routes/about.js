var express = require('express');
var router = express.Router();

/** Render the about page. */
router.all('/', function(req, res, next) {
    return res.render('about', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : false,
	pagetitle : res.__('about_pagetitle'),
	partials : { header : 'header', footer : 'footer'}
    });
});

module.exports = router;
