var fs = require("fs");
const config = require("./config.js").load();
const AmiClient = require("asterisk-ami-client");
var contacts = [];
var mapUniqueIdPhone = {};

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
        if (event.Event === "DTMFEnd") {
          var uniqueobj = mapUniqueIdPhone[event.Uniqueid];
          if (uniqueobj && uniqueobj.phone && event.Digit === "1") {
            console.log(uniqueobj.phone + " Press 1 key ");
            this.database.changeStateContactedByCallInterested(
              uniqueobj.phone,
              function (results) {
                console.log("Update successfull");
                console.log(results);
              }
            );
          }
        }
        if (event.Event === "Cdr") {
          if (
            event.Channel === "OutgoingSpoolFailed" &&
            event.Disposition === "FAILED" &&
            event.Duration === "0"
          ) {
            var uniqueobj = mapUniqueIdPhone[event.UniqueID];
            if (uniqueobj && uniqueobj.phone)
              console.log(uniqueobj.phone + " not reachable (CDR)");
          }

          if (
            event.Disposition === "ANSWERED" ||
            event.Disposition === "BUSY"
          ) {
            var uniqueobj = mapUniqueIdPhone[event.UniqueID];
            if (uniqueobj && uniqueobj.phone) {
              console.log(
                uniqueobj.phone + " exists by CDR (" + event.Disposition + ")"
              );

              this.database.changeStateCalled(
                uniqueobj.phone,
                function (results) {
                  console.log("Update successfull");
                  console.log(results);
                }
              );
            }
          }
        }

        if (event.Event === "OriginateResponse") {
          if (event.Context === "autocallbma" && event.Response === "Failure") {
            var uniqueobj = mapUniqueIdPhone[event.Channel];
            if (uniqueobj && uniqueobj.phone)
              console.log(
                uniqueobj.phone + " doesn't esist (OriginateResponse)"
              );
          }
        }

        // Store association of UniqueID with Callee
        if (event.Event === "VarSet" && event.Variable === "CALLEE") {
          if (event.Channel !== "OutgoingSpoolFailed")
            mapUniqueIdPhone[event.Uniqueid] = {
              id: event.Uniqueid,
              phone: event.Value,
              channel: event.Channel,
            };
          if (event.Channel === "OutgoingSpoolFailed") {
            console.log(
              event.Value +
                " does not exists. (OutgoingSpoolFailed - failed extension - probably busy)"
            );
          }
        }

        if (event.Event === "SoftHangupRequest") {
          if (event.context === "autocallbma" && event.Exten === "failed") {
            var uniqueobj = mapUniqueIdPhone[event.Uniqueid];
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
            event.Application === "Answer"
          ) {
            var uniqueobj = mapUniqueIdPhone[event.Uniqueid];
            if (uniqueobj && uniqueobj.phone)
              console.log(uniqueobj.phone + " exists!!! (Answer dialplan)");
          }
          if (event.Channel === "OutgoingSpoolFailed") {
            var uniqueobj = mapUniqueIdPhone[event.Channel];
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

  generateCalls(campaign, clientAmi) {
    var contacts = campaign.contacts;
    var iGateway = 0;
    var iContacts = 0;
    var gateways = this.gateways;
    var server = this;
    var interval = {};

    interval = setInterval(() => {
      if(!contacts[iContacts]) return;
      if(!gateways[iGateway]) return;
      var gatewayName = gateways[iGateway].name;
      var phone = contacts[iContacts].mobilephone;
      var state = contacts[iContacts].state;
      var actionId = phone + "-" + new Date().getTime();
      var channel = "SIP/" + gatewayName + "/" + phone;
      var gateway = gateways[iGateway];
      if (gateway.isWorkingCall === true && state === "toContact") {
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "CALLEE=" + phone,
          Channel: channel,
          Context: "autocallbma",
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: true,
          Application: "",
          Codecs: "g729",
        });
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
    }, config.waitTimeCallServer);
  }

  dialCallAmi(gateway, line, phoneNumber, clientAmi, callback) {
    var gatewayName = gateway.name;
    var actionId = phoneNumber + "-" + new Date().getTime();
    var outLine= ('000'+(line+1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" +outLine+phoneNumber;
    if (gateway.isWorkingCall === true) {
      clientAmi.action({
        Action: "Originate",
        ActionId: actionId,
        Variable: "CALLEE=" + phoneNumber,
        Channel: channel,
        Context: "autocallbma",
        Exten: "s",
        Priority: 1,
        Timeout: 30000,
        CallerID: "1001",
        Async: true,
        EarlyMedia: true,
        Application: "",
        Codecs: "g729",
      });
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
    // Stop all call cycles
    for (var i = 0; i < this.campaigns.length; i++) {
      var camp = this.campaigns;
      if (camp.sendCallIntervall) clearInterval(camp.sendCallIntervall);
    }
    
    //Charge active campaign and their contacts
    this.campaigns.forEach((campaign, index, arrCamp) => {
      //controllo campagna in calling
      if (campaign.state === "calling") {
        this.generateCalls(campaign, this.clientAmi);
      }
    });
  }

  dialCall(data, callback) {
    this.openAmiConnection((clientAmi) => {
      this.dialCallAmi(
        data.gateway,
        data.gatewayLine,
        data.phonenumber,
        clientAmi,
        (res) => {
          callback(res);
        }
      );
    });
  }

  antiFraudCall(caller, phoneNumber, duration, clientAmi) {
    var stocasticDuration = Math.floor(
      duration + Math.floor(Math.random() * 120)
    );

    var gatewayName = caller.name;
    var actionId = phoneNumber + "-" + new Date().getTime();
    var channel = "SIP/" + gatewayName + "/" + phoneNumber;
    if (caller.isWorkingCall === true) {
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
        Codecs: "g729",
      });
    }
  }

  antiFraudCallAlgorithm() {
    var callServer=this;
    callServer.gateways.forEach((gateway, iGat, array) => {      
      setTimeout(() => {        
        if (gateway) {
          var durationAntifraudCall =
            (gateway.nMaxDailyCallPerLine *
              (1 - gateway.nMaxCallPercetage / 100)) /
            gateway.nRadios;
          var caller = callServer.selectectGatewayCaller(gateway);
          for (var iLine = 0; iLine < gateway.nRadios; iLine++) {
            var phoneNumber = gateway.objData.lines[iLine];
            callServer.antiFraudCall(
              caller,
              phoneNumber,
              durationAntifraudCall,
              callServer.clientAmi
            );
          }
        }
      }, (iGat+1) * 30000 /*config.waitTimeCallIntervalAntifraudRoutine*/);
    });
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
    //this.callServerIstance.startCallServer();
  },
};
