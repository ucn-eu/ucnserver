OpenSwan Setup
==============

OpenSwan provides IPSec (L2TP + ppp) based VPN that is supported by native
Android, iOS, OS X, ... VPN clients.

## Installation

Mostly following instructions from: http://vitobotta.com/l2tp-ipsec-vpn-ios/

	apt-get install openswan xl2tpd ppp

### Configure IPSec

* configure/replace /etc/ipsec.conf with the provided example (update server public IP)

* configure /etc/ipsec.secrets (update server public IP + passphrase)

* run vpn-setup.sh to enable IP forwarding

* add rules from iptables.rules to iptables (or adapt to your firewall)

* run service ipsec restart

* run ipsec verify (all should be OK)

### Configure xl2tpd/ppp

* configure /etc/xl2tpd/xl2tpd.conf 

* configure /etc/ppp/options.xl2tpd

* run cp-files.sh to setup tcpdump scripts


### Restart Services

	/etc/init.d/xl2tpd restart
	/etc/init.d/ipsec restart
	/etc/init.d/pppd-dns restart

