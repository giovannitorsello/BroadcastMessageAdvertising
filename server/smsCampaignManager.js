const config = require("./config.js").load();
const { fork } = require("child_process");
const sms_gateway_hardware = require("./smsGateway.js");

var smsGateways = [];
var smsCampaigns = [];
var smsContacts = [];
var selectedGateway = 0;
var selectedContact = 0;
var waitTime = 5000;
var nMaxSmsPerSim = 200;
var nTotRadios = 8;

//antifraud routine variables
var gatewayToSentAntifraudMessage = {};

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
          this.startCampaignManager();
        }, config.waitTime);
      });
    });
  },
  getGateways() {
    return smsGateways;
  },
  startCampaignManager() {
    this.smsCampaigns.forEach((campaign) => {
      //controllo campagna attiva
      if (campaign.state === "active") {
        //Seleziona automaticamente il messaggio successivo e il dispositivo da utilizzare
        this.sendNextMessage(campaign);
      }
    });
  },
  sendNextMessage(campaign) {
    //Select next contact in couch database
    // Gateways selection
    var contact = this.selectCurrentContact(campaign);
    var selecteGateway = this.selectCurrentGateway();
    var dateCampaign = Date.parse(campaign.begin);
    var now = new Date().getTime();
    //Controllo su data ed ora di inizio
    if (now > dateCampaign && campaign.state === "active") {
      this.sendMessage(campaign, selecteGateway, contact);
    }
  },
  sendMessage(campaign, selGat, contact) {
    if (!smsGateways[selGat]) return;
    if (!campaign) return;
    if (!contact) return;
    var database = this.database;
    //var gat = JSON.parse(JSON.stringify(gateway));
    var mobilephone = contact.mobilephone;
    //console.log("try to send message to:" + contact.mobilephone);
    var message = this.formatMessage(campaign, contact);
    if (
      message !== "" &&
      contact.state === "toContact" &&
      campaign.state === "active"
    ) {
      //Line selection
      var senderDevice = smsGateways[selGat];
      var selectedSenderLine = 0,
        nMessSent = senderDevice.objData.smsSent[0];
      while (
        nMessSent >= senderDevice.objData.smsSent[selectedSenderLine] &&
        selectedSenderLine < senderDevice.objData.smsSent.length
      ) {
        nMessSent = senderDevice.objData.smsSent[selectedSenderLine];
        selectedSenderLine++;
      }
      smsGateways[selGat].selectedLine = selectedSenderLine;

      sms_gateway_hardware.sendSMS(
        smsGateways[selGat],
        message,
        mobilephone,
        (response) => {
          if (response.status) {
            database.entities.customer
              .findOne({ where: { id: contact.id } })
              .then((cust) => {
                if (
                  response.status === "send" ||
                  response.status === "sending"
                ) {
                  cust.state = "contacted";
                  campaign.contacts[selectedContact - 1].state = "contacted";
                  cust.save().then((custSaved) => {
                    smsGateways[selGat].nSmsSent++;
                    smsGateways[selGat].objData.smsSent[
                      smsGateways[selGat].selectedLine - 1
                    ]++;
                    smsGateways[selGat].save().then((gateSaved) => {
                      this.antifraudRoutine(selGat);
                    });
                  });
                } else {
                  cust.state = "toContact";
                  
                  campaign.contacts[selectedContact - 1].state = "toContact";
                  smsGateways[selGat].nSmsSent++;
                  smsGateways[selGat].objData.smsSent[
                    smsGateways[selGat].selectedLine - 1
                  ]++;
                }
              });
          }
        }
      );
    }

    //Update ncompleted campaign
    database.entities.customer
      .count({ where: { campaignId: campaign.id, state: "contacted" } })
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
            var nMillis = (camp.ncontacts - camp.ncompleted) * waitTime;
            var now = new Date().getTime();
            var endTime = new Date(now + nMillis);
            camp.end = endTime;

            camp.save();
          });
      });
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
    var i = 0,
      selGat = 0,
      nSmsSent = smsGateways[selGat].nSmsSent;

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
  antifraudRoutine(receiverGateway) {
    //Antifroud routine
    //var nToReceive =gateway.nMaxDailyMessagePerLine * (1 - gateway.nMaxSentPercetage / 100);
    //var factor = Math.ceil(
    //  100 / (100 - smsGateways[receiverGateway].nMaxSentPercetage)
    //); //Math.floor(gateway.nMaxDailyMessagePerLine / nToReceive);
    var gateway = smsGateways[receiverGateway];
    var sentSmsSIM =
      gateway.objData.smsSent[smsGateways[receiverGateway].selectedLine - 1];
    var receivedSmsSIM =
      gateway.objData.smsReceived[
        smsGateways[receiverGateway].selectedLine - 1
      ];

    var percentage = 100 - Math.ceil((100 * receivedSmsSIM) / sentSmsSIM);
    if (percentage > smsGateways[receiverGateway].nMaxSentPercetage) {
      var nSmsSent = 0;
      var sendingGateway = 0;
      smsGateways.forEach((gat, index, arrGat) => {
        if (gat.operator != gateway.operator && gat.isWorking) {
          // select other gateway
          if (nSmsSent >= gat.nSmsSent || nSmsSent === 0) {
            //search minimum messages
            nSmsSent = gat.nSmsSent;
            sendingGateway = index;
          }
        }
        if (
          index === arrGat.length - 1 &&
          smsGateways[sendingGateway].isWorking
        ) {
          this.sendAntifraudMessage(sendingGateway, receiverGateway);
        }
      });
    }
  },
  sendAntifraudMessage(sender, receiver) {
    if (!smsGateways[receiver].objData) {
      console.log("SendAntifraudMessage - no objData in receiver");
      return;
    }
    if (!smsGateways[receiver].objData.lines) {
      console.log("SendAntifraudMessage - no lines in receiver");
      return;
    }
    if (!smsGateways[sender].objData) {
      console.log("SendAntifraudMessage - no lines in sender");
      return;
    }
    if (!smsGateways[sender].objData.lines) {
      console.log("SendAntifraudMessage - no lines in sender");
      return;
    }
    var selectedSenderLine = 1;
    var selectedReceiverLine = 1;
    var senderDevice = smsGateways[sender];
    var receiverDevice = smsGateways[receiver];

    //select line with less sent sms
    var selectedSenderLine = 0,
      nMessSent = senderDevice.objData.smsSent[0];
    while (
      nMessSent >= senderDevice.objData.smsSent[selectedSenderLine] &&
      selectedSenderLine < senderDevice.objData.smsSent.length
    ) {
      nMessSent = senderDevice.objData.smsSent[selectedSenderLine];
      selectedSenderLine++;
    }

    //select line with less received sms
    var selectedReceiverLine = 0,
      nMessRecv = receiverDevice.objData.smsReceived[0];
    while (
      nMessRecv >= receiverDevice.objData.smsReceived[selectedReceiverLine] &&
      selectedReceiverLine < receiverDevice.objData.smsReceived.length
    ) {
      nMessRecv = receiverDevice.objData.smsReceived[selectedReceiverLine];
      selectedReceiverLine++;
    }

    var mobilephone =
      smsGateways[receiver].objData.lines[selectedReceiverLine - 1];
    if (!mobilephone) return;

    var message = this.getAntigraudMessageText();
    if (message !== "") {
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

      senderDevice.selectLine = selectedSenderLine + 1;
      sms_gateway_hardware.sendSMSAntifraud(
        senderDevice,
        message,
        mobilephone,
        (response) => {
          smsGateways[sender].objData.smsSent[selectedSenderLine - 1]++;
          smsGateways[sender].nSmsSent++;
          smsGateways[sender].save();

          smsGateways[receiver].objData.smsReceived[selectedReceiverLine - 1]++;
          smsGateways[receiver].nSmsReceived++;
          smsGateways[receiver].save();
        }
      );
    }
  },
  getAntigraudMessageText() {
    var antifraudMessageTexts = config.antifraudMessageTexts;
    var nRand = Math.floor(
      Math.random() * (config.antifraudMessageTexts.length - 1)
    );
    return antifraudMessageTexts[nRand];
  },
};
