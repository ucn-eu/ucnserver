#!/bin/sh

# for compressing and renaming tcpdump files when rotated
PCAPFILE=$1
NOW=$(date +"%Y-%m-%d_%H:%M:%S")
bzip2 $PCAPFILE
mv $PCAPFILE.bz2 $PCAPFILE-$NOW.bz2

# fix permissions so that the archive script can access these
chown proxy:adm $PCAPFILE-$NOW.bz2
chmod ug+rwx $PCAPFILE-$NOW.bz2
