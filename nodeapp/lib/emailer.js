var Mustache = require('mustache');
var nodemailer = require("nodemailer");
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':lib:emailer');

// init email template cache on load
var templates = {};
debug(JSON.stringify(app.get('available_locales')));

_.each(app.get('available_locales'), function(l) {
    _.each(['welcome_email.tmpl','passwd_email.tmpl'], function(fn) {
		fn = l + '_' + fn;
		var fullname = path.join(__dirname, '..', 'views','emails', fn);
		if (fs.existsSync(fullname)) {
		    var name = fn.replace('_email.tmpl','');
		    var tmpl = fs.readFileSync(fullname, 'utf8');
		    Mustache.parse(tmpl);
		    templates[name] = tmpl;
		    debug("email template '" + name + "' added");
		}
    });
});

var mailtransport = undefined;
if (app.get('mailerconfig')) {
	mailtransport = nodemailer.createTransport(app.get('mailerconfig'));
} else {
	debug('no mailerconfig -- not sending emails');
}

// sendmail with full localization support
var sendmail = function(req, res, opt, callback) {
    if (!opt.to)
		throw 'Missing destination email address';

    if (opt.template) {
		// pick the localized email template
		var template = templates[req.cookies.ucnlang+'_'+opt.template] || templates[app.get('default_locale')+'_'+opt.template];

		// sanity checking - should not happen in prod
		if (!template)
		    throw 'Email template not found: '+opt.template;

		opt.text = Mustache.render(template, opt);
		opt.subject = res.__(opt.template+'_email_subject');
    }
	
    var mail = {
		to: opt.to,
		from : opt.from || app.get('mailer'), 
		bcc : opt.bcc || app.get('contact'),	
		subject: opt.subject || 'no subject',
		text: opt.text,
		attachments: opt.attachments
    }
    debug('sendmail',mail);
    if (mailtransport)
	    mailtransport.sendMail(mail,callback);
	else
		setTimeout(callback, 0, undefined, true); // for debugging - pretend we sent it
};
module.exports.sendmail = sendmail;

// simple send mail for admin stuff (sent to the mailing list by default)
var ssendmail = function(opt, callback) {
    var mail = {
		to: opt.to || app.get('contact'),
		from : opt.from || app.get('mailer'), 
		subject: opt.subject || 'no subject',
		text: opt.text
    }
    debug('sendmail',mail);
    if (mailtransport)
	    mailtransport.sendMail(mail,callback);
	else
		setTimeout(callback, 0, undefined, true); // for debugging - pretend we sent it
};
module.exports.ssendmail = ssendmail;