var express = require('express');
var router = express.Router();
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':routes:about');

/** Render the various forms. */
router.all('/:what', function(req, res, next) {
    var doc = req.params.what;
    if (!doc)
	return next(new Error(res.__('error_not_found')));

    var l = (req.cookies.ucnlang ? req.cookies.ucnlang : app.get('default_locale'));

    var robj = res.locals.renderobj;
    robj.url = '/ucn/docs/' + l + '/' + doc + ".pdf";
    robj.partials.body = 'forms/' + l + '_' + doc;
    robj.loggedin = (req.user!==undefined);
    return res.render('about', robj);
});

module.exports = router;
