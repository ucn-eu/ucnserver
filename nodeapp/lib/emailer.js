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

// init mail transport
var mailtransport = nodemailer.createTransport(app.get('mailerconfig'));

var sendmail = function(req, res, opt, callback) {
    if (!opt.to)
	throw 'Missing destination email address';
    if (!opt.template)
	throw 'Missing template name';

    // pick the localized email template
    var template = templates[req.cookies.ucnlang+'_'+opt.template] || templates[app.get('default_locale')+'_'+opt.template];

    // sanity checking - should not happen in prod
    if (!template)
	throw 'Email template not found: '+opt.template;
	
    var mail = {
	from : opt.from || app.get('mailer'),
	bcc : opt.from || app.get('mailer'),
	to: opt.to,
	subject: res.__(opt.template+'_email_subject'),
	text: Mustache.render(template, opt),
	attachments: opt.attachments

    }

    debug('sendmail',mail);

    mailtransport.sendMail(mail,callback);
};

module.exports.sendmail = sendmail;

