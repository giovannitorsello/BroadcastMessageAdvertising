const config = require("./config.js").load();
const { ServerFactory, HttpSms, SocketSms } = require("goip");

const server = ServerFactory.make(
  config.smsServer.ip,
  config.smsServer.port,
  config.smsServer.password
);

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
  sendSMS(device, message, mobilephone, callback) {
    const sms = new HttpSms(
      "http://"+device.ip+":"+device.port,
      device.selectedLine,
      device.login,
      device.password,
      {
        waitForStatus: true, // Wait and check sending status
        waitTries: 3, // Number of attempts
        waitTime: 10000, // Time in  milliseconds
      }
    );

    if(config.production===true){
      sms
        .send(mobilephone, message)
        .then((response) => {
          console.log(response);
          var isSend=sms.isSend()
          callback(response);
        })
        .catch((error) => {
          console.log(error);
          callback(error);
        });
    }
    else
    {
      console.log(
        "Sending message  " +
          message +
          " -- " +
          device.name +
          "--" +
          device.operator +
          "--" +
          device.selectedLine +
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

