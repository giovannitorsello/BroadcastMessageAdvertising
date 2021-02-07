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
  sendSMS(device, line, message, mobilephone, callback) {    
    if(line>=device.nRadios) line=device.nRadios-1;
    const sms = new HttpSms(
      "http://"+device.ip+":"+device.port,
      line+1,
      device.login,
      device.password,
      {
        waitForStatus: true, // Wait and check sending status
        waitTries: 1, // Number of attempts
        waitTime: 5000, // Time in  milliseconds
      }
    );
    if(device.objData && device.objData.lines)
        senderNumber=device.objData.lines[line];

    if(config.production===true && device.isWorking===true) {
      var senderNumber="";
      if(device.objData && device.objData.lines)
        senderNumber=device.objData.lines[line];
      sms
        .send(mobilephone, message)
        .then((response) => {
          
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
        "Sending message (debug) " +
          device.name +
          "--" +
          device.operator +
          "--" +
          line +
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
    if(line>=device.nRadios) line=device.nRadios-1;

    const sms = new HttpSms(
      "http://"+device.ip+":"+device.port,
      line+1,
      device.login,
      device.password,
      {
        waitForStatus: true, // Wait and check sending status
        waitTries: 1, // Number of attempts
        waitTime: 5000, // Time in  milliseconds
      }
    );
    if(device.objData && device.objData.lines)
        senderNumber=device.objData.lines[line];

    if(config.production===true && device.isWorking===true) {
      var senderNumber="";
      
      sms
        .send(mobilephone, message)
        .then((response) => {
          
          console.log(
            "Antifraud message  " +
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
      callback({
        status: "send",
        msg: "temporary disabled",
        response: "developing",
      });
    }
      
  },
};

