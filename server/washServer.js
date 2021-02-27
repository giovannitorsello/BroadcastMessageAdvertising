const config = require("./config.js").load();
var database = require("./database.js");

var ari = require("ari-client");
var util = require("util");
var chanArr = [];

ari.connect("http://5.83.124.98:8888", "freepbxuser", "b8c140755d9c28992b3740559d6dab34", clientLoaded);

function clientLoaded(err, client) {
  if (err) {
    throw err;
  }

  // find or create a holding bridge
  var bridge = null;
  client.bridges.list(function (err, bridges) {
    if (err) {
      throw err;
    }

    bridge = bridges.filter(function (candidate) {
      return candidate.bridge_type === "mixing";
    })[0];

    if (bridge) {
      console.log(util.format("Using bridge %s", bridge.id));
    } else {
      client.bridges.create({ type: "mixing" }, function (err, newBridge) {
        if (err) {
          throw err;
        }

        bridge = newBridge;
        console.log(util.format("Created bridge %s", bridge.id));
      });
    }
  });

  // handler for StasisStart event
  function stasisStart(event, channel) {
    console.log(
      util.format(
        "Channel %s just entered our application, adding it to bridge %s",
        channel.name,
        bridge.id
      )
    );

    channel.answer(function (err) {
      if (err) {
        throw err;
      }

      bridge.addChannel({ channel: channel.id }, function (err) {
        chanArr.push(channel);

        if (err) {
          throw err;
        }

        //If else statement to start music for first user entering channel, music will stop once more than 1 enters the channel.
        if (chanArr.length <= 1) {
          bridge.startMoh(function (err) {
            if (err) {
              throw err;
            }
          });
        } else {
          bridge.stopMoh(function (err) {
            if (err) {
              throw err;
            }
          });
        }
      });
    });
  }

  // handler for StasisEnd event
  function stasisEnd(event, channel) {
    chanArr = null;
    console.log(
      util.format("Channel %s just left our application", channel.name)
    );
  }

  client.on("StasisStart", stasisStart);
  client.on("StasisEnd", stasisEnd);

  client.start("bridge-hold");

  //http://freepbxuser:b8c140755d9c28992b3740559d6dab34@5.83.124.98:8888/ari/channels?endpoint=SIP/1001&extension=93939241987&context=from-internal&priority=1&callerId=1001


  //http://{ARIUser}:{ARIPass}@localhost:8088/ari/channels?endpoint=SIP/{exten to call from}&extension={number/exten to call}&context=from-internal&priority=1&callerId={callerID}
}

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

class WashServer {
  gateways = [];
  campaigns = [];
  contacts = [];
  selectedGateway = 0;
  selectedContact = 0;

  constructor() {
    database.setup(() => {
      this.init();
    });
  }

  init() {
    this.loadGateways((gateways) => {
      this.gateways = gateways;
      this.loadCampaings((campaigns) => {
        this.campaigns = campaigns;
      });
    });
  }

  startWashServer() {
    this.campaigns.forEach((campaign, index, arrCamp) => {
      //controllo campagna attiva
      if (campaign.state === "active") {
        //Seleziona automaticamente il messaggio successivo e il dispositivo da utilizzare
        this.callNextContact(campaign, (response) => console.log(response));
      }
    });
  }

  callNextContact(campaign, callback) {
    //Select next contact in couch database
    // Gateways selection
    var dateCampaign = Date.parse(campaign.begin);
    var now = new Date().getTime();
    //Controllo su data ed ora di inizio
    if (now > dateCampaign && campaign.state === "active") {
      var contact = this.selectCurrentContact(campaign);
      var selecteGateway = this.selectCurrentGateway();
      this.callContact(campaign, selecteGateway, contact, (response) => {
        callback(response);
      });
    }
  }

  callContact(campaign, iDevice, contact, callback) {
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
      var selectedSenderLine = this.getDeviceLineWithLessCall(iDevice);

      if (senderDevice.objData.isWorking[selectedSenderLine]) {
        //Call routine
      }
    }
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
    var nCallsSent = this.smsGateways[selGat].nCallsSent;

    //select line with less sent sms
    while (i < this.smsGateways.length) {
      if (
        nCallsSent >= this.smsGateways[i].nCallsSent &&
        this.smsGateways[i].isWorking
      ) {
        nCallsSent = this.smsGateways[i].nCallsSent;
        selGat = i;
      }
      i++;
    }
    return selGat;
  }

  loadGateways(callback) {
    var gateways = [];
    database.entities.gateway
      .findAll()
      .then((results) => {
        if (results.length > 0) {
          gateways = results;
          for (var i = 0; i < gateways.length; i++) {
            if (gateways[i].isWorking) this.nTotRadios += gateways[i].nRadios;
            callback(gateways);
          }
        } else {
          gateways = config.smsGateways;
          gateways.forEach((gat, index, array) => {
            gat.id = "";
            database.entities.gateway
              .create(gat)
              .then((savedgateway) => {
                if (index === array.length - 1) this.loadSmsGateways(callback);
              })
              .catch((error) => {
                console.log(error);
              });
          });
        }
      })
      .catch((error) => {
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

  getDeviceLineWithLessCalls(iDevice) {
    var device = this.smsGateways[iDevice];
    var selectedLine = 0,
      i = 0;
    var nCallsSent = device.objData.callsSent[0];
    while (i < device.objData.callsSent.length) {
      if (device.objData.isWorkingCall[i] === 1) {
        if (nCallsSent >= device.objData.callsSent[i]) {
          nCallsSent = device.objData.callsSent[i];
          selectedLine = i;
        }
      }
      i++;
    }

    if (
      device.objData.callsSent[selectedLine] >= device.nMaxDailyCallsPerLine &&
      device.objData.isWorkingCall[selectedLine]
    ) {
      device.objData.isWorkingCall[selectedLine] = false;
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
      if (device.objData.isWorkingCall[i]) {
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
    var sentCall = device.objData.callSent[iLine];
    var receivedCall = device.objData.callReceived[iLine];

    //avoid zero division
    if (sentCall === 0) return false;
    // bypass if is not working
    if (device.objData.isWorkingCall[iLine] === 0) return false;

    var percentage = 100 - Math.ceil((100 * receivedCall) / sentCall);
    if (percentage > device.nMaxCallPercetage) return true;
    else return false;
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
            callback("Update campaign done");
          });
      });
  }

  startServer() {
    if (!isMainThread) {
      parentPort.on("message", (message) => {
        if (message == "/campaigns/getAll")
          parentPort.postMessage(this.campaigns);
        else if (message == "/campaigns/reload") {
          this.reloadActiveCampaings();
          parentPort.postMessage(this.campaigns);
        } else if (message == "/gateways/getAll")
          parentPort.postMessage(JSON.parse(JSON.stringify(this.gateways)));
        else if (message == "/gateways/resetCounters") {
          this.resetCounters();
          parentPort.postMessage(JSON.parse(JSON.stringify(this.gateways)));
        } else if (message == "/process/exit") {
          parentPort.postMessage("sold!");
          parentPort.close();
        }
      });

      setInterval(() => {
        this.startWashServer();
      }, config.waitTimeWash);
    }
  }
}

const washServerIstance = new WashServer();
module.exports = washServerIstance;
washServerIstance.startServer();
