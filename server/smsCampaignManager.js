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

        var nMaxSmSPerHour = config.maxSmsPerSimPerHour * nTotRadios;
        waitTime = 1000 * (14400 / nMaxSmSPerHour);
        if (waitTime < 5000) waiTime = 5000; //force a minumum of 10 secs between two messages
        //For debug only
        waitTime = 1000;
        //start campaigns execution
        this.startCampaignManager();
        setInterval(() => {
          this.startCampaignManager();
        }, waitTime);
      });
    });
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
    var gateway = this.selectCurrentGateway();
    var dateCampaign = Date.parse(campaign.begin);
    var now = new Date().getTime();
    //Controllo su data ed ora di inizio
    if (now > dateCampaign && campaign.state === "active") {
      this.sendMessage(campaign, gateway, contact);

      this.database.entities.messageCampaign
        .findOne({ where: { id: campaign.id } })
        .then((camp) => {
          //calcolo orario di fine presunto
          var nMillis = (camp.ncontacts - camp.ncompleted) * waitTime;
          var now = new Date().getTime();
          var endTime = new Date(now + nMillis);
          camp.end = endTime;
          camp.save();
        });
    }
  },
  sendMessage(campaign, gateway, contact) {
    if (!campaign || campaign.state !== "active") return;
    if (!contact || contact.state === "contacted") return;
    var database = this.database;
    var ip = gateway.ip;
    var mobilephone = contact.mobilephone;
    var message = this.formatMessage(campaign, contact);
    if (message !== "" && contact.state === "toContact") {
      sms_gateway_hardware.sendSMS(
        gateway,
        message,
        contact.mobilephone,
        (response) => {
          if (response.status) {
            database.entities.customer
              .findOne({ where: { id: contact.id } })
              .then((cust) => {
                if (response.status === "send") {
                  cust.state = "contacted";
                  campaign.contacts[selectedContact - 1].state = "contacted";
                  cust.save().then((custSaved) => {
                    database.entities.messageCampaign
                      .findOne({ where: { id: custSaved.campaignId } })
                      .then((camp) => {
                        if (camp.ncompleted < camp.ncontacts) camp.ncompleted++;
                        if (camp.ncompleted === camp.ncontacts)
                          camp.state = "complete";
                        camp.save().then((campSaved) => {
                          gateway.nSmsSent++;
                          database.entities.gateway
                            .findOne({ where: { id: gateway.id } })
                            .then((gat) => {
                              gat.nSmsSent = gateway.nSmsSent;
                              gat.save();
                              this.antifraudRoutine(gateway);
                            });
                        });
                      });
                  });
                } else {
                  cust.state = "toContact";
                  campaign.contacts[selectedContact - 1].state = "toContact";
                }
              });
          }
          console.log(response);
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
    if (!campaign.contacts) return {};
    var currContact = campaign.contacts[selectedContact];
    selectedContact++;
    if (selectedContact > campaign.ncontacts) selectedContact = 0;
    return currContact;
  },
  selectCurrentGateway() {
    //Find the first active gateway
    while (!smsGateways[selectedGateway].isWorking) {
      selectedGateway++;
      if (selectedGateway === smsGateways.length) selectedGateway = 0;
    }
    var found_active_gateway = smsGateways[selectedGateway];

    //Adjiust line in device
    if (found_active_gateway) {
      if (!found_active_gateway.selectedLine)
        found_active_gateway.selectedLine = 1;
      else if (
        found_active_gateway.selectedLine >= found_active_gateway.nRadios
      )
        found_active_gateway.selectedLine = 1;
      else found_active_gateway.selectedLine++;
    }

    //increment index to prepare next gateway for next message
    selectedGateway++;
    if (selectedGateway === smsGateways.length) selectedGateway = 0;

    return found_active_gateway;
  },
  /*
  startCampaign(campaignData, callback) {
    return callback();
  },
  stopCampaign(campaignData, callback) {
    return callback();
  },
  getCampaignInfo(campaignData, callback) {
    return callback();
  },*/
  loadSmsGateways(callback) {
    var gateways = [];
    this.database.entities.gateway.findAll().then((results) => {
      if (results.length > 0) gateways = results;
      else {
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
            .findAll({ where: { campaignId: camp.id } })
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
  antifraudRoutine(gateway) {
    //Antifroud routine
    var nToReceive =
      gateway.nMaxDailyMessagePerLine * (1 - gateway.nMaxSentPercetage / 100);
    var factor = Math.floor(gateway.nMaxDailyMessagePerLine / nToReceive);
    if (gateway.nSmsSent % factor === 0) {
      //build list of other operator gateways
      var gatewaysToSend = [];
      smsGateways.forEach((gat, index, arrGat) => {
        if (gat.operator != gateway.operator && gat.isWorking) {
          gatewaysToSend.push(gat);
        }
        if (index === arrGat.length - 1) {
          var nSmsSent = gatewaysToSend[0].nSmsSent;
          this.gatewayToSentAntifraudMessage = gatewaysToSend[0];
          //find gateway with less messages sent (gateway more free)
          gatewaysToSend.forEach((gatOtherOp, indexOtherOp, arrGatOtherOp) => {
            if (nSmsSent > gatOtherOp.nSmsSent && gatOtherOp.isWorking) {
              nSmsSent = gatOtherOp.nSmsSent;
              this.gatewayToSentAntifraudMessage = arrGatOtherOp[gatOtherOp];
            }

            if (indexOtherOp === arrGatOtherOp.length - 1) {
              this.sendAntifraudMessage(
                this.gatewayToSentAntifraudMessage,
                gateway
              );
            }
          });
        }
      });
    }
  },
  sendAntifraudMessage(sender, receiver) {
    if (!receiver.objData) return;
    if (!receiver.objData.lines) return;
    if (sender.selectedLine >= sender.nRadios) sender.selectedLine = 0;
    if (receiver.selectedLine >= sender.nRadios) receiver.selectedLine--;

    var mobilephone = receiver.objData.lines[receiver.selectedLine];
    if (!mobilephone) return;

    var message = this.getAntigraudMessageText();
    if (message !== "") {
      console.log("Next is an antifraud message");
      sms_gateway_hardware.sendSMS(sender, message, mobilephone, (response) => {
        this.database.entities.gateway
          .findOne({ where: { id: sender.id } })
          .then((gat) => {
            gat.nSmsSent++;
            gat.save();
          });

        this.database.entities.gateway
          .findOne({ where: { id: receiver.id } })
          .then((gat) => {
            gat.nSmsReceived++;
            gat.save();
          });
        console.log(response);
      });
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
