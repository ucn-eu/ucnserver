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

TODO: currently supports only mongodb, add SQL backend

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
mongohost = 'ucn'
mongoport = 27017
mongodb = "ucnexp"
userc = "users"
devicec = "devices"
logc = "vpn_server_logs"
# -------------------------------

logging.basicConfig(level=logging.WARNING,
                    filename='/var/log/openvpn/script.log',
                    format='[%(asctime)s] %(levelname)s %(message)s')

def read_credentials():
    """
    Get the password to authenticate from the file provided as argument.
    """
    username = None
    password = None
    with open(sys.argv[1]) as f:
        username = f.readline().strip()
        password = f.readline().strip()
    return (username,password)

def getenv(key):
    return os.environ[key] if key in os.environ else None

def main():
    script = getenv("script_type")
    retval = 1 # by default return error

    logging.debug("handling '%s'"%script)
    logging.debug(str(os.environ))
    logging.debug(str(sys.argv))

    if (script and script == "user-pass-verify"):
        # via-env ?
        password = getenv("password")
        username = getenv("username")

        # via-file ?
        if (password==None and username==None and len(sys.argv) == 2):
            (username,password) = read_credentials()

        if (password == None or username == None):
            logging.error("missing password or username")
            return 1

        logging.debug("auth-user-pass-verify: username=" + username + 
                      " password="+password)

        try:
            mongoc = MongoClient(mongohost, mongoport)
            db = mongoc[mongodb]

            (uname,dname) = username.split('.')
            user = db[userc].find_one({"username": uname})
            device = db[devicec].find_one({
                    "username": uname, 
                    "type": dname})

            if (device != None and user != None and  u'password' in user):
                if (user[u'isactivated'] and not user[u'isadmin'] and not u'removed' in device and not u'removed' in user):

                    hashed = user[u'password'].encode('ascii', 'ignore') 
                    if (bcrypt.hashpw(password, hashed) == hashed):
                        # set success now, will be success even if logging
                        # fails for whatev reason
                        retval = 0

                        # store succesful authentication to the db
                        r = {'common_name' : username,
                             'username' : uname,
                             'device' : dname,
                             'authenticated' : datetime.utcnow(),
                             'proto' : getenv("proto"),
                             'dev' : getenv("dev"),
                             'config' : getenv("config"),
                             'ifconfig_local' : getenv("ifconfig_local"),
                             'ifconfig_remote' : getenv("ifconfig_remote"),
                             'untrusted_client_ip' : getenv("untrusted_ip")}

                        if (r['proto'] == None):
                            r['proto'] = getenv("proto_1")

                        logging.debug(r)
                        db[logc].insert(r)

                        # dev stats
                        device['vpn_connections'] += 1;
                        device['vpn_last_start'] = None
                        device['vpn_last_end'] = None
                        device['vpn_is_connected'] = False
                        db[devicec].save(device)
                    else:
                        logging.warn("user '%s' invalid password"%username)
                        # dev stats
                        device['vpn_auth_failures'] += 1;
                        db[devicec].save(device)
                else:
                    # admin, not active or removed
                    logging.warn("user '%s' account not allowed to login"%username)
                    # dev stats
                    device['vpn_auth_failures'] += 1;
                    db[devicec].save(device)
            else:
                logging.warn("no such user or device '%s'"%username)

            mongoc.close()            
        except Exception as e:
            logging.error("error when authenticating: " + str(e))

    elif (script and script == "client-connect"):
        tmpfile = sys.argv[1]
        cn = getenv("common_name")
        if (cn == None):
            logging.error("missing common_name")
            return 1

        retval = 0
        logging.debug("client-connect: cn=" + cn)

        try:
            mongoc = MongoClient(mongohost, mongoport)
            db = mongoc[mongodb]
            
            # find the auth record and update connection
            spec = {"common_name": cn, "connected" : { "$exists" : False }}
            r = db[logc].find_one(spec,
                                  sort=[('authenticated', pymongo.DESCENDING)])

            (uname,dname) = cn.split('.')
            device = db[devicec].find_one({
                    "username": uname, 
                    "type": dname})

            if (r!=None and device!=None):
                r['connected'] = datetime.utcnow()
                r['trusted_client_ip'] = getenv("trusted_ip")
                r['ifconfig_pool_local_ip'] = getenv("ifconfig_pool_local_ip") 
                r['ifconfig_pool_local_ip'] = getenv("ifconfig_pool_remote_ip")
                # static device config 
                r['ifconfig_push_local_ip'] = device['vpn_'+r['proto']+'_ip']
                r['ifconfig_push_mask'] = device['vpn_mask']
                db[logc].save(r)
                logging.debug(r)

                device['vpn_last_start'] = r['connected']
                device['vpn_is_connected'] = True
                db[devicec].save(device)
                
                # write static ip to the cli config file
                if (tmpfile!=None):
                    cfg = 'ifconfig-push %s %s\n'%(r['ifconfig_push_local_ip'], r['ifconfig_push_mask'])
                    f = open(tmpfile, 'w')
                    f.write(cfg)
                    logging.debug(cfg)
                    f.flush()
                    f.close()                    
            else:
                logging.error("could not find log record or device for user '%s'"%cn)

            mongoc.close() 
        except Exception as e:
            logging.error("error when processing client-connect: " + str(e))
        
    elif (script and script == "client-disconnect"):
        cn = getenv("common_name")
        if (cn == None):
            logging.error("missing common_name")
            return 1

        retval = 0
        logging.debug("client-disconnect: cn=" + cn)

        try:
            mongoc = MongoClient(mongohost, mongoport)
            db = mongoc[mongodb]
            
            # find the conn record and update
            spec = {"common_name": cn, "disconnected" : { "$exists" : False }}
            r = db[logc].find_one(spec,
                                  sort=[('authenticated', pymongo.DESCENDING)])

            (uname,dname) = cn.split('.')
            device = db[devicec].find_one({
                    "username": uname, 
                    "type": dname})

            if (r!=None and device!=None):
                r['disconnected'] = datetime.utcnow()
                r['bytes_sent'] = long(getenv("bytes_sent"))
                r['bytes_received'] = long(getenv("bytes_received"))
                db[logc].save(r)
                logging.debug(r)

                # stats
                device['vpn_is_connected'] = False 
                device['vpn_last_end'] = r['disconnected']
                device['vpn_bytes_sent'] += r['bytes_sent']
                device['vpn_bytes_recv'] += r['bytes_received']
                elapsed = device['vpn_last_end'] - device['vpn_last_start']
                if (elapsed!=None and elapsed.total_seconds() > 0):
                    device['vpn_conn_hours'] += elapsed.total_seconds()/3600.0
                db[devicec].save(device)

            else:
                logging.error("could not find log record or device for user '%s'"%cn)

            mongoc.close() 
        except Exception as e:
            logging.error("error when processing client-disconnect: " + str(e))
    else:
        logging.error("Unknown or missing script_type: " + str(script))
    
    logging.debug("return %d"%retval)
    return retval

if __name__ == '__main__':
    sys.exit(main())
