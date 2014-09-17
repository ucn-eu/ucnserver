var app = require('../app');
var mongoose = require('mongoose');
var debug = require('debug')(app.get('debugns')+':lib:db');

mongoose.connect(app.get('mongouri'), function(err) {
    if (err) throw err;
    debug('Connected to ' + app.get('mongouri'));
});

module.exports = exports = mongoose;
