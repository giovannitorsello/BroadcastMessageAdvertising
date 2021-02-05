var config = require("./config.js").load();

const fs = require('fs');
const https = require('https');
const http = require('http');
var session = require('express-session')
const { Sequelize, Model, DataTypes } = require('sequelize');


var express = require('express');
var multer = require('multer');
var bodyParser = require('body-parser');
var cors = require('cors');


var database = require('./database.js')
var smsCampaignManager = require('./smsCampaignManager.js')
var clickServer = require("./clickServer.js");

//file per route sezioni
var routes_admin_area = require("./route_admin_area.js");
//var routes_cust_area = require("./route_customer_area.js");

var pingServerProcess=null;
var app = express();

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'bma-wifinetcom-2021',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

process.on('unhandledRejection', error => { console.log('Warning', error.message); });
process.chdir(process.cwd());


//enable cross origin
app.use(cors());
//covert body to JSON
app.use(bodyParser.json({ limit: '4000kb' }));

//upload folder
var upload = multer({ dest: './uploads/' })
//other static contents folders
app.use('/cache', express.static(process.cwd() + config.paths.cacheFolder));
app.use('/downloads', express.static(process.cwd() + config.paths.downloadFolder));

/* to enable https
const options = {
  key: fs.readFileSync(process.cwd() +'/certs/key.pem'),
  cert: fs.readFileSync(process.cwd() +'/certs/cert.pem')
};

//http.createServer(options, app).listen(config.server.http_port);
//https.createServer(options, app).listen(config.server.https_port);
*/


app.listen(config.server.http_port);

//Init componets and utilities.
database.setup(app, function () {
  clickServer.setup(app, database);
  smsCampaignManager.setup(app,database);
  
  //Loading route for customer area
  routes_admin_area.load_routes(app, database);
  
  });

