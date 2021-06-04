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
          smpp_id: config.senderServices.login,
          utenti_password: config.senderServices.password,
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
          email: config.senderServices.login,
          password: config.senderServices.password,
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

  getCredit(classSMS) {
    var url = "http://www.services.europsms.com/service.php?wsdl";
    var args = { utente: config.senderServices.login, password=config.senderServices.password, tipologie_sms_id="2" };
    soap
      .createClientAsync(url)
      .then((client) => {
        return client.getWsSaldo(args);
      })
      .then((result) => {
        console.log(result);
      });
  },
};

/****
 * www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test
www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id= 


www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test

www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id=14736731
*/
