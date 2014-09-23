var ip = require('ip');
var db = require('../lib/db');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':model:Device');

var UDP_RANGE_START = '10.2.0.10';
var UDP_RANGE_END = ip.toLong('10.2.99.254');
var TCP_RANGE_START = '10.1.0.10';
var TCP_RANGE_END = ip.toLong('10.1.99.254');

/** Device JSON schema. 
 * 
 *  The device type should be one of [ipad, iphone, macbook, imac, windows-pc, 
 *  linux-pc, linux-laptop, windows-laptop, android-phone, android-tablet]
 *
 *  Devices can connect to the OpenVPN tunnel using login "username.type", 
 *  and the password associated to username (see User schema). 
 *
 *  Devices with defined 'removed' data, will not be able to login.
 */
var DeviceSchema = new db.Schema({
    username: {type:String, required: true, unique: false},
    type : {type:String, required: true, unique: false},
    platform : {type:String, required: true, unique: false},
    created: {type:Date, default: Date.now},
    removed: {type:Date, required: false},
    vpn_udp_ip : {type:String, required: true, unique: true},
    vpn_tcp_ip : {type:String, required: true, unique: true},
    vpn_mask : {type:String, required: true, unique: false},
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

DeviceSchema.pre('validate', function(next) {
    var device = this;
    if (device.isNew) {
	var Device = require('./Device');
	Device
	    .find()
	    .sort('-created')
	    .limit(1)
	    .select('vpn_udp_ip vpn_tcp_ip')
	    .exec(function(err, dev) {    
		if (err) next(err);
		if (dev.length>0) {
		    // next free UDP
		    dev = dev[0]
		    tmp = ip.toLong(dev.vpn_udp_ip);
		    tmp += 1;
		    device.vpn_udp_ip = ip.fromLong(tmp);
		    if (device.vpn_udp_ip > UDP_RANGE_END) // should not happen
			next(new Error('Run out of UDP addresses'));

		    // next free TCP
		    tmp = ip.toLong(dev.vpn_tcp_ip);
		    tmp += 1;
		    device.vpn_tcp_ip = ip.fromLong(tmp);
		    if (device.vpn_tcp_ip > TCP_RANGE_END) // should not happen
			next(new Error('Run out of TCP addresses'));
		} else {
		    device.vpn_tcp_ip = TCP_RANGE_START;
		    device.vpn_udp_ip = UDP_RANGE_START;
		}
		device.vpn_mask = '255.255.0.0'
		debug(JSON.stringify(device));
		next();
	    });
    } else {
	next();
    }
});

/** Avg connection duration in minutes. */
DeviceSchema.virtual('vpn_avg_duration').get(function () {
    if (this.vpn_connections > 0 && !this.vpn_is_connected)
	return (this.vpn_conn_hours * 60.0 / this.vpn_connections);
    else if (this.vpn_connections > 1 && this.vpn_is_connected)
	return (this.vpn_conn_hours * 60.0 / (this.vpn_connections - 1));
    else
	return 0.0;
});

var model = db.model('Device', DeviceSchema);

exports = module.exports = model;

