OpenVPN Setup
=============

* Install openvpn using standard package manager
* Generate keys as explained in openvpn docs (with easy_rsa)
** Docs: https://openvpn.net/index.php/open-source/documentation/howto.html#pki
** easy-rsa: https://github.com/OpenVPN/easy-rsa/releases/download/2.2.2/EasyRSA-2.2.2.tgz
** Copy keys/ca.*, ./keys/server.* and keys/dh2048.pem to /etc/openvpn/
* Check configs and copy *.conf to /etc/openvpn
* Check configs and copy *.sh and *.py to /etc/openvpn, make executable
* Install bcrypt (python-dev, libffi, cython) and pip install bcrypt, pymongo
* [optional] Copy openvpn.logrotate /etc/logrotate.d/openvpn
* [optional] Copy openvpn.monit /etc/monit/cond.d/openvpn
* Enable forwarding, echo 1 > /proc/sys/net/ipv4/ip_forward
* Setup the firewall rules, something along the lines of:

```
*filter
-A FORWARD -s 10.0.0.0/8 -i tun+ -o eth0 -j ACCEPT
-A FORWARD -m state --state RELATED,ESTABLISHED -j ACCEPT
*nat
-A POSTROUTING -o eth0 -j MASQUERADE
```

Run OpenVPN:

```
$ /etc/init.d/openvpn start|stop
```

Data Collection
---------------

* script.py takes care of logging authentication, connect and disconnect events to the configured backend db. 
* if-up.sh starts tcpdump capture on the tun interface when it goes up (if-down.sh stops). The pcap files are written by default to /var/log/openvpn/pcaps and  rotated after reaching a particular size. Setup an archival job (or update compress.sh) to store & delete files somewhere if need.
