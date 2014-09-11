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
from datetime import datetime

# -------------------------------
# Configure your backend here
mongohost = 'localhost'
mongoport = 27017
mongodb = "ucntest"
userc = "users"
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
            user = db[userc].find_one({"email": username})

            if (user != None and  u'password' in user):
                hashed = user[u'password'].encode('ascii', 'ignore')
                if (bcrypt.hashpw(password, hashed) == hashed):
                    # set success now, will be success even if logging
                    # fails for whatev reason
                    retval = 0

                    # store succesful authentication to the db
                    r = {'common_name' : username,
                         'username' : username,
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
                    mongoc.close()            
                else:
                    logging.warn("user '%s' invalid password"%username)
            else:
                logging.warn("no such user '%s'"%username)
        except Exception as e:
            logging.error("error when authenticating: " + str(e))

    elif (script and script == "client-connect"):
        cn = getenv("common_name")
        if (cn == None):
            logging.error("missing common_name")
            return 1

        retval = 0
        logging.debug("client-connect: cn=" + cn)

        try:
            mongoc = MongoClient(mongohost, mongoport)
            db = mongoc[mongodb]
            
            spec = {"common_name": cn, "connected" : { "$exists" : False }}
            r = db[logc].find_one(spec,
                                  sort=[('authenticated', pymongo.DESCENDING)])

            if (r!=None):
                r['connected'] = datetime.utcnow()
                r['trusted_client_ip'] = getenv("trusted_ip")
                r['virtual_server_ip'] = getenv("ifconfig_pool_local_ip") 
                r['virtual_client_ip'] = getenv("ifconfig_pool_remote_ip")
                db[logc].save(r)
                logging.debug(r)
            else:
                logging.error("could not find log record for user '%s'"%cn)

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
            
            spec = {"common_name": cn, "disconnected" : { "$exists" : False }}
            r = db[logc].find_one(spec,
                                  sort=[('authenticated', pymongo.DESCENDING)])

            if (r!=None):
                r['disconnected'] = datetime.utcnow()
                r['bytes_sent'] = getenv("bytes_sent")
                r['bytes_received'] = getenv("bytes_received")
                db[logc].save(r)
                logging.debug(r)
            else:
                logging.error("could not find log record for user '%s'"%cn)

        except Exception as e:
            logging.error("error when processing client-disconnect: " + str(e))
    else:
        logging.error("Unknown or missing script_type: " + str(script))
    
    logging.debug("return %d"%retval)
    return retval

if __name__ == '__main__':
    sys.exit(main())
