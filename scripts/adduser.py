#!/usr/bin/python
"""
Add a vpn user. If the given user exists, will update the password.

TODO: currently supports only mongodb, add SQL backend

Author: Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>
"""
import sys
import os
import time
import json
import logging
import bcrypt
from pymongo import MongoClient
from datetime import datetime

# -------------------------------
# Configure your backend here
mongohost = "ucn"
mongoport = 27017
mongodb = "ucnexp"
userc = "users"
# -------------------------------

# logger (use the 2nd for prod)
logging.basicConfig(level=logging.DEBUG,
                    format='[%(asctime)s] %(levelname)s %(message)s')

def main():
    if (len(sys.argv) != 4):
        logging.info("Usage: %s email username password"%sys.argv[0])
        sys.exit(1)

    now = datetime.utcnow()
    email = sys.argv[1]
    username = sys.argv[2]
    password = sys.argv[3]

    # gen hash
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())

    logging.info("adduser: username=" + username + 
                 " email="+email
                " password="+password)

    mongoc = MongoClient(mongohost, mongoport)
    db = mongoc[mongodb]

    user = db[userc].find_one({"username": username})
    if (user != None):
        logging.info("setting new password '%s' for %s"%(password,username))
        # update password
        user['password'] = hashed
        user['updated'] = now
    else:
        # create new user
        logging.info("creating new user '%u'"%username)
        user = {
            'email' : email,
            'username' : username,
            'password' : hashed,
            'created' : now,
            'updated' : now,
            'isadmin' : False,
            }
    db[userc].save(user)
    mongoc.close()            
    logging.info("done")

if __name__ == '__main__':
    main()
