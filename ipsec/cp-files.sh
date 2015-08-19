#!/bin/bash

# scripts triggered on pppX up/down
cp tcpdump-up /etc/ppp/ip-up.d/
cp tcpdump-down /etc/ppp/ip-down.d/

cp script-up.py /etc/ppp/ip-up.d/ucn-up
cp script-down.py /etc/ppp/ip-down.d/ucn-down

# pcap file compress helper
cp compress.sh /etc/ppp/

# pcap files dst dir
mkdir /var/log/pcaps

cp add-chap-secret /etc/ppp
chmod +s /etc/ppp/add-chap-secret
