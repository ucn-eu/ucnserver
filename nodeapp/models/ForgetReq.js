var db = require('../lib/db');
var app = require('../app');
var debug = require('debug')(app.get('debugns')+':model:ForgetReq');

/** ForgetReq JSON schema. */
var ForgetReqSchema = db.Schema({
    login : {type:String, required: true},    // who ?
    requested: {type:Date, default: Date.now},   // when ?
    duration: {type:Number, required: false}     // how long, in seconds from requested ts
});

var model = db.model('ForgetReq', ForgetReqSchema);
exports = module.exports = model;