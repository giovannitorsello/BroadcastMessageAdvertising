var fs = require("fs");
const config = require("./config.js").load();
const { ServerFactory, HttpSms, SocketSms } = require("goip");

class GatewayServer {
  server = {};
  gateways = [];
  selectedGateway = 0;
  database = {};

  constructor(app, database) {
    this.database = database;
    this.init();
  }

  init() {
    this.loadGateways((gateways) => {
      this.gateways = gateways;
      this.server = ServerFactory.make(3333);
      this.server.onAll((message) => {
        console.log(message);
      });
      this.server.run();
    });
  }

  loadGateways(callback) {
    this.database.entities.gateway
      .findAll({ where: { isWorkingCall: 1 } })
      .then((gateways) => {
        callback(gateways);
      })
      .catch((error) => {
        console.log(error);
      });
  }
}

module.exports = {
    gatewayServerIstance: {},
    startServer(app, database) {
      this.gatewayServerIstance = new GatewayServer(app, database);
    },
  };
  