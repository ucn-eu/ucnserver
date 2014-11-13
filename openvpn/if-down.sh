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

# compress the current file
PCAP=/var/log/openvpn/pcaps/$IFACE.pcap
NOW=$(date +"%Y-%m-%d_%H:%M:%S")
PCAPARCH=/var/log/openvpn/pcaps/$IFACE.pcap-$NOW
if [ -f $PCAP ]; then
  mv $PCAP $PCAPARCH
  bzip2 $PCAPARCH

  # fix permissions so that the archive script can access these
  chown proxy:adm $PCAPARCH.bz2
  chmod ug+rwx $PCAPARCH.bz2
fi

# TODO: could restore the original firewall config here
