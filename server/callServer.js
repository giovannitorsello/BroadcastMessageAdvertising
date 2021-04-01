var fs = require("fs");
const config = require("./config.js").load();
const AmiClient = require("asterisk-ami-client");
var contacts = [];
var mapCallData = new Map();
var mapCallAction = new Map();

class CallServer {
  gateways = [];
  campaigns = [];
  selectedGateway = 0;
  selectedContact = 0;
  sendCallInterval = {};
  interval = {};
  database = {};
  clientAmi = {};
  client = {};

  constructor(app, database) {
    this.database = database;
    this.init();
  }

  init() {
    this.openAmiConnection((clientAmi) => {
      this.clientAmi = clientAmi;
      this.loadGateways((gateways) => {
        this.gateways = gateways;
        this.reloadActiveCampaings();
        //this.antiFraudCallAlgorithm();
      });
      this.loadCampaings((campaigns) => {
        this.campaigns = campaigns;
      });
    });
  }

  openAmiConnection(callback) {
    this.client = new AmiClient();
    this.client
      .on("connect", () => {
        console.log("Connect to Ami");
        callback(this.client);
      })
      .on("event", (event) => {
        if (event.Event === "DTMFBegin") {
          //console.log(event);
        }
        if (
          event.Event === "DTMFEnd" &&
          event.Uniqueid &&
          mapCallData.get(event.Uniqueid)
        ) {
          var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
          var iCampaign = uniqueobj.iCampaign;
          var iContact = uniqueobj.iContact;
          var campaign = this.campaigns[iCampaign];
          var contacts = campaign.contacts;
          var contact = contacts[iContact];

          var idCampaign = campaign.id;
          var idCustomer = contact.id;
          //Single click
          if (uniqueobj && uniqueobj.phone && event.Digit === "1") {
            console.log(uniqueobj.phone + " Press 1 key ");
            this.database.entities.click.create({
              campaignId: idCampaign,
              customerId: idCustomer,
              confirm: false,
            });
          }
          //Double click
          if (uniqueobj && uniqueobj.phone && event.Digit === "2") {
            console.log(uniqueobj.phone + " Press 2 key ");
            this.database.entities.click
              .findOne({
                where: { campaignId: idCampaign, customerId: idCustomer },
              })
              .then((clickFound) => {
                clickFound.confirm = true;
                clickFound.save();
              });
          }
        }

        if (event.Event === "Cdr") {
          if (
            event.Channel === "OutgoingSpoolFailed" &&
            event.Disposition === "FAILED" &&
            event.Duration === "0" &&
            event.Uniqueid &&
            mapCallData.get(event.Uniqueid)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            if (uniqueobj && uniqueobj.phone)
              console.log(uniqueobj.phone + " not reachable (CDR)");
          }

          if (event.Disposition === "BUSY") {
          }

          if (
            event.Disposition === "ANSWERED" &&
            event.UniqueID &&
            mapCallData.get(event.UniqueID)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.UniqueID));
            if (uniqueobj && uniqueobj.phone && !uniqueobj.computed) {
              console.log(
                uniqueobj.phone + " exists by CDR (" + event.Disposition + ")"
              );
              var iCampaign = uniqueobj.iCampaign;
              var iContact = uniqueobj.iContact;
              var campaign = this.campaigns[iCampaign];
              var contacts = campaign.contacts;
              var contact = contacts[iContact];

              var gateway = this.gateways[uniqueobj.iGateway];
              var iLine = uniqueobj.iLine;

              var billsec = parseInt(event.Billsec);
              var currentBillSecLine = parseInt(
                gateway.objData.callsSent[iLine]
              );
              var totalBillSecLine = billsec + currentBillSecLine;
              //Update general gateway counter
              gateway.nCallsSent = parseInt(gateway.nCallsSent) + billsec;
              gateway.objData.callsSent[iLine] = totalBillSecLine;
              gateway.changed("objData", true);
              //Update gateway line data
              gateway.save().then((gat) => {
                this.database.changeStateCalled(contact.id, function (results) {
                  console.log("Update successfull");
                  console.log(results);
                });
              });

              //avoid multiple computation
              uniqueobj.computed = true;
              mapCallData.set(event.UniqueID, JSON.stringify(uniqueobj));
            }
          }
        }

        if (event.Event === "OriginateResponse") {
          if (
            event.Context === "autocallbma" &&
            event.Response === "Failure" &&
            event.Exten === "failed" &&
            event.Uniqueid &&
            mapCallData.get(event.Uniqueid)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            if (uniqueobj && uniqueobj.phone)
              console.log(
                uniqueobj.phone + " doesn't esist (OriginateResponse)"
              );
          }
        }

        // Store association of UniqueID with Callee
        if (
          event.Event === "VarSet" &&
          event.Variable === "ACTIONID" &&
          event.Value &&
          mapCallAction.get(event.Value)
        ) {
          if (event.Channel !== "OutgoingSpoolFailed") {
            var actionId = event.Value;
            var actionData = JSON.parse(mapCallAction.get(actionId));
            mapCallData.set(
              event.Uniqueid,
              JSON.stringify({
                id: event.Uniqueid,
                iCampaign: actionData.iCampaign,
                iContact: actionData.iContact,
                iGateway: actionData.iGateway,
                iLine: actionData.iLine,
                phone: actionData.phone,
                channel: event.Channel,
              })
            );
          }

          if (event.Channel === "OutgoingSpoolFailed") {
            console.log(
              event.Value +
                " does not exists. (OutgoingSpoolFailed - failed extension - probably busy)"
            );
          }
        }

        if (event.Event === "SoftHangupRequest") {
          if (
            event.context === "autocallbma" &&
            event.Exten === "failed" &&
            event.Uniqueid &&
            mapCallData.get(event.Uniqueid)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            if (uniqueobj && uniqueobj.phone)
              console.log(
                uniqueobj.phone +
                  " doesn't esist (SoftHangupRequest - failed extension)"
              );
          }
        }
        if (event.Event === "Newexten") {
          if (
            event.Context === "autocallbma" &&
            event.Application === "Answer" &&
            event.Uniqueid &&
            mapCallData.get(event.Uniqueid)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            if (uniqueobj && uniqueobj.phone)
              console.log(uniqueobj.phone + " exists!!! (Answer dialplan)");
          }
          if (
            event.Channel === "OutgoingSpoolFailed" &&
            event.Uniqueid &&
            mapCallData.get(event.Uniqueid)
          ) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            if (uniqueobj && uniqueobj.phone)
              console.log(
                uniqueobj.phone + " doesn't esist (OutgoingSpoolFailed)"
              );
          }
        }
        if (event.Event === "HangupRequest") {
          if (event.Cause === "16") {
            console.log("Normal clearing");
          }
          if (event.Cause === "17") {
            console.log("Busy");
          }
          if (event.Cause === "18") {
            console.log("No user response");
          }
          if (event.Cause === "21") {
            console.log("Rejected");
          }
        }
      })
      .on("data", (chunk) => {
        //console.log(chunk);
      })
      .on("disconnect", () => {
        console.log("disconnect");
      })
      .on("reconnection", () => {
        console.log("reconnection");
      })
      .on("internalError", (error) => {
        console.log(error);
      })
      .on("response", (response) => {
        /* console.log(response); */
      })
      .on("close", (response) => {
        console.log(response);
      });

    if (!this.client.connection) {
      this.client
        .connect(config.asterisk.login, config.asterisk.password, {
          host: config.asterisk.host,
          port: config.asterisk.port,
        })
        .then((amiConnection) => {
          console.log("Connection enabled.");
        })
        .catch((error) => console.log(error));
    } else {
      callback(this.client);
    }
  }

  getGatewayLineForCall(gateway) {
    //Fine less charged line
    var selectedLine = 0;
    var nCalls = 0;
    for (var iLine = 0; iLine < gateway.objData.lines.length; iLine++) {
      if (nCalls > gateway.objData.callsSent[iLine] || nCalls === 0) {
        nCalls = gateway.objData.callsSent[iLine];
        selectedLine = iLine;
      }
    }
    return selectedLine;
  }

  generateCalls(iCampaign, clientAmi) {
    var contacts = this.campaigns[iCampaign].contacts;
    var iGateway = 0;
    var iContacts = 0;
    var gateways = this.gateways;
    var server = this;
    var interval = {};

    // interval = setInterval(() => {
    if (!contacts[iContacts]) return;
    if (!gateways[iGateway]) return;
    var phone = contacts[iContacts].mobilephone;
    var state = contacts[iContacts].state;
    var gateway = gateways[iGateway];

    if (gateway.isWorkingCall === true && state === "toContact") {
      //correct line problem
      var line = this.getGatewayLineForCall(gateway);
      this.dialCallAmi(
        iCampaign,
        iContacts,
        iGateway,
        line,
        phone,
        clientAmi,
        (callData) => {}
      );
      iContacts++;

      if (iContacts === contacts.length) {
        campaign.setDataValue("state", "finished");
        campaign.save().then((res) => {
          clearInterval(interval);
          server.reloadActiveCampaings();
        });
        iContacts = 0;
      }
    }
    iGateway++;
    if (iGateway === gateways.length) iGateway = 0;
    //}, config.waitTimeCallServer);
  }

  dialCallAmi(
    iCampaign,
    iContact,
    iGateway,
    iLine,
    phoneNumber,
    clientAmi,
    callback
  ) {
    var gateway = this.gateways[iGateway];
    var gatewayName = gateway.name;
    var actionId = phoneNumber + "-" + new Date().getTime();
    var outLine = ("000" + (iLine + 1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" + outLine + phoneNumber;
    if (gateway.isWorkingCall === true) {
      var data = {
        iCampaign: iCampaign,
        iContact: iContact,
        iGateway: iGateway,
        iLine: iLine,
        phone: phoneNumber,
      };
      mapCallAction.set(actionId, JSON.stringify(data));
      if (config.production)
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "ACTIONID=" + actionId,
          Channel: channel,
          Context: "autocallbma",
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: true,
          Application: "",
          Codecs: "alaw",
        });
      this.antiFraudCallAlgorithm(iGateway, iLine, clientAmi);
      callback({ state: "dial" });
    } else callback({ state: "disabled" });
  }

  writeAutoDialAsteriskFile(campaign) {
    //Open autodial file
    var filenameTemp =
      process.cwd() + config.paths.cacheFolder + "/" + campaign.id + ".call";
    var autodialFile =
      config.asterisk.autocall_folder + "/" + campaign.id + ".call";
    var stream = fs.createWriteStream(filenameTemp);
    //Asterisk autodial template
    var stringAutodial =
      "Channel: SIP/%GATEWAY%/%CALLEE%\n" +
      "Callerid: 1000\n" +
      "MaxRetries:" +
      config.asterisk.autocall_max_retries +
      "\n" +
      "RetryTime:" +
      config.asterisk.autocall_retry_time +
      "\n" +
      "WaitTime:" +
      config.asterisk.autocall_wait_time +
      "\n" +
      outbound;
    "Context: autocall\n" + "Extension: s\n" + "Priority: 1\n\n";

    var iGateway = 0;
    var gateways = this.gateways;
    this.database.entities.customer
      .findAll({ where: { campaignId: campaign.id, state: "toContact" } })
      .then((customers) => {
        customers.forEach((cust) => {
          if (iGateway === gateways.length - 1) iGateway = 0;
          var gatewayName = gateways[iGateway].name;
          var callee = cust.mobilephone;
          stringAutodial = stringAutodial.replace("%GATEWAY%", gatewayName);
          stringAutodial = stringAutodial.replace("%CALLEE%", callee);
          stream.write(stringAutodial + "\n");
          iGateway++;
        });
        stream.end();
        //trasnfer file in asterisk autodial folder
        fs.copyFile(filenameTemp, autodialFile, function (err) {
          if (err) {
            console.log("Error in moving file in autocall folder");
          }
          console.log("File placed in asterisk autodial folder");
        });
      });
  }

  startCallServer() {
    this.reloadActiveCampaings();
  }

  loadCampaings(callback) {
    var campaigns = [];
    //Charge active campaign
    this.database.entities.messageCampaign.findAll().then((camps) => {
      if (camps) {
        camps.forEach((camp) => {
          this.database.entities.customer
            .findAll({
              where: { campaignId: camp.id, state: "toContact" },
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

  loadGateways(callback) {
    var gateways = [];
    this.database.entities.gateway
      .findAll({ where: { isWorkingCall: 1 } })
      .then((gateways) => {
        callback(gateways);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  reloadActiveCampaings() {
    this.loadCampaings((campaigns) => {
      this.campaigns = campaigns;
      // Stop all call cycles
      for (var i = 0; i < this.campaigns.length; i++) {
        var camp = this.campaigns;
        if (camp.sendCallIntervall) clearInterval(camp.sendCallIntervall);
      }

      //Charge active campaign and their contacts
      for (var iCamp = 0; iCamp < this.campaigns.length; iCamp++) {
        //controllo campagna in calling
        var campaign = this.campaigns[iCamp];
        if (campaign.state === "calling") {
          this.generateCalls(iCamp, this.clientAmi);
        }
      }
    });
  }

  dialCall(data, callback) {
    this.openAmiConnection((clientAmi) => {
      //Find gateway index
      const hasId = (element) => {
        return element.id === data.gateway.id;
      };
      var iGateway = this.gateways.findIndex(hasId);
      var iLine = data.line;
      var phonenumber = data.phonenumber;
      this.dialCallAmi(0, 0, iGateway, iLine, phonenumber, clientAmi, (res) => {
        callback(res);
      });
    });
  }

  antiFraudCall(caller, iLine, phoneNumber, duration, clientAmi) {
    var stocasticDuration = Math.floor(
      duration + Math.floor(Math.random() * 120)
    );
    var gatewayName = caller.name;
    var actionId = phoneNumber + "-" + new Date().getTime();
    var outLine = ("000" + (iLine + 1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" + outLine + phoneNumber;
    var gatewayName = caller.name;
    if (caller.isWorkingCall === true) {
      if (config.production)
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "STOCDURATION=" + stocasticDuration,
          Channel: channel,
          Context: "autocallAntifraud",
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: true,
          Application: "",
          Codecs: "alaw",
        });
    }
  }

  antiFraudCallAlgorithm(iGateway, iLine, clientAmi) {
    var gateway = this.gateways[iGateway];
    var nCallsReceived = gateway.objData.callsReceived[iLine];
    var nCallsSent = gateway.objData.callsSent[iLine];
    var ratio = 100 * (nCallsSent / nCallsReceived);
    var bAntiFraud = ratio > gateway.nMaxCallPercetage;
    if (bAntiFraud) {
      var phoneNumber = gateway.objData.lines[iLine];
      var duration = Math.ceil(
        ((gateway.nMaxCallPercetage - ratio) * gateway.nCallsSent) / 100
      );
      if (duration < 60) duration = 60;
      var caller = callServer.selectectGatewayCaller(gateway);
      var line = getGatewayLineForCall(caller);
      antiFraudCall(
        caller,
        line,
        phoneNumber,
        durationAntifraudCall,
        clientAmi
      );
    }
  }

  selectectGatewayCaller(gatewayCalle) {
    var selGateway = {};
    var nCall = 0;
    for (var iGat = 0; iGat < this.gateways.length; iGat++) {
      var gateway = this.gateways[iGat];
      //Select a different operator
      if (gatewayCalle.operator !== gateway.operator)
        if (nCall >= gateway.nCallsSent || nCall === 0) {
          selGateway = gateway;
        }
    }
    return selGateway;
  }
}

module.exports = {
  callServerIstance: {},
  startServer(app, database) {
    this.callServerIstance = new CallServer(app, database);
  },
};
