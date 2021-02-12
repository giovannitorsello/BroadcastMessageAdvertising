const config = require("./config.js").load();
var database = require("./database.js");
const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const sms_gateway_hardware = require("./smsGateway.js");

class SmsServer
{
  smsGateways= [];
  smsCampaigns= [];
  smsContacts= [];
  selectedGateway= 0;
  selectedContact= 0;
  waitTime= 5000;
  nTotRadios = 0;
  

  constructor() {
    database.setup(() => {
      this.init();
    })    
  }

  init() {    
    this.loadSmsGateways((gateways) => {
      this.smsGateways = gateways;
      this.loadCampaings((campaigns) => {
        this.smsCampaigns = campaigns;
      });
    });
  }

  getGateways() {
    return smsGateways;
  }

  startCampaignManager() {
    this.smsCampaigns.forEach((campaign, index, arrCamp) => {
      //controllo campagna attiva
      if (campaign.state === "active") {
        //Seleziona automaticamente il messaggio successivo e il dispositivo da utilizzare
        this.sendNextMessage(campaign, (response) => {
          console.log("Message sent");
        });
      }
    });
  }

  sendNextMessage(campaign, callback) {
    //Select next contact in couch database
    // Gateways selection
    var dateCampaign = Date.parse(campaign.begin);
    var now = new Date().getTime();
    //Controllo su data ed ora di inizio
    if (now > dateCampaign && campaign.state === "active") {
      var contact = this.selectCurrentContact(campaign);
      var selecteGateway = this.selectCurrentGateway();
      this.sendMessage(campaign, selecteGateway, contact, (response) => {
        callback(response);
      });
    }
  }

  sendMessage(campaign, iDevice, contact, callback) {
    if (!this.smsGateways[iDevice]) return;
    if (!campaign) return;
    if (!contact) return;
    var mobilephone = contact.mobilephone;
    var message = this.formatMessage(campaign, contact);
    if (
      message !== "" &&
      contact.state === "toContact" &&
      campaign.state === "active"
    ) {
      //Line selection
      var senderDevice = this.smsGateways[iDevice];
      var selectedSenderLine = this.getDeviceLineWithLessSent(iDevice);

      sms_gateway_hardware.sendSMS(
        senderDevice,
        selectedSenderLine,
        message,
        mobilephone,
        (response) => {
          if (
            response.status &&
            (response.status === "send" || response.status === "sending")
          ) {
            contact.state = "contacted";
            contact.save();
            this.smsGateways[iDevice].nSmsSent++;
            this.smsGateways[iDevice].objData.smsSent[selectedSenderLine]++;
            this.smsGateways[iDevice].save();
            this.antifraudRoutine(iDevice, selectedSenderLine, (respose) => {
              console.log("Antifraud execute.");
              this.updateCampaignData(campaign, (response) =>
                callback(response)
              );
            });
          }
        }
      );
    }
  }

  formatMessage(campaign, contact) {
    if (
      campaign &&
      contact &&
      campaign.message &&
      campaign.message !== "" &&
      campaign.id &&
      contact.id
    ) {
      var hexidContact = parseInt(contact.id).toString(36);
      var hexidCampaign = parseInt(campaign.id).toString(36);
      var link = config.shortDomain + "/" + hexidCampaign + "/" + hexidContact;
      var message = campaign.message;
      return message + " " + link;
    }
    return "";
  }

  selectCurrentContact(campaign) {
    if (!campaign.contacts) {
      database.entities.customer
        .findAll({ where: { campaignId: campaign.id } })
        .then((custs) => {
          campaign.contacts = custs;
          this.selectedContact = 0;
          var currContact = campaign.contacts[this.selectedContact];
          this.selectedContact++;
          return currContact;
        });
    } else {
      var currContact = campaign.contacts[this.selectedContact];
      this.selectedContact++;
      if (this.selectedContact > campaign.ncontacts) this.selectedContact = 0;
      return currContact;
    }
  }

  selectCurrentGateway() {
    var i = 0;
    var selGat = 0;
    var nSmsSent = this.smsGateways[selGat].nSmsSent;

    //select line with less sent sms
    while (i < this.smsGateways.length) {
      if (nSmsSent >= this.smsGateways[i].nSmsSent && this.smsGateways[i].isWorking) {
        nSmsSent = this.smsGateways[i].nSmsSent;
        selGat = i;
      }
      i++;
    }
    return selGat;
  }

  loadSmsGateways(callback) {
    var gateways = [];
    database.entities.gateway.findAll().then((results) => {
      if (results.length > 0) {
        gateways = results;
      } else {
        gateways = config.smsGateways;
        gateways.forEach((gat) => {
          gat.id = "";
          database.entities.gateway.create(gat);
        });
      }

      
      for (var i = 0; i < gateways.length; i++) {
        this.nTotRadios += gateways[i].nRadios;
      }

      callback(gateways);
    })
    .catch( error=> {
      console.log(error);
    });
  }

  loadCampaings(callback) {
    var campaigns = [];
    //Charge active campaign
    database.entities.messageCampaign.findAll().then((camps) => {
      if (camps) {
        camps.forEach((camp) => {
          database.entities.customer
            .findAll({
              where: { campaignId: camp.id },
              order: [["state", "DESC"]],
            })
            .then((contacts) => {
              camp.contacts = contacts;
              camp.ncontacts = contacts.length;
              campaigns.push(camp);
              callback(campaigns);
            });
        });
      }
    });
  }

