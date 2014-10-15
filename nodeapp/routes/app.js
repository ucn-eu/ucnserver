var express = require('express');
var router = express.Router();
var app = require('../app');
var Device = require('../models/Device');
var debug = require('debug')(app.get('debugns')+':routes:app');

/** Handle app pings. Simple way for mobile activity collectors
 *  to be identified to belong to a particular user.
 */
router.all('/:uuid', function(req, res, next) {
    debug("app ping from " + req.params.uuid + "/" + req.ip);

    // find matching registered device based on the remote IP
    var q = { $or : [{vpn_udp_ip : req.ip}, {vpn_tcp_ip : req.ip}]};
    Device.findOne(q, function(err, device) {
	if (err) debug(err);
	if (device)
	    device.updateapp(req.params.uuid, function(err,d) { 
		if (err) debug(err);
	    });
	res.send(200);
    });
});

module.exports = router;
