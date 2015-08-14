var express = require('express');
var router = express.Router();
var app = require('../app');

router.all('*', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = (req.user !== undefined);
    robj.country = app.get('country');
    return res.render('uninstall', robj);
});

module.exports = router;
