Registration Web App
====================

Depends on

* MongoDB for storing user accounts
* Redis for session store
* node.js to run the app
* pm2 (node app) to run the cluster

To install required dependencies, run

    npm install

To run, do

    [DEBUG=ucnweb:* GMLU=gmailuser GMLP=gmailpassword] node bin/www

Or run a cluster with pm2 (check processes.json/app.js for configs): 

    npm start