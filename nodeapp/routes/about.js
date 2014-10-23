var express = require('express');
var router = express.Router();
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:about');

/** Render the various forms. */
router.all('/:what', function(req, res, next) {
    var doc = req.params.what;
    debug(doc);
    if (!doc)
	return next(new Error("error_not_found"));

    var name = 'forms/' + (req.cookies.ucnlang ? req.cookies.ucnlang : app.get('default_locale')) + '_' + doc;
    var url = '/ucn/docs/' + (req.cookies.ucnlang ? req.cookies.ucnlang : app.get('default_locale')) + '/' + doc + ".pdf";
    debug(name);
    return res.render('about', {
	locale_fr : (req.cookies.ucnlang === 'fr' ? true : false),
	loggedin : (req.user ? true : false),
	url : url,
	partials : { header : 'header', footer : 'footer', body : name}
    });
});

module.exports = router;
