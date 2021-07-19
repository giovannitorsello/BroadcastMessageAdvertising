const axios = require("axios");
var soap = require("soap");
const config = require("../config.js").load();
module.exports = {
  sendSms(phonedest, message, phonesrc, classtype, callback) {
    var number = "+39" + phonedest;
    axios
      .get("http://www.services.europsms.com/smpp-gateway.php", {
        params: {
          op: "sendSMS2",
          smpp_id: config.senderServices[1].login,
          utenti_password: config.senderServices[1].password,
          tipologie_sms_id: classtype,
          destinatari_destination_addr: number,
          trasmissioni_messaggio: message,
          trasmissioni_mittente: phonesrc,
        },
      })
      .then(
        (response) => {
          var result = { id: response.data, msg: response.statusText };
          callback(result);
        },
        (error) => {
          callback(error);
        }
      );
  },

  getStatus(id, callback) {
    axios
      .post("http://www.services.europsms.com/smpp-gateway.php", {
        params: {
          op: "txStatus",
          email: config.senderServices[1].login,
          password: config.senderServices[1].password,
          trasmissioni_id: id,
        },
      })
      .then(
        (response) => {
          callback(response.statusText);
        },
        (error) => {
          callback(error);
        }
      );
  },

  getCreditEconomic(callback) {
    var url = "http://www.services.europsms.com/service.php?wsdl";
    var args = {
      utente: config.senderServices[1].login,
      password: config.senderServices[1].password,
      tipologie_sms_id: "1",
    };
    soap.createClient(url, function (err, client) {
      client.getWsSaldo(args, function (err, result) {
        if(!err && result && result.return) {
          callback({state: 'OK', msg: 'success', credit: result.return.$value})
        }
        else
          callback({state: 'error', msg: 'error', error: err});
      });
    });
  },

  getCreditProfesional(callback) {
    var url = "http://www.services.europsms.com/service.php?wsdl";
    var args = {
      utente: config.senderServices[1].login,
      password: config.senderServices[1].password,
      tipologie_sms_id: "2",
    };
    soap.createClient(url, function (err, client) {
      client.getWsSaldo(args, function (err, result) {
        if(!err && result && result.$value) {
          callback({state: 'OK', msg: 'success', credit: $value})
        }
        else
        callback({state: 'error', msg: 'error', error: err});
      });
    });
  },
};

/****
 * www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test
www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id= 


www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test

www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id=14736731
*/
