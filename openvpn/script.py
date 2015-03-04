#!/usr/bin/python
"""
This script handles client authentication and session logging for OpenVPN.

Configure in the server.conf:

  client-cert-not-required
  username-as-common-name
  tmp-dir /tmp
  auth-user-pass-verify script.py via-env|via-file
  client-connect script.py
  client-disconnect script.py

Check the db conf below.

Author: Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>
"""
import sys
import os
import time
import json
import logging
import bcrypt
import pymongo
from pymongo import MongoClient
from datetime import datetime, timedelta

# -------------------------------
# Configure your backend here
mongohost = 'ucn.inria.fr'
mongoport = 27017
mongodb = "ucnexp"
userc = "users"
devicec = "devices"
logc = "vpn_server_logs"
# -------------------------------

logging.basicConfig(level=logging.DEBUG,
                    filename='/var/log/openvpn/script.log',
                    format='[%(asctime)s] %(levelname)s %(message)s')

def read_credentials(fn):
    """
    Get the password to authenticate from the file provided as argument.
    """
    username = None
    password = None
    with open(fn) as f:
        username = f.readline().strip()
        password = f.readline().strip()
    return (username,password)

def getenv(key):
    return os.environ[key] if key in os.environ else None

def auth():
    """
    Authenticate given user.
    """

    # try via-env
    password = getenv("password")
    username = getenv("username")
    if (password==None and username==None and len(sys.argv) == 2):
        # try via-file
        (username,password) = read_credentials(sys.argv[1])

    if (password == None or username == None):
        # nothing worked
        logging.error("missing password or username")
        return 1

    logging.debug("auth-user-pass-verify: username=" + username)

    retval = 1 # by default returns error
    try:
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]

        ts = datetime.utcnow()
        device = db[devicec].find_one({"login" : username})
        user = None
        if (device != None):
            user = db[userc].find_one({"username": device[u'username']})
               
        if (device == None or user == None or not (u'password' in user)):
            # not found - stop here
            logging.warn("no such user or device '%s'"%username)

            # log
            r = {'common_name' : username,
                 'ts' : ts,
                 'event' : 'auth',
                 'success' : False,
                 'reason' : 'invalid user',
                 'proto' : getenv("proto"),
                 'dev' : getenv("dev"),
                 'config' : getenv("config"),
                 'ifconfig_local' : getenv("ifconfig_local"),
                 'ifconfig_remote' : getenv("ifconfig_remote"),
                 'untrusted_client_ip' : getenv("untrusted_ip")}
            
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

            mongoc.close()
            return retval
            
        if (user[u'isadmin'] or u'removed' in device or u'removed' in user):
            # admin, not active or removed
            logging.warn("user '%s' account not allowed to login"%username)

            # dev stats
            if (not u'vpn_auth_failures' in device):
                device['vpn_auth_failures'] =  0
            device['vpn_auth_failures'] += 1
            device['vpn_last_seen'] = ts
            db[devicec].save(device)

            # log
            r = {'common_name' : username,
                 'username' : device[u'username'],
                 'device' : device[u'devname'],
                 'ts' : ts,
                 'event' : 'auth',
                 'success' : False,
                 'reason' : 'not allowed',
                 'proto' : getenv("proto"),
                 'dev' : getenv("dev"),
                 'config' : getenv("config"),
                 'ifconfig_local' : getenv("ifconfig_local"),
                 'ifconfig_remote' : getenv("ifconfig_remote"),
                 'untrusted_client_ip' : getenv("untrusted_ip")}
            
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

            mongoc.close()
            return retval

        # check password
        hashed = user[u'password'].encode('ascii', 'ignore') 
        if (bcrypt.hashpw(password, hashed) == hashed):
            # set success now, will be success even if logging
            # fails for whatev reason
            retval = 0

            # dev stats
            if (not u'vpn_auths' in device):
                device['vpn_auths'] =  0
            device['vpn_auths'] += 1;
            device['vpn_last_seen'] = ts
            db[devicec].save(device)

            # log
            r = {'common_name' : username,
                 'username' : device[u'username'],
                 'device' : device[u'devname'],
                 'ts' : ts,
                 'event' : 'auth',
                 'success' : True,
                 'proto' : getenv("proto"),
                 'dev' : getenv("dev"),
                 'config' : getenv("config"),
                 'ifconfig_local' : getenv("ifconfig_local"),
                 'ifconfig_remote' : getenv("ifconfig_remote"),
                 'untrusted_client_ip' : getenv("untrusted_ip")}
            
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

        else:
            logging.warn("user '%s' invalid password"%username)
            # dev stats
            if (not u'vpn_auth_failures' in device):
                device['vpn_auth_failures'] =  0
            device['vpn_auth_failures'] += 1;
            device['vpn_last_seen'] = ts
            db[devicec].save(device)

            # log
            r = {'common_name' : username,
                 'username' : device[u'username'],
                 'device' : device[u'devname'],
                 'ts' : ts,
                 'event' : 'auth',
                 'success' : False,
                 'reason' : 'invalid password',
                 'proto' : getenv("proto"),
                 'dev' : getenv("dev"),
                 'config' : getenv("config"),
                 'ifconfig_local' : getenv("ifconfig_local"),
                 'ifconfig_remote' : getenv("ifconfig_remote"),
                 'untrusted_client_ip' : getenv("untrusted_ip")}
            
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

        mongoc.close()            

    except Exception as e:
        logging.error("error when authenticating: " + str(e))

    return retval

