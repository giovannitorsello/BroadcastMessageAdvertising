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

module.exports = {
  app: {},
  database: {},

  setup(app, db) {
    this.app = app;
    this.database = db;
    this.loadSmsGateways();
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
      waitTime = 1000 * (86400 / (nMaxSmsPerSim * nTotRadios));
      //start campaigns execution
      setInterval(() => {
        this.startCampaignManager();
      }, waitTime);
    });
  },
  startCampaignManager() {
    this.smsCampaigns.forEach((campaign) => {
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
    this.sendMessage(campaign, gateway, contact);
  },
  sendMessage(campaign, gateway, contact) {
    var ip = gateway.ip;
    var mobilephone = contact.mobilephone;
    var message = this.formatMessage(campaign, contact);
    if (message !== "") {
      console.log(
        "Sending  " +
          message +
          " -- " +
          gateway.name +
          "--" +
          gateway.selectedLine +
          " to " +
          contact.mobilephone
      );

      this.database.entities.customer.findOne({where: {id: contact.id}}).then( cust => {
        cust.state="contacted";
        cust.save().then(custSaved => {
          campaign.contacts[selectedContact].state="contacted";
          this.database.entities.messageCampaign.findOne({where: {id: custSaved.campaignId}}).then(camp => {
            if(camp.ncompleted<camp.ncontacts) camp.ncompleted++;
            camp.save().then(campSaved => {

            });
          });
        })
      });

      /*
        sms_gateway_hardware.sendSMS(
            gateway, 
            campaign.message, contact.mobilephone,
            function(response){
                console.log(response);
            })
        */
    }
  },
  formatMessage(campaign, contact) {
    var hexidContact = parseInt(contact.id).toString(36);
    var hexidCampaign = parseInt(campaign.id).toString(36);
    if (campaign.links && campaign.links.length > 0) {
      var hexidLink1 = parseInt(campaign.links[0].id).toString(36);
      var hexidLink2 = parseInt(campaign.links[1].id).toString(36);
      link1 =
        config.shortDomain +
        "/" +
        hexidCampaign +
        "/" +
        hexidContact +
        "/" +
        hexidLink1;
      link2 =
        config.shortDomain +
        "/" +
        hexidCampaign +
        "/" +
        hexidContact +
        "/" +
        hexidLink2;
      var message = campaign.message;
      message = message.replace("|link1|", link1);
      message = message.replace("|link2|", link2);
      return message;
    }
    return "";
  },
  selectCampaignLinks(campaign, callback) {
    this.database.entity.links
      .findAll({ where: { id: campaign.id } })
      .then((links) => {
        if (links) callback(links);
      });
  },
  selectCurrentContact(campaign) {
    var currContact=campaign.contacts[selectedContact];
    selectedContact++;
    if(selectedContact>campaign.ncontacts) selectedContact=0;
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
  startCampaign(campaignData, callback) {
    return callback();
  },
  stopCampaign(campaignData, callback) {
    return callback();
  },
  getCampaignInfo(campaignData, callback) {
    return callback();
  },
  loadSmsGateways() {
    smsGateways = config.smsGateways;
    //Calculate total number of radios
    for (var i = 0; i < smsGateways.length; i++) {
      nTotRadios = smsGateways[i].nRadios;
    }
  },
  loadCampaings(callback) {
    var campaigns = [];
    //Charge active campaign and their links
    this.database.entities.messageCampaign.findAll().then((camps) => {
      if (camps) {
        camps.forEach((camp) => {
          //recover campaign links
          this.database.entities.link
            .findAll({ where: { campaignId: camp.id } })
            .then((links) => {
              camp.links = links;
              
              this.database.entities.customer.findAll({ where: { campaignId: camp.id } }).then((contacts) => {
                camp.contacts=contacts;
                camp.ncontacts=contacts.length;
                campaigns.push(camp);
                callback(campaigns);
              });
              
            });
        });
      }
    });
  },
  reloadActiveCampaings(callback) {
    //Charge active campaign and their links
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
    });
  },
};
