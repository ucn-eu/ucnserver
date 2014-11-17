#!/bin/sh

# rename with timestamp
PCAPFILE=$1
NOW=$(date +"%Y-%m-%d_%H:%M:%S")
NEW=$PCAPFILE-$NOW
mv $PCAPFILE $NEW

# extract DNS stuff
/usr/sbin/tshark -r $NEW -2 -T fields -R "udp.srcport==53" -e frame.time_epoch -e ip.src -e dns.qry.name -E separator=, -E quote=n -E occurrence=f > /tmp/dns.log

pushd /home/txl/ucnviz
venv/bin/python collect_dns.py
popd

# compress the pcacp and fix perms for archival
bzip2 $NEW
chown proxy:adm $NEW.bz2
chmod ug+rwx $NEW.bz2