  reloadActiveCampaings(callback) {
    //Charge active campaign and their
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
    });
  }

  antifraudRoutine(receiverGateway, selectedReceiverLine, callback) {
    if (this.isOutOfAntifroudBalance(receiverGateway, selectedReceiverLine)) {
      var senderGateway = this.getSenderForAntifraudBalance(receiverGateway);
      this.sendAntifraudMessage(
        receiverGateway,
        selectedReceiverLine,
        senderGateway,
        (response) => {
          callback(response);
        }
      );
    } else callback({});
  }

  sendAntifraudMessage(
    receiverGateway,
    selectedReceiverLine,
    senderGateway,
    callback
  ) {
    var selectedSenderLine = this.getDeviceLineWithLessSent(senderGateway);
    var senderDevice = this.smsGateways[senderGateway];
    var receiverDevice = this.smsGateways[receiverGateway];
    var mobilephone = receiverDevice.objData.lines[selectedReceiverLine];
    var message = this.getAntigraudMessageText();

    console.log(
      "Antifraud message " +
        senderDevice.operator +
        " -- " +
        selectedSenderLine +
        " (sender) --> " +
        receiverDevice.operator +
        " -- " +
        selectedReceiverLine +
        " (receiver)"
    );

    sms_gateway_hardware.sendSMSAntifraud(
      senderDevice,
      selectedSenderLine,
      message,
      mobilephone,
      (response) => {
        senderDevice.objData.smsSent[selectedSenderLine]++;
        senderDevice.nSmsSent++;
        senderDevice.save();

        receiverDevice.objData.smsReceived[selectedReceiverLine]++;
        receiverDevice.nSmsReceived++;
        receiverDevice.save();

        callback(response);
      }
    );
  }

  getAntigraudMessageText() {
    var antifraudMessageTexts = config.antifraudMessageTexts;
    var nRand = Math.floor(
      Math.random() * (config.antifraudMessageTexts.length - 1)
    );
    return antifraudMessageTexts[nRand];
  }

  getDeviceLineWithLessSent(iDevice) {
    var device = this.smsGateways[iDevice];
    var selectedLine = 0,
      i = 0;
    var nMessSent = device.objData.smsSent[0];
    while (i < device.objData.smsSent.length) {
      if (device.objData.isWorking[i]) {
        if (nMessSent >= device.objData.smsSent[i]) {
          nMessSent = device.objData.smsSent[i];
          selectedLine = i;
        }
      }
      i++;
    }
    return selectedLine;
  }

  getDeviceLineWithLessReceived(iDevice) {
    var device = this.smsGateways[iDevice];
    var selectedLine = 0,
      i = 0;
    var nMessReceived = device.objData.smsReceived[0];
    while (i < device.objData.smsReceived.length) {
      if (device.objData.isWorking[i]) {
        if (nMessReceived >= device.objData.smsReceived[i]) {
          nMessReceived = device.objData.smsReceived[i];
          selectedLine = i;
        }
      }
      i++;
    }
    return selectedLine;
  }

  isOutOfAntifroudBalance(iDevice, iLine) {
    var device = this.smsGateways[iDevice];
    var sentSms = device.objData.smsSent[iLine];
    var receivedSms = device.objData.smsReceived[iLine];
    var percentage = 100 - Math.ceil((100 * receivedSms) / sentSms);
    if (percentage > device.nMaxSentPercetage) return true;
    else return false;
  }

  getSenderForAntifraudBalance(iDevice) {
    var receiverDevice = this.smsGateways[iDevice];
    var nSmsSent = 0,
      senderGateway = 0;
    this.smsGateways.forEach((gat, index, arrGat) => {
      if (gat.operator != receiverDevice.operator && gat.isWorking) {
        // select other gateway
        if (nSmsSent >= gat.nSmsSent || nSmsSent === 0) {
          //search minimum messages
          nSmsSent = gat.nSmsSent;
          senderGateway = index;
        }
      }
      if (index === arrGat.length - 1 && this.smsGateways[senderGateway].isWorking) {
        return senderGateway;
      }
    });
    return senderGateway;
  }

  updateCampaignData(campaign, callback) {
    database.entities.customer
      .count({
        where: {
          campaignId: campaign.id,
          state: "contacted",
        },
      })
      .then((countContacted) => {
        database.entities.messageCampaign
          .findOne({ where: { id: campaign.id } })
          .then((camp) => {
            //aggiornamento contattati
            campaign.ncompleted = countContacted;
            camp.ncompleted = countContacted;
            if (camp.ncompleted === camp.ncontacts) {
              camp.state = "complete";
              campaign.state = "complete";
            }

            //calcolo orario di fine presunto
            var nMillis = (camp.ncontacts - camp.ncompleted) * this.waitTime;
            var now = new Date().getTime();
            var endTime = new Date(now + nMillis);
            camp.end = endTime;
            camp.save();
            callback({});
          });
      });
  }

  startServer() {
    if (!isMainThread) {
      parentPort.on("message", (message) => {
        if (message == "/campaigns/getAll")
          parentPort.postMessage(this.smsCampaigns);
        else if (message == "/campaigns/reload") {
          this.reloadActiveCampaings();
          parentPort.postMessage(this.smsCampaigns);
        }
        else if (message == "/gateways/getAll")
          parentPort.postMessage(JSON.parse(JSON.stringify(this.smsGateways)));
        else if (message == "/process/exit") {
          parentPort.postMessage("sold!");
          parentPort.close();
        }
      });

      setInterval(() => {
        this.startCampaignManager();
      }, config.waitTime);
    }
  }
};

const smsServerIstance=new SmsServer();
module.exports = smsServerIstance;
smsServerIstance.startServer();
