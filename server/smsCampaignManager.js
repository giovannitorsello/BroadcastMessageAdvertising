const config = require("./config.js").load();
const { fork } = require("child_process");
const sms_gateway_hardware = require("./smsGateway.js");

var smsGateways = [];
var smsCampaigns = [];
var smsContacts = [];
var selectedGateway = 0;
var selectedContact = 0;
var waitTime = 5000;

module.exports = {
  app: {},
  database: {},

  setup(app, db) {
    this.app = app;
    this.database = db;
    this.loadSmsGateways((gateways) => {
      smsGateways = gateways;
      this.loadCampaings((campaigns) => {
        this.smsCampaigns = campaigns;
        //start campaigns execution
        setInterval(() => {
          setImmediate(() => {
            return Promise.all([this.startCampaignManager()]);
          });
        }, config.waitTime);
      });
    });
  },
  getGateways() {
    return smsGateways;
  },
  startCampaignManager() {
    return new Promise((resolve, reject) => {
      this.smsCampaigns.forEach((campaign, index, arrCamp) => {
        //controllo campagna attiva
        if (campaign.state === "active") {
          //Seleziona automaticamente il messaggio successivo e il dispositivo da utilizzare
          this.sendNextMessage(campaign, (response) => {
            console.log("Message sent");
          });
        }
        if (index === arrCamp.length - 1) resolve();
      });
    });
  },
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
  },
  sendMessage(campaign, iDevice, contact, callback) {
    if (!smsGateways[iDevice]) return;
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
      var senderDevice = smsGateways[iDevice];
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
            smsGateways[iDevice].nSmsSent++;
            smsGateways[iDevice].objData.smsSent[selectedSenderLine]++;
            smsGateways[iDevice].save();
            this.antifraudRoutine(iDevice, selectedSenderLine, (respose) => {
              console.log("Antifraud execute.");
              this.updateCampaignData(campaign, response => callback(response));
            });
          }
        }
      );
    }
  },
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
      link = config.shortDomain + "/" + hexidCampaign + "/" + hexidContact;
      var message = campaign.message;
      return message + " " + link;
    }
    return "";
  },
  selectCurrentContact(campaign) {
    if (!campaign.contacts) {
      database.entities.customer
        .findAll({ where: { campaignId: campaign.id } })
        .then((custs) => {
          campaign.contacts = custs;
          selectedContact = 0;
          var currContact = campaign.contacts[selectedContact];
          selectedContact++;
          return currContact;
        });
    } else {
      var currContact = campaign.contacts[selectedContact];
      selectedContact++;
      if (selectedContact > campaign.ncontacts) selectedContact = 0;
      return currContact;
    }
  },
  selectCurrentGateway() {
    var i = 0;
    var selGat = 0;
    var nSmsSent = smsGateways[selGat].nSmsSent;

    //select line with less sent sms
    while (i < smsGateways.length) {
      if (nSmsSent >= smsGateways[i].nSmsSent && smsGateways[i].isWorking) {
        nSmsSent = smsGateways[i].nSmsSent;
        selGat = i;
      }
      i++;
    }
    return selGat;
  },
  loadSmsGateways(callback) {
    var gateways = [];
    this.database.entities.gateway.findAll().then((results) => {
      if (results.length > 0) {
        gateways = results;
        gateways.forEach((gat) => {
          gat.selectedLine = 0; //Line= line starts from 1 will be incremented in selectGateway function
        });
      } else {
        gateways = config.smsGateways;
        gateways.forEach((gat) => {
          gat.id = "";
          this.database.entities.gateway.create(gat);
        });
      }

      //Calculate total number of radios
      nTotRadios = 0;
      for (var i = 0; i < gateways.length; i++) {
        nTotRadios += gateways[i].nRadios;
      }

      callback(gateways);
    });
  },
  loadCampaings(callback) {
    var campaigns = [];
    //Charge active campaign
    this.database.entities.messageCampaign.findAll().then((camps) => {
      if (camps) {
        camps.forEach((camp) => {
          this.database.entities.customer
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
  },
  reloadActiveCampaings(callback) {
    //Charge active campaign and their
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
    });
  },
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
  },
  sendAntifraudMessage(
    receiverGateway,
    selectedReceiverLine,
    senderGateway,
    callback
  ) {
    var selectedSenderLine = this.getDeviceLineWithLessSent(senderGateway);
    var senderDevice = smsGateways[senderGateway];
    var receiverDevice = smsGateways[receiverGateway];
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
  },
  getAntigraudMessageText() {
    var antifraudMessageTexts = config.antifraudMessageTexts;
    var nRand = Math.floor(
      Math.random() * (config.antifraudMessageTexts.length - 1)
    );
    return antifraudMessageTexts[nRand];
  },
  getDeviceLineWithLessSent(iDevice) {
    var device = smsGateways[iDevice];
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
  },
  getDeviceLineWithLessReceived(iDevice) {
    var device = smsGateways[iDevice];
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
  },
  isOutOfAntifroudBalance(iDevice, iLine) {
    var device = smsGateways[iDevice];
    var sentSms = device.objData.smsSent[iLine];
    var receivedSms = device.objData.smsReceived[iLine];
    var percentage = 100 - Math.ceil((100 * receivedSms) / sentSms);
    if (percentage > device.nMaxSentPercetage) return true;
    else return false;
  },
  getSenderForAntifraudBalance(iDevice) {
    var receiverDevice = smsGateways[iDevice];
    var nSmsSent = 0,
      senderGateway = 0;
    smsGateways.forEach((gat, index, arrGat) => {
      if (gat.operator != receiverDevice.operator && gat.isWorking) {
        // select other gateway
        if (nSmsSent >= gat.nSmsSent || nSmsSent === 0) {
          //search minimum messages
          nSmsSent = gat.nSmsSent;
          senderGateway = index;
        }
      }
      if (index === arrGat.length - 1 && smsGateways[senderGateway].isWorking) {
        return senderGateway;
      }
    });
    return senderGateway;
  },
  updateCampaignData(campaign, callback) {
    this.database.entities.customer
      .count({
        where: {
          campaignId: campaign.id,
          state: "contacted",
        },
      })
      .then((countContacted) => {
        this.database.entities.messageCampaign
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
            var nMillis = (camp.ncontacts - camp.ncompleted) * waitTime;
            var now = new Date().getTime();
            var endTime = new Date(now + nMillis);
            camp.end = endTime;
            camp.save();
            callback({});
          });
      });
  },
};
