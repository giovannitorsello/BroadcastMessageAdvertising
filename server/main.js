var config = require("./config.js").load();
const fs = require("fs");
const https = require("https");
const http = require("http");
var session = require("express-session");
const { Sequelize, Model, DataTypes } = require("sequelize");

var express = require("express");
var multer = require("multer");
var bodyParser = require("body-parser");
var cors = require("cors");

const clickServer=require("./clickServer.js");
const smsServer=require("./smsServer.js");
const callServer=require("./callServer.js");  
const gatewayServer=require("./gatewayServer.js");
var database = require("./database.js");

const pathProcess=process.cwd();
const pathModule=__dirname;

//file per route sezioni
var routes_admin_area = require("./route_admin_area.js");
const utility = require("./utility.js");
var app = express();

app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "bma-wifinetcom-2021",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);

process.on("unhandledRejection", (error) => {
  console.log("Warning", error.message);
});
process.chdir(process.cwd());

//enable cross origin
app.use(cors());
//covert body to JSON
app.use(bodyParser.json({ limit: "40000kb" }));

//upload folder
var upload = multer({ dest: "./uploads/" });
//other static contents folders
console.log("Path process is "+pathProcess);
console.log("Path module is "+pathModule);

//For frontend server PathProcess
app.use("/cache", express.static(pathProcess + config.paths.cacheFolder));
app.use(
  "/downloads",
  express.static(pathProcess + config.paths.downloadFolder)
);

//For click server PathModule
app.use(
  "/templates",
  express.static(pathModule + config.paths.templatesFolder)
);

/* to enable https
const options = {
  key: fs.readFileSync(process.cwd() +'/certs/key.pem'),
  cert: fs.readFileSync(process.cwd() +'/certs/cert.pem')
};

//http.createServer(options, app).listen(config.server.http_port);
//https.createServer(options, app).listen(config.server.https_port);
*/

app.listen(config.server.http_port);


//Init components and utilities.
database.setup(() => {
  // Statistics check alignement
  database.checkStatistcs();
  //Loading route for customer area
  clickServer.startServer(app,database);
  smsServer.startServer(app,database);
  callServer.startServer(app,database);
  //gatewayServer.startServer(app,database);
  routes_admin_area.load_routes(app, database, smsServer.smsServerIstance, callServer.callServerIstance);
});
