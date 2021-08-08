const { relativeTimeThreshold } = require("moment-timezone");

const config = require("./config.js").load();
sms_gateway_hardware = require("./smsGateway.js");

class SmsServer {
  smsSims = [];
  smsGateways = [];
  smsCampaigns = [];
  smsContacts = [];
  selectedGateway = 0;
  selectedContact = 0;
  waitTime = 1000;
  nTotRadios = 0;
  nAntifroudMessage = 0;
  inteval = {};
  database = {};
  lastUpdateTimeStats=0;

  constructor(app, database) {
    this.database = database;
    this.init();
  }

  init() {
    this.loadSims((sims) => {
      this.sims = sims;
    });
    this.loadGateways((gateways) => {
      this.smsGateways = gateways;
    });
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
    });
  }

  checkIfBalanceIsPossible() {
    this.database.checkIfBalanceIsPossible((results) => {
      if (results.length >= 2) return true;
      else {
        //Stop all campaigns
        this.disableAllCampaigns();
        return false;
      }
    });
  }

  checkGatewayIsWorking(iGateway) {
    var iLine = 0;
    var bIsWorking = false;
    var gateway = this.smsGateways[iGateway];
    var objData = gateway.objData;
    //Check if line reach max smsSent
    while (iLine < objData.lines.length) {
      //Check if line reach max smsSent
      if (objData.smsSent[iLine] >= gateway.nMaxDailyMessagePerLine)
        this.smsGateways[iGateway].objData.isWorkingSms[iLine] = false;

      bIsWorking =
        bIsWorking || this.smsGateways[iGateway].objData.isWorkingSms[iLine];
      iLine++;
    }

    if (bIsWorking !== gateway.isWorkingSms) {
      gateway.isWorkingSms = bIsWorking;
      gateway.changed("objData", true);
      gateway.save();

      this.checkIfBalanceIsPossible();
    }
  }


  startCampaignManager() {
    this.smsCampaigns.forEach((campaign, index, arrCamp) => {
      //controllo campagna attiva
      if (campaign.state === "active") {
        this.sendNextMessage(campaign, (response) => console.log(response));        
      }
    });
  }

  sendNextMessage(campaign, callback) {
    //Controllo su data ed ora di inizio
    var dateCampaign = Date.parse(campaign.begin);
    var now = new Date().getTime();
    if (now > dateCampaign && campaign.state === "active") {
      var contact = this.selectCurrentContact(campaign);

      //invio tramite sistema GOIP
      if (campaign.senderService === 0) {
        var selecteGateway = this.selectCurrentGateway();
        this.sendMessage(campaign, selecteGateway, contact, (response) => {
          callback(response);
        });
      }

      //invio tramite internet
      if (campaign.senderService > 0) {
        var serviceName = config.senderServices[campaign.senderService].name;
        var servicePlugin =
          config.senderServices[campaign.senderService].plugin;
        var senderPhone =
          config.senderServices[campaign.senderService].senderPhone;
        var senderClass =
          config.senderServices[campaign.senderService].senderClass;
        var pluginFile = "./internetGateways/" + servicePlugin;
        var plugin = require(pluginFile);
        var message = this.formatMessage(campaign, contact);

        //Testing
        if (
          contact &&
          contact.mobilephone &&
          message &&
          config.production === false
        ) {
          console.log(
            "Send to " +
              contact.mobilephone +
              " message: " +
              message +
              " by internet"
          );
          contact.state = "contacted";
          if(!contact.objData) contact.objData = {};
          contact.objData.idSender = 0;
          contact.changed("objData", true);
          contact.save().then((cont) => {
            console.log("Contact " + cont.mobilephone + " updated");
            this.updateCampaignData(campaign, (response) => callback(response));
          });
        }

        //Production
        if (
          contact &&
          contact.mobilephone &&
          message &&
          config.production === true
        )
          plugin.sendSms(
            contact.mobilephone,
            message,
            senderPhone,
            senderClass,
            (response) => {
              if (response.id !== 0 && response.msg === "OK") {
                console.log(
                  "Send to " +
                    contact.mobilephone +
                    " message: " +
                    message +
                    " by internet, with id=" +
                    response.id
                );
                contact.state = "contacted";
                if(!contact.objData) contact.objData = {};
                contact.objData.idSender = response.id;
                contact.changed("objData", true);
                contact.save().then((cont) => {
                  console.log("Contact " + cont.mobilephone + " updated");
                  this.updateCampaignData(campaign, (response) =>
                    callback(response)
                  );
                });
              } else {
                console.log("Error on contact: " + contact.mobilephone);
                contact.state = "contacted";
                if(!contact.objData) contact.objData = {};
                contact.objData.idSender = 0;
                contact.changed("objData", true);
                contact.save().then((cont) => {
                  console.log("Contact " + cont.mobilephone + " updated");
                  this.updateCampaignData(campaign, (response) =>
                    callback(response)
                  );
                });
              }
            }
          );
      }
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
      (contact.state === "toContact") && // || contact.state === "called"
      campaign.state === "active"
    ) {
      //Line selection
      var senderDevice = this.smsGateways[iDevice];
      var selectedSenderLine = this.getDeviceLineWithLessSent(iDevice);

      if (senderDevice.objData.isWorkingSms[selectedSenderLine])
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
              this.smsGateways[iDevice]
                .save({ fields: ["nSmsSent", "objData"] })
                .then((savedgateway) => {
                  this.antifraudRoutine(
                    iDevice,
                    selectedSenderLine,
                    (respose) => {
                      console.log("Antifraud execute.");
                      this.updateCampaignData(campaign, (response) =>
                        callback(response)
                      );
                    }
                  );
                })
                .catch((error) => {
                  console.log(error);
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
      this.database.entities.customer
        .findAll({ where: { campaignId: campaign.id, state: "toContact" } })
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
      this.checkGatewayIsWorking(i);
      if (
        nSmsSent >= this.smsGateways[i].nSmsSent &&
        this.smsGateways[i].isWorkingSms
      ) {
        nSmsSent = this.smsGateways[i].nSmsSent;
        selGat = i;
      }
      i++;
    }
    return selGat;
  }

  loadSims(callback) {
    var sims = [];
    this.database.entities.sim
      .findAll({ order: [["id", "DESC"]] })
      .then((results) => {
        if (results.length > 0) {
          sims = results;
          callback(sims);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  loadGateways(callback) {
    var gateways = [];
    this.database.entities.gateway
      .findAll({ order: [["id", "ASC"]] })
      .then((results) => {
        if (results.length > 0) {
          gateways = results;
          for (var i = 0; i < gateways.length; i++) {
            if (gateways[i].isWorkingSms)
              this.nTotRadios += gateways[i].nRadios;
          }
          callback(gateways);
        }
      })
      .catch((error) => {
        callback([]);
        console.log(error);
      });
  }

  loadCampaings(callback) {
    var campaigns = [];
    //Charge active campaign
    this.database.entities.messageCampaign
      .findAll({ order: [["id", "DESC"]] })
      .then((camps) => {
        if (camps) {
          camps.forEach((camp, index, array) => {
            //Load remain contact only for active campaigns
            if(camp.state==="active") {
              this.database.entities.customer
                .findAll({
                  where: { campaignId: camp.id, state: "toContact" },
                  order: [["state", "DESC"]],
                })
                .then((contacts) => {
                  camp.contacts = contacts;
                  //camp.ncontacts = contacts.length;
                });
            }
            campaigns.push(camp);
            if (index === array.length - 1) callback(campaigns);
          });
        }
      });
  }

  disableAllCampaigns() {
    for (var iCamp = 0; iCamp < this.smsCampaigns.length; iCamp++) {
      this.smsCampaigns[iCamp].state = "disabled";
      this.smsCampaigns[iCamp].save();
    }
    this.reloadActiveCampaings();
  }

  reloadActiveCampaings() {
    //Reload gateways
    this.loadGateways((gateways) => {
      this.smsGateways = gateways;
    });

    //Charge active campaigns and their contacts
    this.loadCampaings((campaigns) => {
      this.smsCampaigns = campaigns;
      //Before start chect gateways situation
      this.checkIfBalanceIsPossible();
    });
  }

  antifraudRoutine(receiverGateway, selectedReceiverLine, callback) {
    if (this.isOutOfAntifroudBalance(receiverGateway, selectedReceiverLine)) {
      var sender = this.getSenderForAntifraudBalance(
        receiverGateway,
        selectedReceiverLine
      );
      this.sendAntifraudMessage(
        receiverGateway,
        selectedReceiverLine,
        sender,
        (response) => {
          callback(response);
          this.nAntifroudMessage++;
        }
      );
    } else callback("done");
  }

  sendAntifraudMessage(
    receiverGateway,
    selectedReceiverLine,
    sender,
    callback
  ) {
    var selectedSenderLine = sender.senderLine;
    var selectedSenderGateway = sender.senderGateway;
    var senderDevice = this.smsGateways[selectedSenderGateway];
    var receiverDevice = this.smsGateways[receiverGateway];
    var mobilephone = receiverDevice.objData.lines[selectedReceiverLine];
    var message = this.getAntifraudMessageText();

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

    if (
      senderDevice.objData.isWorkingSms[selectedSenderLine] &&
      receiverDevice.objData.isWorkingSms[selectedReceiverLine]
    )
      sms_gateway_hardware.sendSMSAntifraud(
        senderDevice,
        selectedSenderLine,
        message,
        mobilephone,
        (response) => {
          senderDevice.nSmsSent++;
          senderDevice.objData.smsSent[selectedSenderLine]++;
          senderDevice.save({ fields: ["nSmsSent", "objData"] });

          receiverDevice.nSmsReceived++;
          receiverDevice.objData.smsReceived[selectedReceiverLine]++;
          receiverDevice.save({ fields: ["nSmsSent", "objData"] });

          //if SIM are non balanced
          this.antifraudRoutine(
            selectedSenderGateway,
            selectedSenderLine,
            () => {}
          );

          callback(response);
        }
      );
  }

  getAntifraudMessageText() {
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
      if (device.objData.isWorkingSms[i] === 1) {
        if (nMessSent >= device.objData.smsSent[i]) {
          nMessSent = device.objData.smsSent[i];
          selectedLine = i;
        }
      }
      i++;
    }

    if (
      device.objData.smsSent[selectedLine] >= device.nMaxDailyMessagePerLine &&
      device.objData.isWorkingSms[selectedLine]
    ) {
      device.objData.isWorkingSms[selectedLine] = false;
      gateway.changed("objData", true);
      device.save();
    }

    return selectedLine;
  }

  getDeviceLineWithLessReceived(iDevice) {
    var device = this.smsGateways[iDevice];
    var selectedLine = 0,
      i = 0;
    var nMessReceived = device.objData.smsReceived[0];
    while (i < device.objData.smsReceived.length) {
      if (device.objData.isWorkingSms[i]) {
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

    //avoid zero division
    if (sentSms === 0) return false;
    // bypass if is not working
    if (device.objData.isWorkingSms[iLine] === 0) return false;

    var percentage = 100 - Math.ceil((100 * receivedSms) / sentSms);
    if (percentage > device.nMaxSentPercetage) return true;
    else return false;
  }

  getSenderForAntifraudBalance(iDevice, iLineDevice) {
    var bDifferentOperator = config.checkOperatorInAntifraudRoutine;
    var receiverDevice = this.smsGateways[iDevice];
    var receiverOperator = receiverDevice.objData.operator[iLineDevice];
    var senderGateway = 0;
    var senderLine = 0;
    var nSmsSent = this.smsGateways[0].nSmsSent;

    for (var iGat = 0; iGat < this.smsGateways.length; iGat++) {
      for (var iLine = 0; iLine < this.smsGateways[iGat].nRadios; iLine++) {
        var iSim = iLine + iGat * this.smsGateways[iGat].nRadios;
        var sim = this.sims[iSim];
        var gat = this.smsGateways[iGat];
        var senderOperator = gat.objData.operator[iLine];
        var senderIsWorking =
          gat.isWorkingSms === 1 || gat.isWorkingSms === true;
        if (bDifferentOperator) {
          if (receiverOperator != senderOperator && senderIsWorking) {
            if (nSmsSent >= gat.objData.smsSent[iLine]) {
              nSmsSent = gat.objData.smsSent[iLine];
              senderGateway = iGat;
              senderLine = iLine;
            }
          }
        } else {
          if (nSmsSent >= gat.objData.smsSent[iLine] && senderIsWorking) {
            nSmsSent = gat.objData.smsSent[iLine];
            senderGateway = iGat;
            senderLine = iLine;
          }
        }
      }
    }

    return { senderGateway: senderGateway, senderLine: senderLine };
  }

  updateCampaignData(campaign,callback) {
    var query=" \
    SELECT a.id, \
    (SELECT COUNT(*) FROM customers WHERE (customers.campaignId=a.id and state='contacted')) as ncompleted, \
    (SELECT COUNT(*) FROM customers WHERE (customers.campaignId=a.id and state='toContact')) as ntocontact,     \
    (SELECT COUNT(*) FROM clicks    WHERE (clicks.campaignId=a.id and clicks.confirm=0)) as oneclick,    \
    (SELECT COUNT(*) FROM clicks    WHERE (clicks.campaignId=a.id and clicks.confirm=1)) as twoclick     \
    FROM (SELECT DISTINCT id FROM messagecampaigns WHERE state='active' AND id='"+campaign.id+"') a;";
    this.database.execute_raw_query(query, res=>{
      if(res) {
        //calcolo orario di fine presunto
        var now = new Date().getTime();
        var deltaNmsg=res[0].ncompleted-campaign.ncompleted;
        var deltaTime=now-this.lastUpdateTimeStats;
        var speed=deltaNmsg/deltaTime;        
        var nMillis = (campaign.ncontacts - campaign.ncompleted)/speed;
        var endTime = new Date(now + nMillis);
        

        campaign.ncompleted=res[0].ncompleted;
        campaign.ntocontact=res[0].ntocontact;
        campaign.nClickOneContacts=res[0].oneclick;
        campaign.nClickTwoContacts=res[0].twoclick;
        if (campaign.ncompleted === campaign.ncontacts)
          campaign.state = "complete";              
        campaign.end = endTime;

        campaign.save().then(camp => {callback("Update campaign done");});
        this.lastUpdateTimeStats=new Date().getTime();
      }
    });
    /* Adjust statiisics query utility 
    UPDATE messagecampaigns SET messagecampaigns.ncontacts=(SELECT COUNT(*) FROM customers WHERE (customers.campaignId=messagecampaigns.id));
    UPDATE messagecampaigns set nCalledContacts=(SELECT COUNT(*) FROM customers WHERE (customers.campaignId=messagecampaigns.id and state='called'));
    UPDATE messagecampaigns set nNoAnswerContacts=(SELECT COUNT(*) FROM customers WHERE (customers.campaignId=messagecampaigns.id and state='noanswer'));
    UPDATE messagecampaigns SET messagecampaigns.nClickTwoContacts=(SELECT COUNT(*) FROM clicks WHERE (clicks.campaignId=messagecampaigns.id and clicks.confirm=1));
    UPDATE messagecampaigns SET messagecampaigns.nClickOneContacts=(SELECT COUNT(*) FROM clicks WHERE (clicks.campaignId=messagecampaigns.id and clicks.confirm=0));
    UPDATE messagecampaigns set ncompleted=(SELECT COUNT(*) FROM customers WHERE (customers.campaignId=messagecampaigns.id and state='contacted'));
    */
  }

  updateCampaignDataOld(campaign, callback) {
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
            var nMillis = (camp.ncontacts - camp.ncompleted) * this.waitTime;
            var now = new Date().getTime();
            var endTime = new Date(now + nMillis);
            camp.end = endTime;
            camp.save();
            callback("Update campaign done");
          });
      });
  }

  getGateways() {
    return this.smsGateways;
  }

  getSims() {
    return this.smsSims;
  }

  sendSms(data, callback) {
    sms_gateway_hardware.sendSMS(
      data.gateway,
      data.line,
      data.message,
      data.phonenumber,
      (res) => {
        callback(res);
      }
    );
  }
}

module.exports = {
  smsServerIstance: {},
  startServer(app, database) {
    this.smsServerIstance = new SmsServer(app, database);

    this.smsServerIstance.interval = setInterval(() => {
      this.smsServerIstance.startCampaignManager();
    }, config.waitTime);
  },
};
