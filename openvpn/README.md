OpenVPN Setup
=============

* Install openvpn using standard package manager
* Generate keys as explained in openvpn docs (with easy_rsa)
* Check configs and copy *.conf to /etc/openvpn
* Check configs and copy *.sh and *.py to /etc/openvpn
* [optional] Copy openvpn.logrotate /etc/logrotate.d/openvpn
* [optional] Copy openvpn.monit /etc/monit/cond.d/openvpn
* Setup the firewall rules, something along the lines of:

```
iptables -A FORWARD -s 10.0.0.0/8 -i tun+ -o eth0 -j ACCEPT
iptables -A FORWARD -s 10.0.0.0/8 -i tun+ -o eth1 -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
iptables -A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A POSTROUTING -o eth0 -j MASQUERADE
```

Run OpenVPN:

```
$ /etc/init.d/openvpn start|stop
```

Data Collection
---------------

* script.py takes care of logging authentication, connect and disconnect events to the configured backend db. 
* if-up.sh starts tcpdump capture on the tun interface when it goes up (if-down.sh stops). The pcap files are written by default to /var/log/openvpn/pcapcs and  rotated after reaching a particular size. Setup an archival job (or update compress.sh) to store & delete files somewhere if need.
