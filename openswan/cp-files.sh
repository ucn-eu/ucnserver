#!/bin/bash

# scripts triggered on pppX up/down
cp tcpdump-up /etc/ppp/ip-up.d/
cp tcpdump-down /etc/ppp/ip-down.d/
# pcap file compress helper
cp compress.sh /etc/ppp/
# pcap files dst dir
mkdir /var/log/pcaps
