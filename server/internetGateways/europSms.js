const axios = require("axios");
module.exports = {
  sendSms(phonedest, message, phonesrc, classtype, callback) {
      var number="+39"+phonedest;
      axios.get('http://www.services.europsms.com/smpp-gateway.php', {
        params: {
        op: "sendSMS2",
        smpp_id: "amministrazione@wifinetcom.net",
        utenti_password: "EuropSms2021",
        tipologie_sms_id: classtype,
        destinatari_destination_addr: number,
        trasmissioni_messaggio: message,
        trasmissioni_mittente: phonesrc 
        }
      }).then((response) => {
        var result={id: response.data, msg: response.statusText};
        callback(result);
      }, (error) => {
        callback(error);
      });
  },

  getStatus(id, callback) {
    axios.post('http://www.services.europsms.com/smpp-gateway.php', {
      params: {
        op: "txStatus",
        email: "amministrazione@wifinetcom.net",
        password: "EuropSms2021",
        trasmissioni_id: id        
        }
      }).then((response) => {
        callback(response.statusText);
      }, (error) => {
        callback(error);
      });
  }
};


/****
 * www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test
www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id= 


www.services.europsms.com/smpp-gateway.php?op=sendSMS2&smpp_id=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&tipologie_sms_id=1&destinatari_destination_addr=%2B393939241987&trasmissioni_messaggio=prova&trasmissioni_mittente=test

www.services.europsms.com/smpp-gateway.php?op=txStatus&email=amministrazione@wifinetcom.net&utenti_password=EuropSms2021&trasmissioni_id=14736731
*/