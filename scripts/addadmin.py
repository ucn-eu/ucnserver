#!/usr/bin/python
"""
Add a user with admin rights to the auth db. Admins have a special view
in the web app. If given admin exists, will update the password.

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
    if (len(sys.argv) != 3):
        logging.info("Usage: %s email password"%sys.argv[0])
        sys.exit(1)

    now = datetime.utcnow()
    username = sys.argv[1]
    password = sys.argv[2]

    # gen hash
    hashed = bcrypt.hashpw(password, bcrypt.gensalt())

    logging.info("addadmin: username=" + username + 
                " password="+password)

    mongoc = MongoClient(mongohost, mongoport)
    db = mongoc[mongodb]

    user = db[userc].find_one({"email": username})    
    if (user != None):
        logging.info("setting new password '%s' for %s"%(password,username))
        # update password
        user['password'] = hashed
        user['updated'] = now
    else:
        # create new admin
        logging.info("creating new admin '%u'"%username)
        user = {
            'email' : username,
            'password' : hashed,
            'created' : now,
            'activated' : now,
            'updated' : now,
            'isadmin' : True,
            'isactivated' : True
            }
    db[userc].save(user)
    mongoc.close()            
    logging.info("done")

if __name__ == '__main__':
    main()
