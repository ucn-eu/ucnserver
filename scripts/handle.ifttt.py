#!/usr/bin/python
"""
Handle IFTTT email updates (call for example via procmail rules, see 
example in ifttt.procmailrc). 

Author: Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>
"""
import sys
import logging
import time
import calendar
from datetime import datetime
from dateutil.parser import parse
from pymongo import MongoClient
import os.path

logging.basicConfig(level=logging.DEBUG,
        filename='/home/apietila/pm/handler.log',
        format='[%(asctime)s] %(levelname)s %(message)s')

# -------------------------------
# Configure your backend here
mongohost = 'ucn'
mongoport = 27017
mongodb = "ucnexp"
col = "ifttt_location"
# -------------------------------

# local hostname to identify logs
f = open("/etc/hostname")
hostname = f.readline().strip()
f.close()

def utcts(dt):
  return calendar.timegm(dt.utctimetuple())

try:
    obj = {
        'server' : hostname,
        'server_timestamp' : datetime.utcnow(),
    }

    for line in sys.stdin:
        tmp = line.strip().split(': ')

        if (tmp[0] == 'From'):
            obj['from'] = tmp[1]
            if (tmp[1].find('<') >= 0):
                obj['email'] = tmp[1][(tmp[1].find('<')+1):tmp[1].find('>')]

        elif (tmp[0] == 'Date'):
            obj['email_date'] = tmp[1] 
            obj['email_datetime'] = parse(tmp[1])
            obj['email_utcts'] = utcts(obj['email_datetime'])
     
        elif (tmp[0] == 'Subject'):
            obj['subject'] = tmp[1]
            obj['enter'] = (tmp[1].find('entered')>=0)
            obj['exit'] = (tmp[1].find('exited')>=0)

        elif (tmp[0] == 'Subject'):
            obj['subject'] = tmp[1]
            obj['enter'] = (tmp[1].find('entered')>=0)
            obj['exit'] = (tmp[1].find('exited')>=0)

        tmp = tmp[1].split(' ')     
        if (tmp[2] == 'an' and tmp[3] == 'area'):
            # the receipe default location label
            obj['location'] = 'an area'      
            obj['user_date'] = ' '.join(tmp[4:])
            obj['user_datetime'] = parse(obj['user_date'])
            obj['user_utcts'] = utcts(obj['user_datetime'])
        else:
            # user given label
            obj['location'] = tmp[2]
            obj['user_date'] = ' '.join(tmp[3:])   
            obj['user_datetime'] = parse(obj['user_date'])
            obj['user_utcts'] = utcts(obj['user_datetime'])

    logging.debug(str(obj))
            
    if ('from' in obj):
        logging.info('mongodb://'+mongohost+':'+str(mongoport)+'/'+mongodb)
        mongoc = MongoClient(mongohost, mongoport)
        db = mongoc[mongodb]
        mongodb[col].insert(obj) 
        mongoc.close()

except Exception as e:
    logging.error("error handling IFTTT update: " + str(e))