def connect():
    """
    Handle client-connect event
    """
    tmpfile = sys.argv[1]
    cn = getenv("common_name")
    if (cn == None):
        logging.error("missing common_name")
        return 1

    logging.debug("client-connect: cn=" + cn)
    logging.debug('cli-config ' + tmpfile)

    try:
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]            

        ts = datetime.utcnow()
        device = db[devicec].find_one({"login":cn})

        if (device!=None):
            # log event
            r = {
                'common_name' : cn,
                'username' : device[u'username'],
                'device' : device[u'devname'],
                'ts' : ts,
                'event' : 'connect',
                'success' : True,
                'proto' : getenv("proto"),
                'dev' : getenv("dev"),
                'config' : getenv("config"),
                'ifconfig_local' : getenv("ifconfig_local"),
                'ifconfig_remote' : getenv("ifconfig_remote"),
                'trusted_client_ip' : getenv("trusted_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_local_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_remote_ip"),
                'ifconfig_push_mask' : device['vpn_mask']
            }            
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
            r['ifconfig_push_local_ip'] = device['vpn_'+r['proto']+'_ip'];
                        
            logging.debug(r)
            db[logc].insert(r)

            # device stats
            if (not u'vpn_connections' in device):
                device['vpn_connections'] = 0
            device['vpn_connections'] += 1
            device['vpn_last_seen'] = ts
            db[devicec].save(device)
                
            # write static ip to the cli config file
            if (tmpfile!=None):
                cfg = 'ifconfig-push %s %s\n'%(r['ifconfig_push_local_ip'], r['ifconfig_push_mask'])
                logging.debug(cfg)
                f = open(tmpfile, 'w')
                f.write(cfg)
                f.flush()
                f.close()                    
        else:
            logging.error("could not find device '%s'"%cn)
            # log event
            r = {
                'common_name' : cn,
                'ts' : ts,
                'event' : 'connect',
                'success' : False,
                'reason'  : 'device not found',
                'proto' : getenv("proto"),
                'dev' : getenv("dev"),
                'config' : getenv("config"),
                'ifconfig_local' : getenv("ifconfig_local"),
                'ifconfig_remote' : getenv("ifconfig_remote"),
                'trusted_client_ip' : getenv("trusted_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_local_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_remote_ip")
            }
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

        mongoc.close() 
    except Exception as e:
        logging.error("error when processing client-connect: " + str(e))

    # return success 
    return 0

def disconnect():
    """
    Handle client-disconnect
    """
    cn = getenv("common_name")
    if (cn == None):
        logging.error("missing common_name")
        return 1

    logging.debug("client-disconnect: cn=" + cn)
    try:
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]
            
        ts = datetime.utcnow()
        device = db[devicec].find_one({"login":cn})
        if (device!=None):
            # log event
            r = {
                'common_name' : cn,
                'username' : device[u'username'],
                'device' : device[u'devname'],
                'ts' : ts,
                'event' : 'disconnect',
                'success' : True,
                'proto' : getenv("proto"),
                'dev' : getenv("dev"),
                'config' : getenv("config"),
                'ifconfig_local' : getenv("ifconfig_local"),
                'ifconfig_remote' : getenv("ifconfig_remote"),
                'trusted_client_ip' : getenv("trusted_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_local_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_remote_ip")
            }
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
            if (r['proto'].find('tcp')>=0):
                r['proto'] = 'tcp'

            tx = getenv("bytes_sent")
            if (tx == None):
                tx = 0
            else:
                tx = long(tx)
            r['bytes_sent'] = tx;
            rx = getenv("bytes_received")
            if (rx == None):
                rx = 0
            else:
                rx = long(rx)
            r['bytes_received'] = rx

            logging.debug(r)
            db[logc].insert(r)

            # dev stats
            if (not u'vpn_disconnections' in device):
                device['vpn_disconnections'] = 0
            device['vpn_disconnections'] += 1

            if (not u'vpn_bytes_sent' in device):
                device['vpn_bytes_sent'] = 0
            device['vpn_bytes_sent'] += tx

            if (not u'vpn_bytes_recv' in device):
                device['vpn_bytes_recv'] = 0
            device['vpn_bytes_recv'] += rx

            device['vpn_last_seen'] = ts
            db[devicec].save(device)

        else:
            logging.error("could not find device '%s'"%cn
)
            # log event
            r = {
                'common_name' : cn,
                'ts' : ts,
                'event' : 'disconnect',
                'success' : False,
                'reason' : 'device not found',
                'proto' : getenv("proto"),
                'dev' : getenv("dev"),
                'config' : getenv("config"),
                'ifconfig_local' : getenv("ifconfig_local"),
                'ifconfig_remote' : getenv("ifconfig_remote"),
                'trusted_client_ip' : getenv("trusted_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_local_ip"),
                'ifconfig_pool_local_ip' : getenv("ifconfig_pool_remote_ip"),
                'bytes_sent' : long(getenv("bytes_sent")),
                'bytes_received' : long(getenv("bytes_received"))
            }
            if (r['proto'] == None):
                r['proto'] = getenv("proto_1")
                if (r['proto'].find('tcp')>=0):
                    r['proto'] = 'tcp'
                        
            logging.debug(r)
            db[logc].insert(r)

        mongoc.close() 
    except Exception as e:
        logging.error("error when processing client-disconnect: " + str(e))

    # return success
    return 0

def main():
    script = getenv("script_type")

    logging.debug("handling '%s'"%script)

    ret = 1
    if (script and script == "user-pass-verify"):
        ret = auth()
    elif (script and script == "client-connect"):
        ret = connect()        
    elif (script and script == "client-disconnect"):
        ret = disconnect()        
    else:
        logging.error("Unknown or missing script_type: " + str(script))
    logging.debug("return %d"%ret)
    return ret

if __name__ == '__main__':
    sys.exit(main())
