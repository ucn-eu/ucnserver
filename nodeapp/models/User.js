var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var fs = require('fs');
var bcrypt = require('bcrypt');
var db = require('../lib/db');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':model:User');

// increasing this will make the password hashes harder to brute force
// (the algo becomes slower)
var SALT_WORK_FACTOR = 10;

/** User JSON schema.
 *  
 *  The 'username' + 'password' are used to login to the portal. 
 *  The same password is also used for each device of this user 
 *  (see Device schema).
 *
 *  If the account is tagged as 'removed', all logins are disabled 
 *  (and passwd reminder will not work). Accounts can be removed 
 *  (or re-activated) only by the admin.
 */
var UserSchema = new db.Schema({
    username: {type:String, required: true, unique: true},
    password: {type:String, required: true, unique: true},
    email: {type:String, required: false, unique: true},
    familyname: {type:String, required: false, unique: false},
    isadmin: {type:Boolean, default : false, required: true},
    created: {type:Date, default: Date.now},
    updated: {type:Date, default: Date.now},
    removed: {type:Date, required: false},
    resetpasswdtoken: {type:String, required: false, unique: false}
});

/** Create password token. */
UserSchema.methods.resetpasswdreq = function(cb) {
    // generate unique random token for resetting the password
    var md5 = crypto.createHash('md5').update(this.username);
    md5.update('_'+Date.now());
    md5.update('_'+Math.random()*1000);
    this.resetpasswdtoken = md5.digest('hex');
    this.save(cb);
};

/** Reset password. */
UserSchema.methods.resetpassword = function(newpassword, cb) {
    this.password = newpassword;
    this.resetpasswdtoken = undefined;
    this.save(cb);
};

/** Remove user. */
UserSchema.methods.remove = function(cb) {
    if (!this.removed) {
	this.removed = Date.now();
	this.save(cb);
    } else {
	cb(null, this);
    }
};

/** Un-temove user. */
UserSchema.methods.unremove = function(cb) {
    if (this.removed) {
	this.removed = undefined;
	this.save(cb);
    } else {
	cb(null, this);
    }
};

UserSchema.pre('save', function(next) {
    var user = this;

    // timestamp & version the modifs
    user.updated = Date.now();
    user.increment();
    
    if (!user.isModified('password')) return next();

    // override the cleartext password with the hashed one
    bcrypt.hash(user.password, SALT_WORK_FACTOR, function(err, hash) {
        if (err) return next(err);
	debug('new password: ' + user.password);
	debug('new password hash: ' + hash);
        user.password = hash;
        return next();
    });
});

UserSchema.statics.localStrategy = new LocalStrategy(
    // options
    {
	usernameField: 'username',
        passwordField: 'password',
    },
    // verify method
    function (username, password, done) {
	var User = require('./User');
	var spec = {username: username, removed: undefined};
        User.findOne(spec, function(err, user) {
            if (err) { 
		// some db error, should not happen in prod
		debug(err);
		return done(err, false); 
	    } else if (!user) {
		// invalid username or removed
		debug('user ' + username + ' not found');
                return done(null, false);
            }

	    // make sure there's no whitespace
	    password = password.trim();
	    bcrypt.compare(password, user.password, function(err2, res) {
		if (err2) { 
		    debug('passwd compare error: ' + err2);
		    return done(err2, false); 
		}

		// invalid password or return user if all ok
		if (!res)
		    debug('invalid password');
		return done(null, (res ? user : false));
            });
        });
    }
);

UserSchema.statics.serializeUser = function(user, done) {
    done(null, user._id);
};

UserSchema.statics.deserializeUser = function(userid, done) {
    var User = require('./User');
    User.findById(userid, function(err, user) {
        done(err,user);
    });
};

var model = db.model('User', UserSchema);

exports = module.exports = model;
