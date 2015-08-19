var express = require('express');
var router = express.Router();
var app = require('../app');

router.all('*', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = (req.user !== undefined);
    robj.country = app.get('country');
    robj.vpnserver = app.get('vpnserver');
    robj.vpnkey = app.get('vpnkey');
    return res.render('install', robj);
});

module.exports = router;
