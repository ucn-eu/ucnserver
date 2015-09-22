var express = require('express');
var router = express.Router();
var _ = require('underscore');
var moment = require('moment');
var Device = require('../models/Device');
var ForgetReq = require('../models/ForgetReq');
var app = require('../app');
var emailer = require('../lib/emailer');
var debug = require('debug')(app.get('debugns')+':routes:users');

/* All requests to the /ucn/users go to here first. Make sure we have an 
 * authenticated user in the req. 
 */
 router.use(function(req, res, next) {
    if (!req.user) {
       var robj =  res.locals.renderobj;
       robj.loggedin = false;
       robj.error = res.__('error_not_authorized');
       return res.render('login', robj);
   }
   next();
});

/* Show index page with device list. */
router.get('/', function(req, res, next) {
    Device.findDevicesForUser(req.user.username, function(err, devices) {
       if (err) {
    	    // some db error - should not happen in prod ..
    	    debug(err);
    	    err.status = 500;
    	    return next(err);
    	}

    	var robj =  res.locals.renderobj;
    	robj.loggedin = true;
    	robj.devices = devices;
    	robj.vizurl = app.get('vizurl');
        robj.forgetoptions = [
            { name : 'Last ' + moment().subtract(10,'minutes').fromNow(true), value : 10*60 },
            { name : 'Last ' + moment().subtract(30,'minutes').fromNow(true), value : 30*60 },
            { name : 'Last ' + moment().subtract(60,'minutes').fromNow(true).replace('an ','').replace('a ',''), value : 60*60 },
            { name : 'Last ' + moment().subtract(24,'hours').fromNow(true).replace('an ','').replace('a ',''), value : 24*60*60 }
        ];
    	return res.render('uindex', robj);
    }); // findAll
});

/* Handle forget request and re-render dev list. */
router.post('/', function(req, res, next) {     
    var render = function(succ) {
        Device.findDevicesForUser(req.user.username, function(err, devices) {
            if (err) {
                // some db error - should not happen in prod ..
                debug(err);
                err.status = 500;
                return next(err);
            }

            var robj =  res.locals.renderobj;

            if (succ !== undefined) { // defined for forget reqs
                if (succ) {
                    robj.success = true;
                } else {
                    robj.error = true;
                }
            }   

            robj.loggedin = true;
            robj.devices = devices;
            robj.vizurl = app.get('vizurl');
            robj.forgetoptions = [
                { name : 'Last ' + moment().subtract(10,'minutes').fromNow(true), value : 10*60 },
                { name : 'Last ' + moment().subtract(30,'minutes').fromNow(true), value : 30*60 },
                { name : 'Last ' + moment().subtract(60,'minutes').fromNow(true).replace('an ','').replace('a ',''), value : 60*60 },
                { name : 'Last ' + moment().subtract(24,'hours').fromNow(true).replace('an ','').replace('a ',''), value : 24*60*60 }
            ];
            return res.render('uindex', robj);
        }); // findAll
    }

    if (req.body.forgetlast) {
        var login = req.body.login;
        var last = parseInt(req.body.forgetlast);
        debug("forgetting " + login + " for last " + last + " seconds ... ");

        var r = new ForgetReq({ login : login, duration : last});
        r.save(function (err, r) {
            if (err) {
                // some db error - should not happen in prod ..
                debug(err);
                return render(false);
            }

            // send a notification email aswell
            var opt = {
               subject : '[UCN WEB ' + app.get('country') + '] Forget Request',
               text : 'User "'+req.user.username+
               '" requested us to forget some data:\n'+
               'Device login: '+login+'\n'+
               'Duration (s): '+last+'\n\n'+
               '-- ucnwebapp ' + app.get('country')
            };

            // email callback
            var cb = function(err, mailerres) {
                if (err) {
                  debug("sendmail error: " + err);
                }
                return render(true);
            };
            emailer.ssendmail(opt, cb);            
        }); // save
    } else {
        return render(); // should not happen ..
    }
});

/* Show account mgmt page. */
router.get('/account', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = true;
    robj.vizurl = app.get('vizurl');
    return res.render('uaccount', robj);
});

 /* Handle account mgmt actions. */
 router.post('/account', function(req, res, next) {
    var robj =  res.locals.renderobj;
    robj.loggedin = true;
    robj.vizurl = app.get('vizurl');

    if (req.body.submitpw) {
        if (!req.body.password || req.body.password.trim().length <= 0) {
           robj.error = res.__('error_missing_password');
           return res.render('uaccount', robj);
        }

        req.user.resetpassword(req.body.password.trim(), function(err, user) {
           if (err) {
        		// some db error - should not happen in prod ..
        		debug(err);
        		err.status = 500;
        		return next(err);
           }

           robj.success = res.__('account_change_password_succ');
           return res.render('uaccount', robj);
        });
    } else if (req.body.submitunreg) {
        var opt = {
           subject : '[UCN WEB ' + app.get('country') + '] Withdraw Request',
           text : 'User "'+req.user.username+
           '" requested to quit the study:\n'+
           'Email: '+req.user.email+'\n'+
           'Familyname: '+req.user.familyname+'\n\n'+
           '-- ucnwebapp ' + app.get('country')
        };

    	// email callback
    	var cb = function(err, mailerres) {
            if (err) {
              debug("sendmail error: " + err);
              robj.error = res.__('account_unregister_fail');
              } else {
                  robj.success = res.__('account_unregister_succ');
              }
              return res.render('uaccount', robj);
           };
        emailer.ssendmail(opt, cb);
    } else {
    	return res.render('uaccount', robj);
    }
});

module.exports = router;