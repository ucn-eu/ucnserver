#!/bin/sh

# run tcpdump on the given interface ($dev set by openvpn)
echo "starting tcpdump on $dev"

CAPLEN=300  # capture first x bytes
MAXSIZE=100 # rotate files bigger than x Mbytes
TCPDUMP=/usr/sbin/tcpdump
LOGDIR=/var/log/openvpn/pcaps
PCAPFILE=$LOGDIR/$dev.pcap
COMPSCRIPT=/etc/openvpn/compress.sh

if [ ! -d $LOGDIR ]
then
  mkdir $LOGDIR
  chown proxy:adm $LOGDIR
  chmod ug+rwx $LOGDIR
fi

PIDFILE=/var/run/$dev_pcap.pid
if [ -f $PIDFILE ]; then
  if [ -d "/proc/`cat $PIDFILE`" ]; then
	kill `cat $PIDFILE`
  fi
  rm -f $PIDFILE
fi

$TCPDUMP -n -i $dev -s $CAPLEN -C $MAXSIZE -W 1 -z $COMPSCRIPT -w $PCAPFILE &

echo $! > $PIDFILE
cat $PIDFILE

# TODO: could setup the squid forwarding on demand here


