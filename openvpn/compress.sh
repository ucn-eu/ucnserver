#!/bin/bash

# rename with timestamp
PCAPFILE=$1
NOW=$(date +"%Y-%m-%d_%H:%M:%S")
NEW=$PCAPFILE-$NOW
mv $PCAPFILE $NEW

# extract DNS stuff
/usr/bin/tshark -2 -r $NEW -R "udp.srcport==53" -T fields -e frame.time_epoch -e ip.src -e dns.qry.name -E separator=, -E quote=n -E occurrence=f > /var/tmp/dns.log

# compress the pcap and fix perms for archival
bzip2 $NEW
chown proxy:adm $NEW.bz2
chmod ug+rwx $NEW.bz2

# run db processing script
cd /home/txl/ucnviz
venv/bin/python collect_dns.py

