Squid Setup
===========

* Install Squid (for SSL MITM Squid 3.3 or greated required)
* Update the config (see provided squid.conf)
* [optional] Copy squid.logrotate /etc/logrotate.d/squid
* [optional] Copy squid.monit /etc/monit/cond.d/squid
* Setup firewall rules to forward traffic from the VPN to squid, e.g.:

```
iptables -A PREROUTING -s 10.0.0.0/8 -i tun+ -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 31280
iptables -A PREROUTING -s 10.0.0.0/8 -i tun+ -p tcp -m tcp --dport 443 -j REDIRECT --to-ports 31281
```

Run Squid:

```
$ /etc/init.d/squid start|stop
```
