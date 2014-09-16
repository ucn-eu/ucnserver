Registration Web App
====================

Depends on

* MongoDB for storing user accounts
* Redis for session store
* Node to run the app
* pm2 (node app) to run the cluster

To install required dependencies, run

''npm install

To run, do

''[DEBUG=ucnweb:* DBNAME=<database> DBHOST=<mongoserver> PORT=<listenport>] node bin/www

or run a cluster with pm2, 

''npm start