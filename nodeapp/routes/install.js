var express = require('express');
var router = express.Router();
var app = require('../app');

/** Links. */
router.all('/:what', function(req, res, next) {
    var dev = req.params.what;
    var robj =  res.locals.renderobj;
    robj.loggedin = (req.user !== undefined);
    robj.country = app.get('country');
    robj.isandroid = (dev && dev==='android');
    robj.isios = (dev && dev==='ios');
    robj.islinux = (dev && dev==='linux');
    robj.iswin = (dev && dev==='win');
    robj.isosx = (dev && dev==='darwin');
    return res.render('install', robj);
});

/** Default. */
router.all('*', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = (req.user !== undefined);
    robj.country = app.get('country');
    return res.render('install', robj);
});

module.exports = router;
