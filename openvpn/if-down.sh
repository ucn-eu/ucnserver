#!/bin/sh

# stop tcpdump on the given interface ($dev set by openvpn)
echo "stopping tcpdump on $dev"

PIDFILE=/var/run/$dev_pcap.pid
if [ -f $PIDFILE ]; then
  if [ -d "/proc/`cat $PIDFILE`" ]; then
	kill `cat $PIDFILE`
  fi
  rm -f $PIDFILE
fi

sleep 10

# make sure there's no pending pcap file
if [ -f /var/log/openvpn/pcaps/$dev.pcap ]; then
    compress.sh /var/log/openvpn/pcaps/$dev.pcap
fi

# TODO: could restore the original firewall config here
