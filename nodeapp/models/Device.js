var db = require('../lib/db');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':model:Device');

/** Device JSON schema. 
 * 
 *  The device type should be one of [ipad, iphone, macbook, imac, windows-pc, linux-pc, linux-laptop, windows-laptop, android-phone, android-tablet]
 *
 *  Devices can connect to the OpenVPN tunnel using login "username.type", 
 *  and the password associated to username (see User schema). 
 *
 *  Each devices is assigned a static IP 'vpn_ip' upon insertion.
 *
 *  Devices with defined 'removed' data, will not be able to login.
 */
var DeviceSchema = new db.Schema({
    username: {type:String, required: true, unique: false},
    type : {type:String, required: true, unique: false},
    platform : {type:String, required: true, unique: false},
    created: {type:Date, default: Date.now},
    removed: {type:Date, required: false},
//    vpn_static_ip : {type:String, required: true, unique: true}, TODO
    vpn_connections : {type:Number, default : 0},
    vpn_auth_failures : {type:Number, default : 0},
    vpn_bytes_sent : {type:Number, default : 0},
    vpn_bytes_recv : {type:Number, default : 0},
    vpn_conn_hours : {type:Number, default : 0.0},
    vpn_last_start: {type:Date},
    vpn_last_end: {type:Date},
    vpn_is_connected : {type:Boolean, default : false}
});

DeviceSchema.statics.getAllTypes = function() {
    return ['ipad', 'iphone', 'macbook', 'imac', 'android-phone', 'android-tablet', 'windows-laptop', 'windows-pc', 'linux-laptop', 'linux-pc'];
};

DeviceSchema.statics.getAllPlatforms = function() {
    return ['ios', 'darwin', 'linux', 'windows', 'android'];
};

DeviceSchema.statics.type2platform = function(type) {
    switch (type) {
    case 'ipad':
    case 'iphone':
	return 'ios';
	break;
    case 'android-phone':
    case 'android-tablet':
	return 'android';
	break;
    case 'macbook':
    case 'imac':
	return 'darwin';
	break;
    case 'windows-laptop': 
    case 'windows-pc': 
	return 'windows';
	break;
    case 'linux-laptop':
    case 'linux-pc':
	return 'linux';
	break;
    }
    return undefined;
};

DeviceSchema.statics.isMobilePlatform = function(platform) {
    return (platform === 'android' || platform === 'ios');
};

DeviceSchema.statics.findAllForUser = function(username, cb) {
    var Device = require('./Device');
    Device.find({username: username}, cb);    
};

DeviceSchema.methods.isMobilePlatform = function() {
    return (this.platform === 'android' || this.platform === 'ios');
};

/** Avg connection duration in minutes. */
DeviceSchema.virtual('vpn_avg_duration').get(function () {
    if (this.vpn_connections > 0)
	return (this.vpn_conn_hours * 60.0 / this.vpn_connections);
    else
	return 0.0;
});

var model = db.model('Device', DeviceSchema);

exports = module.exports = model;

