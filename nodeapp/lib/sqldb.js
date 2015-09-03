var app = require('../app');
var debug = require('debug')(app.get('debugns')+':lib:sqldb');
var pg = require('pg');
var util = require('util');

// SQL DB helpers.

var connstr = undefined;
if (app.get('sqldb_database')) {
    connstr = util.format('postgres://%s:%s@%s/%s', 
        app.get('sqldb_username'), 
        app.get('sqldb_password'), 
        app.get('sqldb_server'),
        app.get('sqldb_database'));

    debug('use SQL DB: ' + connstr);
}

/** Add new device to the SQL DB. */
var addDevice = exports.addDevice = function(dev, os, cb) {
    if (!connstr) {
        debug("no SQL DB configured");
        return;
    }

    var client = new pg.Client(connstr);

    var done = function(err) {
        if (client) client.end();
        if (cb) cb(err, true);
    }

    client.connect(function(err) {
        if (err) {
            debug('could not connect to ' + app.get('sqldb'), err);
            return done(err);
        }

        var q = util.format('INSERT INTO devices (devicename, collector, os) VALUES (%s, %s, %s) RETURNING id;', dev.login, 'vpn', os);
        client.query(q, function(err, result) {
            if (err) {
                debug('sql insert error', err);
                return done(err);
            }

            var deviceid = result.rows[0].id;

            q = util.format('INSERT INTO vpnips VALUES (%s, %s);', deviceid, dev.vpn_tcp_ip);
            client.query(q, function(err, result) {
                if (err) {
                    debug('sql insert error', err);
                    return done(err);
                }
                q = util.format('INSERT INTO vpnips VALUES (%s, %s);', deviceid, dev.vpn_udp_ip);
                client.query(q, function(err, result) {
                    if (err) {
                        debug('sql insert error', err);
                        return done(err);
                    }
                    q = util.format('INSERT INTO vpnips VALUES (%s, %s);', deviceid, dev.vpn_ipsec_ip);
                    client.query(q, function(err, result) {
                        if (err) {
                            debug('sql insert error', err);
                            return done(err);
                        }
                        // all done
                        done();
                    });
                });
            });
        });
    });
};