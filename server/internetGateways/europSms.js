const axios = require("axios");
module.exports = {
  sendSms(phonedest, message, phonesrc, classtype, callback) {
    
    phonedest="+39"+phonedest;
    axios.post('http://www.services.europsms.com/smpp-gateway.php', {
        op: "sendSMS2",
        smpp_id: "amministrazione@wifinetcom.net",
        utenti_password: "EuropSms2021",
        tipologie_sms_id: classtype,
        destinatari_destination_addr: phonedest,
        trasmissioni_messaggio: message,
        trasmissioni_mittente: phonesrc 
      })
      .then((response) => {
          var result={id: response.data, msg: response.statusText};
          console.log(result);
        //this.getStatus(0, response => callback);
        callback(result);
      }, (error) => {
        console.log(error);
        callback(error);
      });
  },

  getStatus(id, callback) {
    axios.post('http://www.services.europsms.com/smpp-gateway.php', {
        op: "txStatus",
        email: "amministrazione@wifinetcom.net",
        password: "EuropSms2021",
        trasmissioni_id: id
      })
      .then((response) => {
        console.log(response.statusText);
        callback(response.statusText);
      }, (error) => {
        console.log(error);
        callback(error);
      });
  },
};
