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

//settin process to clean temporary folder as cache and uploads 
//var fileWatcherUpload = new FileCleaner(process.cwd() + '/uploads/', 600000, '* */45 * * * *', { start: true });
//var fileWatcherCache = new FileCleaner(process.cwd() + '/cache/', 600000, '* */45 * * * *', { start: true });

process.on('unhandledRejection', error => { console.log('Warning', error.message); });
process.chdir(process.cwd());


app.use(cors());
//enable cross origin
app.use(cors());
//covert body to JSON
app.use(bodyParser.json());
//parsing request object data during post
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies.
app.use(bodyParser.json({ limit: '2000kb' }));
//upload folder
var upload = multer({ dest: './uploads/' })
//other static contents folders
app.use('/cache', express.static(process.cwd() + config.paths.cacheFolder));

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
  smsCampaignManager.setup(app,database);
  
  //Loading route for customer area
  routes_admin_area.load_routes(app, database);
  //routes_cust_area.load_routes(app, database);  
  });

