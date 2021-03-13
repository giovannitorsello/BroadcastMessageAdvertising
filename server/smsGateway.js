const config = require("./config.js").load();
const { ServerFactory, HttpSms, SocketSms } = require("goip");
const fetch = require("node-fetch");
const xmlParser = require("fast-xml-parser");
const http = require("http");

const optionsGoip = {
  sendDir: "/default/en_US/send.html",
  statusDir: "/default/en_US/send_status.xml",
  waitForStatus: false,
  waitTries: 10,
  waitTime: 1000,
};

module.exports = {
  setupListener() {
    const { ServerFactory } = require("goip");

    // All messages
    server.onAll((message) => {
      console.log(message);
    });

    // Goip not supported message
    server.onNotSupported((message) => {
      console.log(message);
    });

    // Keep Alive packets with gateway (line) information
    server.onRequest((message) => {
      console.log(message);
    });

    // Incoming SMS
    server.onReceive((message) => {
      console.log(message);
    });

    // SMS delivery report
    server.onDeliver((message) => {
      console.log(message);
    });

    // End telephone call
    server.onHangup((message) => {
      console.log(message);
    });

    // Start a phone call
    server.onRecord((message) => {
      console.log(message);
    });

    // Change of gate (line) status
    server.onState((message) => {
      console.log(message);
    });

    // Socket server error message
    server.onServerError((message) => {
      console.log(message);
    });
  },
  sendSMS(device, line, message, mobilephone, callback) {
    if (line >= device.nRadios) line = device.nRadios - 1;
    var senderNumber = "";
    var senderOperator = "";
    if (device.objData && device.objData.lines)
      senderNumber = device.objData.lines[line];

    if (device.objData && device.objData.operator)
      senderOperator = device.objData.operator[line];

    if (config.production === true)
      if (
        device.isWorkingSms === true ||
        device.isWorkingSms === 1 ||
        device.isWorkingSms === "1"
      ) {
        if (device.objData && device.objData.lines)
          senderNumber = device.objData.lines[line];

        const params = new URLSearchParams();
        params.append("u", device.login);
        params.append("p", device.password);
        params.append("l", line + 1);
        params.append("n", mobilephone);
        params.append("m", message);

        const optionsGet = {
          hostname: device.ip,
          port: device.port,
          path: optionsGoip.sendDir + "?" + params,
          method: "GET",
        };
        const req = http.request(optionsGet, (res) => {
          console.log(`statusCode: ${res.statusCode}`);
          res.on("data", (res) => {
            var responseGateway = "" + res;
            console.log(
              "Sending message  " +
                message +
                " -- " +
                device.name +
                " -- " +
                device.operator +
                " -- " +
                line +
                " -- " +
                senderNumber +
                " to " +
                mobilephone
            );
            console.log(responseGateway);            
            callback({status: "send", msg: responseGateway});
          });
        });

        req.on("error", (error) => {
          console.log("Error on: " + device.ip);
          console.error(error);
          callback({status: "error", msg: error});
        });
        req.end();
      } else {
        console.log(
          "Sending message  " +
            message +
            " -- " +
            device.name +
            " -- " +
            line +
            " -- " +
            senderOperator +
            " -- " +
            senderNumber +
            " to " +
            mobilephone
        );
        callback({
          status: "send",
          msg: "temporary disabled",
          response: "developing",
        });
      }
  },
  sendSMSAntifraud(device, line, message, mobilephone, callback) {
    if (line >= device.nRadios) line = device.nRadios - 1;
    var senderNumber = "";
    var senderOperator = "";
    if (device.objData && device.objData.lines)
      senderNumber = device.objData.lines[line];

    if (device.objData && device.objData.operator)
      senderOperator = device.objData.operator[line];

    if (config.production === true)
      if (
        device.isWorkingSms === true ||
        device.isWorkingSms === 1 ||
        device.isWorkingSms === "1"
      ) {
        const params = new URLSearchParams();
        params.append("u", device.login);
        params.append("p", device.password);
        params.append("l", line + 1);
        params.append("n", mobilephone);
        params.append("m", message);

        const optionsGet = {
          hostname: device.ip,
          port: device.port,
          path: optionsGoip.sendDir + "?" + params,
          method: "GET",
        };
        const req = http.request(optionsGet, (res) => {
          console.log(`statusCode: ${res.statusCode}`);
          res.on("data", (res) => {
            var responseGateway = "" + res;
            console.log(
              "Sending antifraud message  " +
                message +
                " -- " +
                device.name +
                " -- " +
                device.operator +
                " -- " +
                line +
                " -- " +
                senderNumber +
                " to " +
                mobilephone
            );
            console.log(responseGateway);
            callback({status: "send", msg: responseGateway});
          });
        });

        req.on("error", (error) => {
          console.log("Error on: " + device.ip);
          console.error(error);
          callback({status: "error", msg: error});
        });
        req.end();
      } else {
        console.log(
          "Sending antifraud message  " +
            message +
            " -- " +
            device.name +
            " -- " +
            line +
            " -- " +
            senderOperator +
            " -- " +
            senderNumber +
            " to " +
            mobilephone
        );
        callback({
          status: "send",
          msg: "temporary disabled",
          response: "developing",
        });
      }
  },
};
