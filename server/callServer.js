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
  intervalCalls = [];
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
        //Start antifraud routine
        this.generateAntifraudCalls();
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
        //////// DTMF Section /////////////
        if (event.Event === "DTMFBegin") {
          //console.log(event);
        }

        if (event.Event === "DTMFEnd") {
          console.log("press: ", event.Digit);
          var idCampaign = -1;
          var idCustomer = -1;
          if (event.Uniqueid && mapCallData.get(event.Uniqueid)) {
            var uniqueobj = JSON.parse(mapCallData.get(event.Uniqueid));
            var iCampaign = uniqueobj.iCampaign;
            var iContact = uniqueobj.iContact;

            // Manage call from customer
            if ((!iCampaign || !iContact) && uniqueobj.phone) {
              var phoneNumber = uniqueobj.phone;
              var indexplus = phoneNumber.indexOf("+");
              if (indexplus != -1) phoneNumber = phoneNumber.substring(3);
              this.database.entities.customer
                .findOne({ where: { mobilephone: phoneNumber } })
                .then((cust) => {
                  this.insertClick(cust, event.Digit);
                });
            }
            // Manage answer from campaign
            else if (iCampaign && iContact) {
              var campaign = this.campaigns[iCampaign];
              var contacts = campaign.contacts;
              var contact = contacts[iContact];
              idCampaign = campaign.id;
              idCustomer = contact.id;
              this.insertClick(idCampaign, idCustomer, event.Digit);
            }
          }
        }
        //////// DTMF Section /////////////

        //////// NEW CHANNEL /////////////
        //INCOMING CALL
        if (event.Event === "Newchannel" && event.CallerIDNum != "<unknown>") {
          var uniqueobj = {};
          uniqueobj.phone = event.CallerIDNum;
          mapCallData.set(event.Uniqueid, JSON.stringify(uniqueobj));
        }

        //////// CDR Section /////////////
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

          //////////// MANAGE ANSEWERED CALL //////////
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
              var iGateway = uniqueobj.iGateway;
              var phoneNumber = uniqueobj.phone;
              ///Manage generated call
              if (
                iCampaign !== null &&
                iContact !== null &&
                iGateway !== null
              ) {
                var campaign = this.campaigns[iCampaign];
                if (campaign && campaign.contacts) {
                  var contacts = campaign.contacts;
                  var contact = contacts[iContact];
                  var gateway = this.gateways[iGateway];
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
                    /*this.database.changeStateCalled(
                      contact.id,
                      function (results) {
                        console.log("Update successfull");
                        console.log(results);
                      }
                    );*/
                  });

                  //avoid multiple computation
                  uniqueobj.computed = true;
                  mapCallData.set(event.UniqueID, JSON.stringify(uniqueobj));
                } else if (phoneNumber) {
                  console.log("Customer " + phoneNumber + " has answered");
                  //Update state
                }
              }
            }
          }
        }
        //////// CDR Section /////////////

        //////// VARSET Section ///////////
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
        //////// VARSET Section ///////////

        /////////////// ORIGINATE SECTION ////////////////
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
    if (gateway.objData && gateway.objData.lines)
      for (var iLine = 0; iLine < gateway.objData.lines.length; iLine++) {
        if (
          gateway.objData.isWorkingCall[iLine] === 1 ||
          gateway.objData.isWorkingCall[iLine] === true
        )
          if (nCalls > gateway.objData.callsSent[iLine] || iLine === 0) {
            nCalls = gateway.objData.callsSent[iLine];
            selectedLine = iLine;
          }
      }
    return selectedLine;
  }

  generateAntifraudCalls() {
    var iGateway = 0;
    var gateways = this.gateways;

    var interval = setInterval(() => {
      var callOutBeginHour = config.pbxProperties.callOutBeginHour;
      var callOutEndHour = config.pbxProperties.callOutEndHour;
      var now = new Date();
      var nowMillis = now.getTime();
      var callOutBeginHourMillis = now.setHours(
        callOutBeginHour[0],
        callOutBeginHour[1],
        callOutBeginHour[2]
      );
      var callOutEndHourMillis = now.setHours(
        callOutEndHour[0],
        callOutEndHour[1],
        callOutEndHour[2]
      );

      if (
        nowMillis < callOutBeginHourMillis ||
        nowMillis > callOutEndHourMillis
      ) {
        var gateway = gateways[iGateway];
        for (var iLine = 0; iLine < gateway.objData.lines.length; iLine++) {
          this.antiFraudCallAlgorithm(iGateway, iLine, this.clientAmi);
        }
      }
      iGateway++;
      if (iGateway === gateways.length) iGateway = 0;
    }, config.pbxProperties.waitCallAntifraudInterval);
  }

  generateCustomerCalls(iCampaign, clientAmi) {
    var campaign = this.campaigns[iCampaign];
    var contacts = this.campaigns[iCampaign].contacts;
    var iGateway = 0;
    var iContacts = 0;
    var gateways = this.gateways;
    var server = this;
    var interval = {};

    //Check validity
    if (!contacts[iContacts]) return;
    if (!gateways[iGateway]) return;

    interval = setInterval(() => {
      var callOutBeginHour = config.pbxProperties.callOutBeginHour;
      var callOutEndHour = config.pbxProperties.callOutEndHour;
      var now = new Date();
      var nowMillis = now.getTime();
      var callOutBeginHourMillis = now.setHours(
        callOutBeginHour[0],
        callOutBeginHour[1],
        callOutBeginHour[2]
      );
      var callOutEndHourMillis = now.setHours(
        callOutEndHour[0],
        callOutEndHour[1],
        callOutEndHour[2]
      );

      var gateway = gateways[iGateway];
      for (var iLine = 0; iLine < gateway.objData.lines.length; iLine++) {
        //Customers Call
        //Check time for customer calls
        if (
          nowMillis > callOutBeginHourMillis &&
          nowMillis < callOutEndHourMillis
        ) {
          //Check working gateway
          if (gateway.isWorkingCall === true) {
            //Check working line
            if (
              gateway.objData.isWorkingCall[iLine] === 1 ||
              gateway.objData.isWorkingCall[iLine] === true
            ) {
              if (iContacts < contacts.length) {
                var phone = contacts[iContacts].mobilephone;
                var state = contacts[iContacts].state;
                var intState = parseInt(state);
                //Retries
                if (state && Number.isNaN(intState) && state === "toContact") {
                  contacts[iContacts].state = 1;
                } else if (state && !Number.isNaN(intState) && intState >= 1) {
                  contacts[iContacts].state = intState + 1;
                }

                if (
                  state &&
                  !Number.isNaN(contacts[iContacts].state) &&
                  contacts[iContacts].state >
                    config.pbxProperties.maxRetryCustomer
                ) {
                  contacts[iContacts].state = "contacted";
                  contacts[iContacts].save().then((cont) => {
                    console.log("Contact " + cont.mobilephone + " updated");
                  });
                }

                if (contacts[iContacts].state !== "contacted")
                  this.dialCallAmi(
                    iCampaign,
                    iContacts,
                    iGateway,
                    iLine,
                    phone,
                    clientAmi,
                    (callData) => {}
                  );

                iContacts++;
                if (this.checkIfCampaignFinished(contacts)) {
                  campaign.setDataValue("state", "complete");
                  campaign.save().then((res) => {
                    server.reloadActiveCampaings();
                    iContacts = 0;
                  });
                }

                if (iContacts === contacts.length) iContacts = 0;
              }
            }
          }
        }
      }
      iGateway++;
      if (iGateway === gateways.length) iGateway = 0;
    }, config.pbxProperties.waitCallCustomerInterval);

    this.intervalCalls.push(interval);
  }

  checkIfCampaignFinished(contacts) {
    const existsCustomersNotContacted = (element) =>
      element.state !== "contacted";
    var index = contacts.findIndex(existsCustomersNotContacted);
    if (index === -1) return true;
    else return false;
  }

  generateCalls2(iCampaign, clientAmi) {
    var campaign = this.campaigns[iCampaign];
    var contacts = this.campaigns[iCampaign].contacts;
    var iGateway = 0;
    var iContacts = 0;
    var gateways = this.gateways;
    var server = this;
    var interval = {};

    interval = setInterval(() => {
      if (!contacts[iContacts]) return;
      if (!gateways[iGateway]) return;
      var gateway = gateways[iGateway];

      if (gateway.isWorkingCall === true) {
        for (var iLine = 0; iLine < gateway.objData.lines.length; iLine++) {
          if (
            gateway.objData.isWorkingCall[iLine] === 1 ||
            gateway.objData.isWorkingCall[iLine] === true
          ) {
            var phone = contacts[iContacts].mobilephone;
            var state = contacts[iContacts].state;
            //correct line problem
            //var line = this.getGatewayLineForCall(gateway);
            //Correct state problem
            this.dialCallAmi(
              iCampaign,
              iContacts,
              iGateway,
              iLine,
              phone,
              clientAmi,
              (callData) => {}
            );

            iContacts++;
            if (iContacts === contacts.length) {
              campaign.setDataValue("state", "finished");
              campaign.save().then((res) => {
                server.reloadActiveCampaings();
              });
              iContacts = 0;
            }
          }
        }
      }
      iGateway++;
      if (iGateway === gateways.length) iGateway = 0;
    }, config.waitTimeCallServer);

    this.intervalCalls.push(interval);
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
          Context: "ivr-1", //autocallbma
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: true,
          Application: "",
          Codecs: "ulaw",
        });

      setTimeout(() => {
        this.antiFraudCallAlgorithm(iGateway, iLine, clientAmi);
      }, 70000);

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
        if (this.intervalCalls[i]) clearInterval(this.intervalCalls[i]);
      }

      //Charge active campaign and their contacts
      for (var iCamp = 0; iCamp < this.campaigns.length; iCamp++) {
        //controllo campagna in calling
        var campaign = this.campaigns[iCamp];
        if (campaign.state === "calling") {
          this.generateCustomerCalls(iCamp, this.clientAmi);
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
    var stocasticDuration = duration + Math.floor(Math.random() * 3 + 1) * 25;
    var gatewayName = caller.name;
    var actionId = phoneNumber + "-" + new Date().getTime();
    var outLine = ("000" + (iLine + 1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" + outLine + phoneNumber;
    var gatewayName = caller.name;

    if (caller && caller.objData && caller.isWorkingCall === true) {
      if (config.production) {
        var callerPhone = caller.objData.lines[iLine];
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "STOCDURATION=" + stocasticDuration,
          Channel: channel,
          Context: "autocallAntifraud",
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: callerPhone,
          Async: true,
          EarlyMedia: true,
          Application: "",
          Codecs: "ulaw",
        });
      }

      caller.objData.callsSent[iLine] += stocasticDuration;
      caller.changed("objData", true);
      caller.save();
      return stocasticDuration;
    }
  }

  antiFraudCallAlgorithm(iGateway, iLine, clientAmi) {
    var gateway = this.gateways[iGateway];
    var nCallsReceived = gateway.objData.callsReceived[iLine];
    var nCallsSent = gateway.objData.callsSent[iLine];
    if (nCallsReceived == 0) nCallsReceived = 1;
    var ratio = 100 * (nCallsSent / (nCallsReceived + nCallsSent));
    var bAntiFraud = ratio > gateway.nMaxCallPercetage;
    if (bAntiFraud) {
      var phoneNumber = gateway.objData.lines[iLine];
      var duration = 120;
      var caller = this.selectectGatewayCaller(gateway);
      var line = this.getGatewayLineForCall(caller);
      var realDuration = this.antiFraudCall(
        caller,
        line,
        phoneNumber,
        duration,
        clientAmi
      );

      gateway.objData.callsReceived[iLine] += realDuration;
      gateway.changed("objData", true);
      gateway.save();
    }
  }

  checkAntiFraud(clienAmi) {
    for (var iGat = 0; iGat < this.gateways.length; iGat++) {
      for (
        var iLine = 0;
        iLine < this.gateways[iGat].objData.lines.length;
        iLine++
      ) {
        this.antiFraudCallAlgorithm(iGat, iLine, clienAmi);
      }
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

  insertClick(cust, digit) {
    var confirm = false;
    var idCampaign = cust.campaignId;
    var idCustomer = cust.id;
    console.log("Click vocal campaign: "+idCampaign);
    console.log("Click vocal customer: "+idCustomer);
    console.log("Click vocal digit: "+digit);
    
    //Single click
    if (digit === "1") confirm = false;
    if (digit === "2") confirm = true;

    if (!confirm)
      this.database.entities.click
        .findOne({
          where: { campaignId: idCampaign, customerId: idCustomer },
        })
        .then((clickFound) => {
          if (!clickFound)
            this.database.entities.click.create({
              campaignId: idCampaign,
              customerId: idCustomer,
              confirm: confirm,
            });
        });

    //Double click
    if (confirm)
      this.database.entities.click
        .findOne({
          where: { campaignId: idCampaign, customerId: idCustomer },
        })
        .then((clickFound) => {
          clickFound.confirm = true;
          clickFound.save();
        });

    cust.state = "contacted";
    cust.save().then((c) => {
      console.log("Saved customer: " + c.id);
    });
  }
}

module.exports = {
  callServerIstance: {},
  startServer(app, database) {
    this.callServerIstance = new CallServer(app, database);
  },
};
