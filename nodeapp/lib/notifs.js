var _ = require('underscore');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':lib:notifs');
var emailer = require('../lib/emailer');
var Device = require('../models/Device');

var datemax = function(a,b) {
    if (a && b)
	return (a >= b ? a : b); 
    else
	return a || b;
};

// simple checker for user activity -- send emails to app.get('contact') if
// a user (device) is inactive for more than app.get('inactive') days.
var check = function() {
    var inactivelim = new Date(Date.now() - app.get('inactive')*86400*1000);
    debug("Checking for inactive devices, last active before " + inactivelim);

    Device.findAllDevices(function(err, devices) {
	if (err) {
	    // some db error - should not happen in prod ..
	    debug(err);
	    return;
	}

	_.each(devices, function(dev) {
	    // send email iff:
	    // 1) has not been done already
	    // 2) device has not been removed
	    // 3) - last connection was before the limit OR
	    //    - no connections and created before the limit
	    if (!dev.inactivity_notif_sent && 
		!dev.removed && 
		((dev.vpn_last_conn_start && 
		  datemax(dev.vpn_last_conn_start,
			  dev._vpn_last_conn_end) < inactivelim) ||
		 (dev.created < inactivelim))) 
	    {
		var opt = {
		    subject : '[UCN WEB ' + app.get('country') + '] Device Inactivity Notification',
		    text : 'Device "'+dev.login+
			'" has been inactive (i.e. no VPN connections) for more than '+
			app.get('inactive') +
			' days.\n\n' +
			'This is an automatic notification and is only sent once. To check the user details and to clear the \'email sent\' flag, login to the admin web site.\n\n' + 
			'-- ucnwebapp ' + app.get('country')
		};

		var cb = function(err, mailerres) {
		    if (err) {
			debug("sendmail error: " + err);
		    } else {
			dev.setnotif(function(error, dev) {});
		    }
		}
		emailer.ssendmail(opt, cb);	    
	    } // else everything OK
	});
    });    
};

if (app.get('inactive') && app.get('inactive')>0) {
    debug("Enable notifications, max inactivity " + 
	  app.get('inactive') + ' days');
    setInterval(check, 2*3600*1000); // check every 2 hours
    setTimeout(check, 2*60*1000);    // run first in 2min
}
