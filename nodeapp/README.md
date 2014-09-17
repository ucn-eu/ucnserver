Registration Web App
====================

Depends on

* MongoDB for storing user accounts
* Redis for session store
* node.js to run the app (tested on v0.10.x)
* pm2 (node app) to run the cluster
** npm install -g pm2@latest --unsafe-perm
* Runs on a non-priviledged port (3002 by default), if you need to reverse proxy traffic to the app, check ../httpd for config examples

To install required dependencies, run

    npm install

To debug and test, do (check app.js for development env configuration):

    DEBUG=ucnweb:* [GMLU=gmailuser GMLP=gmailpassword] node bin/www

Or run a cluster with pm2 (configure processes.json first): 

    npm start | pm2 start processes.json

Get info on running processes:

    pm2 list|desc <id>|logs <id>

Set current config on system reboot:

    pm2 startup [ubuntu|centos|gentoo|systemd]
    pm2 save

