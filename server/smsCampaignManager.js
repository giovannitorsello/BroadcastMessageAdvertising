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
        waitTime = 2000;

        //start campaigns execution        
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
    }
  },
  sendMessage(campaign, gateway, contact) {
    if (!campaign) return;
    if (!contact) return;
    var database = this.database;
    var ip = gateway.ip;
    var mobilephone = contact.mobilephone;
    //console.log("try to send message to:" + contact.mobilephone);
    var message = this.formatMessage(campaign, contact);
    if (message !== "" && contact.state === "toContact" && campaign.state === "active") {
      sms_gateway_hardware.sendSMS(
        gateway,
        message,
        contact.mobilephone,
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
                    gateway.nSmsSent++;
                    database.entities.gateway
                      .findOne({ where: { id: gateway.id } })
                      .then((gat) => {
                        gat.nSmsSent = gateway.nSmsSent;
                        gat.save();                        
                      });
                  });
                } else {
                  cust.state = "toContact";
                  campaign.contacts[selectedContact - 1].state = "toContact";
                }
              });
          }
        }
      );
      this.antifraudRoutine(gateway);
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
            if (camp.ncompleted === camp.ncontacts) {camp.state = "complete"; campaign.state= "complete";}

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
        found_active_gateway.selectedLine > found_active_gateway.nRadios
      )
        found_active_gateway.selectedLine = 1;
      else 
        found_active_gateway.selectedLine++;
    }

    //increment index to prepare next gateway for next message
    selectedGateway++;
    if (selectedGateway === smsGateways.length) selectedGateway = 0;

    return found_active_gateway;
  },
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
            .findAll({ where: { campaignId: camp.id },  order: [['state', 'DESC']] })
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
    //var nToReceive =gateway.nMaxDailyMessagePerLine * (1 - gateway.nMaxSentPercetage / 100);
    var factor = Math.ceil(100/(100-gateway.nMaxSentPercetage)); //Math.floor(gateway.nMaxDailyMessagePerLine / nToReceive);
    if (gateway.nSmsSent % factor === 0) {
      //build list of other operator gateways
      var sendingGateways = [];
      smsGateways.forEach((gat, index, arrGat) => {
        if (gat.operator != gateway.operator && gat.isWorking) {
          sendingGateways.push(gat);
        }
        if ((index === arrGat.length - 1) && sendingGateways.length>0) {
          //find gateway with less messages sent (gateway more free)
          var nSmsSent = sendingGateways[0].nSmsSent;
          this.sendingGateway = sendingGateways[0];          
          sendingGateways.forEach((gatOtherOp, indexOtherOp, arrGatOtherOp) => {
            if(!gatOtherOp.nSmsSent)
              gatOtherOp.nSmsSent=0;
            if (nSmsSent > gatOtherOp.nSmsSent && gatOtherOp.isWorking) {
              nSmsSent = gatOtherOp.nSmsSent;
              this.sendingGateway = arrGatOtherOp[indexOtherOp];
            }

            if ((indexOtherOp === arrGatOtherOp.length - 1) && (this.sendingGateway)) {
              this.sendAntifraudMessage(this.sendingGateway,gateway);
            }
          });
        }
      });
    }
  },
  sendAntifraudMessage(sender, receiver) {
    if (!receiver.objData) return;
    if (!receiver.objData.lines) return;
    if (!sender.objData) return;
    if (!sender.objData.lines) return;
    if(!sender.selectedLine) sender.selectedLine = 1;
    var selectedSenderLine=sender.selectedLine;
    var selectedReceiverLine=receiver.selectedLine;
    if (selectedSenderLine > sender.nRadios) selectedSenderLine = sender.nRadios;
    if (selectedReceiverLine > receiver.nRadios) selectedReceiverLine=sender.nRadios;

    selectedSenderLine=Math.floor(Math.random()*8+1);
    var mobilephone = receiver.objData.lines[selectedReceiverLine-1];
    if (!mobilephone) return;
    var senderDevice={
      name: sender.name, 
      operator: sender.operator, 
      ip: sender.ip, 
      port: sender.port, 
      selectedLine: selectedSenderLine, 
      login: sender.login, 
      password: sender.password, 
      objData: sender.objData,
      isWorking: sender.isWorking
    };
    var message = this.getAntigraudMessageText();
    if (message !== "") {
      console.log("Next is an antifraud message "+ 
      senderDevice.operator +" -- "+ selectedSenderLine +" --> "+
      receiver.operator +" -- "+ selectedReceiverLine);

      sms_gateway_hardware.sendSMSAntifraud(senderDevice, message, mobilephone, (response) => {
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
