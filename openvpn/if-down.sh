#!/bin/sh

# stop tcpdump on the given interface ($dev set by openvpn)
IFACE=$dev
if [ -z "$IFACE" ]; then
  IFACE=$1
fi
echo "stopping tcpdump on $IFACE"

PIDFILE=/var/run/tcpdump_$IFACE.pid
if [ -f $PIDFILE ]; then
  if [ -d "/proc/`cat $PIDFILE`" ]; then
	kill `cat $PIDFILE`
  fi
  rm -f $PIDFILE
fi

# process the closed capture file
PCAP=/var/log/openvpn/pcaps/$IFACE.pcap
/etc/openvpn/compress.sh $PCAP

# TODO: could restore the original firewall config here
