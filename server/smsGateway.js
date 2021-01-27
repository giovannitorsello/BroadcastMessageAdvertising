const config = require("./config.js").load();
const { ServerFactory, HttpSms, SocketSms } = require("goip");

const server = ServerFactory.make(333);

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
  sendSMS(ip, port, password, message, mobilephone, callback) {
    const sms = new SocketSms(
      ip, // Goip address
      port, // Goip port
      password // Goip password
    );

    /*
    sms
      .sendOne(mobilephone, message)
      .then((response) => {
        callback({status: "OK", msg: "Message sent", response: response})
        console.log(response);
      })
      .catch((error) => {
        callback({status: "error", msg: "Error message not sent", response: error})
        console.log(error);
      });*/
      callback({status: "developing", msg: "temporary disabled", response: "developing"})
  },
};
