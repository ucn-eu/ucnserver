var app = require('../app');
var mongoose = require('mongoose');
var debug = require('debug')(app.get('debugns')+':lib:db');

debug('Connecting to ' + app.get('mongouri'));
mongoose.connect(app.get('mongouri'));

var db = mongoose.connection;
db.on('error', function(err) {
    debug('Failed to connect to ' + app.get('mongouri'));
    if (err) throw err;
});

db.once('open', function() {
    debug('Connected to ' + app.get('mongouri'));
});

module.exports = exports = mongoose;