#!/usr/bin/python
"""
This script handles session logging for IPSEC. Called from /etc/ppp/ip-up.

Author: Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>
"""
import sys
import os
import time
import json
import logging
import pymongo
from pymongo import MongoClient
from datetime import datetime, timedelta

# -------------------------------
# Configure your backend here
mongohost = 'localhost'
mongoport = 27017
mongodb = "ucntest"
userc = "users"
devicec = "devices"
logc = "vpn_server_logs"
# -------------------------------

logging.basicConfig(level=logging.DEBUG,
                    filename='/var/log/ppp-ucn-up.log',
                    format='[%(asctime)s] %(levelname)s %(message)s')

def getenv(key):
    return os.environ[key] if key in os.environ else None

def connect():
    """
    Handle client-connect event
    """
    ip = getenv("PPP_REMOTE")
    if (ip == None):
        logging.error("missing PPP_REMOTE")
        return 1

    logging.debug("client-connect: ip=" + ip)

    try:
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]            

        ts = datetime.utcnow()
        device = db[devicec].find_one({"vpn_ipsec_ip":ip})

        if (device!=None):
            # log event
            r = {
                'remote' : ip,
                'username' : device[u'username'],
                'device' : device[u'devname'],
                'ts' : ts,
                'event' : 'connect',
                'success' : True,
                'local' : getenv("PPP_LOCAL"),
                'speed' : getenv("PPP_SPEED"),
                'tty' : getenv("PPP_TTY"),
                'iface' : getenv("PPP_IFACE"),
                'daemon' : 'ipsec'
            }

            logging.debug(r)
            db[logc].insert(r)
            
            # device stats
            if (not u'vpn_connections' in device):
                device['vpn_connections'] = 0
            device['vpn_connections'] += 1
            device['vpn_last_seen'] = ts
            db[devicec].save(device)
        else:
            logging.error("could not find device '%s'"%ip)

            # log event
            r = {
                'remote' : ip,
                'username' : device[u'username'],
                'device' : device[u'devname'],
                'ts' : ts,
                'event' : 'connect',
                'reason'  : 'device not found',
                'success' : False,
                'local' : getenv("PPP_LOCAL"),
                'speed' : getenv("PPP_SPEED"),
                'tty' : getenv("PPP_TTY"),
                'iface' : getenv("PPP_IFACE"),
                'daemon' : 'ipsec'
            }

            logging.debug(r)
            db[logc].insert(r)

        mongoc.close() 
    except Exception as e:
        logging.error("error when processing client-connect: " + str(e))

    # return success 
    return 0

if __name__ == '__main__':
    sys.exit(connect())
