#!/usr/bin/python
import sys
import os
import time
import json
import sqlite3
import logging
import pymongo
import dateutil.parser
from pymongo import MongoClient
from datetime import datetime, timedelta

"""
Read data from Mongo and export to a sqlite db.

Author: Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>
"""

#--- CONFIGS ----

# mongo db
mongohost = 'localhost'
mongoport = 27017
mongodb = "ucntest"

# target sqlite db
netdb = 'testdb.db'

#                    filename='/tmp/android_export.log',
logging.basicConfig(level=logging.DEBUG,
                    format='[%(asctime)s] %(levelname)s %(message)s')
#---- END ----

def createtables(conn):
    conn.execute('''CREATE TABLE IF NOT EXISTS PROCESSES
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER,
    foreground INTEGER,
    host CHAR(16),
    name  CHAR(128),
    bytessent INTEGER,
    bytesrecv INTEGER,
    starttime INTEGER,
    UNIQUE(ts, host, name) ON CONFLICT IGNORE);''')
                
    conn.execute('''CREATE TABLE IF NOT EXISTS NETDATA
    (ts INTEGER,
    host CHAR(16),
    wifiup  INTEGER,
    wifidown INTEGER,
    cellup INTEGER,
    celldown INTEGER,
    UNIQUE(ts, host, wifiup, wifidown, cellup, celldown) ON CONFLICT IGNORE);''')

def main():
    logging.info("exporting new data")

    try:
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]
        logging.debug("mongo %s:%d"%(mongohost, mongoport))

        dbconn = sqlite3.connect("%s" % netdb, check_same_thread = False)
        logging.debug("sqlite %s"%netdb)
        c = dbconn.cursor()

        # make sure the target tables are available
        createtables(dbconn)

        # first update any new android_uids
        for u in db['devices'].find({'android_uid' : {'$exists' : False},
                                     'type' : { '$in' : 
                                                ['android-tablet',
                                                 'android-phone']}},
                                    {'vpn_tcp_ip' : True,
                                     'vpn_udp_ip' : True}):
            logging.debug(u)

            # find uid of device that has reported a tunnel
            # interface with given static IP
            # FIXME: can fail if the devices run other VPNs ...
            crit = {
                'data.ip_addr_show' : {
                    '$elemMatch' : { 
                        'name' : 'tun0',
                        'ipv4.ip' : {'$in' : [u['vpn_tcp_ip'],u['vpn_udp_ip']]
                                 }}}}

            uid = db['network_state'].find_one(crit, {'uid' : True})

            if (uid!=None and 'uid' in uid):
                logging.info("map %s %s -> %s"%(u['_id'], 
                                                u['vpn_udp_ip'], 
                                                uid['uid']))

                db['devices'].update({'_id': u['_id']},
                                     { '$set' : {'android_uid' : uid['uid'] }})


        # check all devices for new data
        for u in db['devices'].find({'android_uid' : {'$exists' : True}},
                                    {'vpn_udp_ip': True,'android_uid': True}):

            # TODO: is this the right approach... or should
            # really use the current IP ?
            host = u['vpn_udp_ip']

            # network_state to NETDATA
            c.execute("SELECT MAX(ts) FROM NETDATA WHERE host=?",(host,))
            lastts = c.fetchone()[0]
                
            # get records with ts > lastts
            crit = {'uid' : u['android_uid'], 
                    'app_version_code' : 5, 
                    'ts' : {'$exists' : True}}

            if (lastts != None):
                dt = datetime.fromtimestamp(lastts)
                crit['ts'] = {"$gt":dt, "$exists":True}
                logging.debug("last insert at %d %s"%(lastts,dt.isoformat()))
                
            tuples = [] 
            for r in db['network_state'].find(crit).sort([('ts',1)]).limit(5000):
                if (not isinstance(r['ts'], datetime)):
                    continue

                ts = time.mktime(r['ts'].timetuple())
                logging.debug("insert record ts %d %s"%(ts,r['ts'].isoformat()))

                wifi = filter(lambda x: x['name'] == 'wlan0', r['data']['ip_addr_show'])
                wifitx = 0
                wifirx = 0
                if (len(wifi) > 0):
                    wifitx = wifi[0]['stats']['tx_bytes']
                    wifirx = wifi[0]['stats']['rx_bytes']
                    
                cell = filter(lambda x: x['name'] == 'rmnet0', r['data']['ip_addr_show'])
                celltx = 0
                cellrx = 0
                if (len(cell) > 0):
                    celltx = cell[0]['stats']['tx_bytes']
                    cellrx = cell[0]['stats']['rx_bytes']

                t = (ts, host, wifitx, wifirx, celltx, cellrx)
                tuples.append(t)
                logging.debug("NETDATA %d %s %d %d %d %d"%t)

            logging.debug('insert %d docs to NETDATA'%len(tuples))
            c.executemany("INSERT INTO NETDATA VALUES (?,?,?,?,?,?)",tuples)
            dbconn.commit()

            # *app* to PROCESSES
            c.execute("SELECT MAX(ts) FROM PROCESSES WHERE host=?",(host,))
            lastts = c.fetchone()[0]
                
            # get records with ts > lastts
            crit = {'uid' : u['android_uid'], 
                    'app_version_code' : 5, 
                    'ts' : {'$exists' : True}}

            if (lastts != None):
                dt = datetime.fromtimestamp(lastts)
                crit['ts'] = {"$gt":dt, "$exists":True}
                logging.debug("last insert at %d %s"%(lastts,dt.isoformat()))
                
            tuples = [] 
            for r in db['running_apps'].find(crit).sort([('ts',1)]).limit(5000):
                if (not isinstance(r['ts'], datetime)):
                    continue

                ts = time.mktime(r['ts'].timetuple())
                logging.debug("insert record ts %d %s"%(ts,r['ts'].isoformat()))

                for app in r['data']['runningTasks']:
                    fg = 0 
                    if app['task_foreground']:
                        fg = 1
                    t = (ts, fg, host, app['task_app_label'])
                    logging.debug("PROCESSES %d %d %s '%s'"%t)
                    tuples.append(t)

            logging.debug('insert %d docs to PROCESSES'%len(tuples))
            c.executemany("INSERT INTO PROCESSES(ts,foreground,host,name) VALUES (?,?,?,?)",tuples)
            dbconn.commit()

        mongoc.close()
        dbconn.close()
    except Exception as e:
        print e
        logging.error("error: " + str(e))

if __name__ == '__main__':
    main()


