var fs = require("fs");
const config = require("./config.js").load();
const AmiClient = require("asterisk-ami-client");
var contacts = [];
var mapCallData = new Map();
var mapCallAction = new Map();


var filename_numbers_voip=process.cwd()+"/numbers_voip.json";
var voipcallers=require(filename_numbers_voip).numbers_voip;



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
  lastUpdateTimeStats = 0;

  constructor(app, database) {
    this.database = database;
    this.init();
  }

  init() {
    this.gateways = [];
    this.loadGateways((gateways) => {
      this.gateways = gateways;
      this.reloadActiveCampaings();
    });
  }

  reloadActiveCampaings() {
    this.campaigns = [];
    this.loadActiveCampaing((campaign) => {
      console.log("Campaigns load...");
      console.log(campaign.name);

      //controllo campagna in calling
      if (campaign.state === "calling") {
        this.openAmiConnection((clientAmi) => {
          this.campaigns.push(campaign);
          this.clientAmi = clientAmi;
          if (campaign.senderService === 2)
            this.generateCustomerCallsGOIP(campaign, this.clientAmi);
          if (campaign.senderService === 3)
            this.generateCustomerCallsVOIP(campaign, this.clientAmi);
        });
      }
    });
  }

  stopAllCampaigns(callback) {
    if (typeof this.campaigns !== "undefined") {
      for (var iCamp = 0; iCamp < this.intervalCalls.length; iCamp++) {
        if (this.intervalCalls[iCamp]) {
          clearInterval(this.intervalCalls[iCamp]);
          this.intervalCalls[iCamp] = {};
        }        
      }
      callback();
    }
  }

  loadActiveCampaing(callback) {
    // Stop all call cycles
    this.stopAllCampaigns(() => {
      //Charge active campaign
      this.database.entities.messageCampaign
        .findAll({ order: [["id", "DESC"]], where: { state: "calling" } })
        .then((camps) => {
          if (camps) {
            camps.forEach((camp, index, array) => {
              this.campaigns.push(camp);
              //Load remain contact only for active campaigns
              this.database.entities.customer
                .findAll({
                  where: { campaignId: camp.id, state: "toContact" },
                  order: [["ncalls", "ASC"]],
                })
                .then((contacts) => {
                  camp.contacts = contacts;
                  callback(camp);
                });
            });
          }
        });
    });
  }

  openAmiConnection(callback) {
    this.client = new AmiClient();
    var campaigns = this.campaigns;
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

            // Manage call from customer phone number
            if (uniqueobj.phone) {
              var phoneNumber = uniqueobj.phone;
              var indexplus = phoneNumber.indexOf("+");
              if (indexplus != -1) phoneNumber = phoneNumber.substring(3);
              this.findActiveCustomerFromPhoneNumber(phoneNumber, (result) => {
                this.insertClick(
                  result.idCampaign,
                  result.idCustomer,
                  event.Digit
                );
              });
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
              var idCampaign = uniqueobj.idCampaign;
              var idContact = uniqueobj.idContact;
              var iContact = uniqueobj.iContact;
              var iGateway = uniqueobj.iGateway;
              var phoneNumber = uniqueobj.phone;
              var type = uniqueobj.type;


              ///Manage ansewer from GOIP
              if (
                typeof type !== "undefined" &&
                typeof idCampaign !== "undefined" &&
                typeof idContact !== "undefined" &&
                typeof iContact !== "undefined" &&
                typeof iGateway !== "undefined" &&
                type==="GOIP"
              ) {
                var gateway = this.gateways[iGateway];
                var iLine = uniqueobj.iLine;
                if (
                  gateway.isWorkingCall &&
                  (!uniqueobj.computed ||
                    typeof uniqueobj.computed === "undefined")
                ) {
                  var billsec = parseInt(event.Billsec);
                  var currentBillSecLine = parseInt(
                    gateway.objData.callsSent[iLine]
                  );
                  
                  var totalBillSecLine = billsec + currentBillSecLine;                  
                  //Update general gateway counter
                  gateway.nCallsSent = parseInt(gateway.nCallsSent) + billsec;
                  gateway.objData.callsSent[iLine] = totalBillSecLine;
                  gateway.changed("nCallsSent", true);
                  gateway.changed("objData", true);
                  //Update gateway line data
                  gateway.save().then((gat) => {
                    console.log("Gateway data updated " + gat.name);
                  });
                  
                  this.addBillSecCampaign(
                    idCampaign,
                    billsec,
                    (id) => {
                      console.log("Update total billsecs "+billsec+" campaign: "+ id);
                    }
                  );
                  this.addBillSecContacts(
                    idContact,
                    billsec,
                    (id) => {
                      console.log("Update total billsecs "+billsec+" contact: "+ id);
                    }
                  );
                  //avoid multiple computation
                  uniqueobj.computed = true;
                  mapCallData.set(event.UniqueID, JSON.stringify(uniqueobj));
                }
              }
              ///Manage ansewer from GOIP

              ///Manage ansewer from VOIP
              if (
                typeof type !== "undefined" &&
                typeof idCampaign !== "undefined" &&
                typeof idContact !== "undefined" &&
                type==="VOIP"
              ) {
                var billsec = parseInt(event.Billsec);
                
                this.addBillSecCampaign(
                  idCampaign,
                  billsec,
                  (id) => {
                    console.log("Update total billsecs "+billsec+" campaign: "+ id);
                  }
                );
                this.addBillSecContacts(
                  idContact,
                  billsec,
                  (id) => {
                    console.log("Update total billsecs "+billsec+" contact: "+ id);
                  }
                );
                //avoid multiple computation
                uniqueobj.computed = true;
                mapCallData.set(event.UniqueID, JSON.stringify(uniqueobj));
              }
              ///Manage ansewer from VOIP
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
                idCampaign: actionData.idCampaign,
                idContact: actionData.idContact,
                iContact: actionData.iContact,
                iGateway: actionData.iGateway,
                iLine: actionData.iLine,
                phone: actionData.phone,
                type: actionData.type,
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
            event.Context === config.pbxProperties.context &&
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
    }, config.pbxProperties.waitCallAntifraudIntervalGOIP);
  }

  generateCustomerCallsVOIP(campaign, clientAmi) {
    var contacts = campaign.contacts;
    var iContacts = 0;
    var interval = {};
    var iVoipNumber=0;

    //Check validity
    if (!contacts) return;
    if (!campaign.senderService) return;
    var senderService = config.senderServices[campaign.senderService];
    if (!senderService) return;
    var nchannels = senderService.nchannels;
    if (!nchannels) return;

    interval = setInterval(() => {
      if (campaign.state === "complete") clearInterval(interval);
      if (campaign.state === "disabled") clearInterval(interval);
            
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

      //Check time for customer calls
      if (
        nowMillis > callOutBeginHourMillis &&
        nowMillis < callOutEndHourMillis
      ) {
        // Voip channel iterations, place nchannels call every cycle
        for (var iChannelVoip = 0; iChannelVoip < nchannels; iChannelVoip++) {          
          
          if(iVoipNumber>=voipcallers.length) {iVoipNumber=0};
          var caller=voipcallers[iVoipNumber];
          iVoipNumber++;

          //check if contacts counter is in limit
          if (iContacts < contacts.length) {
            var contact = contacts[iContacts];
            var ncalls = parseInt(contact.ncalls);
            var treshold = parseInt(config.pbxProperties.maxRetryCustomer);

            //// Check max call per campaigns and make a call
            if (contact.state === "toContact" && ncalls <= treshold) {              
              this.dialCallAmiVOIP(campaign, contact, caller, clientAmi, (callData) => {});
              ncalls++;
              contact.ncalls = ncalls;
            }

            /// mark no answer
            if (ncalls >= config.pbxProperties.maxRetryCustomer) {
              contact.state = "noanswer";
              contact.ncalls = ncalls;
            }

            /// update contact
            contact.save().then((cont) => {
              console.log(
                "Contact " +
                  cont.mobilephone +
                  " -- ncalls: " +
                  ncalls +
                  " -- state: " +
                  cont.state
              );
            });
            iContacts++;
          }         
        }
      } // check call time
      if (iContacts >= contacts.length) iContacts = 0;

      this.updateCampaignStatistcs(campaign, (res) => console.log(res));
    }, config.pbxProperties.waitCallCustomerIntervalVOIP);

    this.intervalCalls.push(interval);
  }

  generateCustomerCallsGOIP(campaign, clientAmi) {
    var iCampaign = 0;    
    var contacts = campaign.contacts;
    var iGateway = 0;
    var iContacts = 0;
    var gateways = this.gateways;
    var interval = {};

    //Check validity
    if (!contacts[iContacts]) return;
    if (!gateways[iGateway]) return;

    //Clear map call data
    mapCallData.clear();
    interval = setInterval(() => {
      if (campaign.state === "complete") clearInterval(interval);
      if (campaign.state === "disabled") clearInterval(interval);

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
            var timeCallLine = parseInt(gateway.objData.callsSent[iLine]);
            var maxCallLineTime = parseInt(gateway.nMaxDailyCallPerLine) * 60;
            //Check working line and time counter
            if (
              timeCallLine < maxCallLineTime &&
              (gateway.objData.isWorkingCall[iLine] === 1 ||
                gateway.objData.isWorkingCall[iLine] === true)
            ) {
              //check if contacts counter is in limit
              if (iContacts < contacts.length) {
                var contact = contacts[iContacts];
                var ncalls = parseInt(contact.ncalls);
                var treshold = parseInt(config.pbxProperties.maxRetryCustomer);

                //// Check max call per campaigns and make a call
                if (contact.state === "toContact" && ncalls <= treshold) {
                  var phone = contact.mobilephone;
                  this.dialCallAmiGOIP(
                    campaign,
                    iContacts,
                    iGateway,
                    iLine,
                    phone,
                    clientAmi,
                    (callData) => {}
                  );
                  ncalls++;
                  contact.ncalls = ncalls;
                }

                /// mark no answer
                if (ncalls >= config.pbxProperties.maxRetryCustomer) {
                  contact.state = "noanswer";
                  contact.ncalls = ncalls;
                }

                /// update contact
                contact.save().then((cont) => {
                  console.log(
                    "Contact " +
                      cont.mobilephone +
                      " -- ncalls: " +
                      ncalls +
                      " -- state: " +
                      cont.state
                  );
                });
              } //check if contacts conunter is in limit
              iContacts++;
            } //check working line
          } // check working gateway
        } // check call time
      }
      iGateway++;
      if (iGateway === gateways.length) iGateway = 0;
      if (iContacts >= contacts.length) iContacts = 0;

      this.updateCampaignStatistcs(campaign, (res) => console.log(res));
    }, config.pbxProperties.waitCallCustomerIntervalGOIP);

    this.intervalCalls.push(interval);
  }

  checkIfCampaignFinished(contacts) {
    const existsCustomersNotContacted = (element) =>
      element.state === "toContact";
    var index = contacts.findIndex(existsCustomersNotContacted);
    if (index === -1) return true;
    else return false;
  }

  dialCallAmiVOIP(campaign, contact, caller, clientAmi, callback) {
    if (!campaign) return;
    if (!contact) return;
    if(!caller) return;
    var phoneNumber = contact.mobilephone;
    var callerid=caller.caller+" <"+caller.caller+">";
    var actionId =
      phoneNumber +
      "-" +
      campaign.id +
      "-" +
      contact.id +
      "-" +
      new Date().getTime();
    var channel = "SIP/VOIP/" + phoneNumber;
    console.log("Call customer: " + phoneNumber + " by VOIP channel ");
    if (
      config.production &&
      config.pbxProperties &&
      config.pbxProperties.context
    ) {
      var data = {
        type: "VOIP",
        idCampaign: campaign.id,
        idContact: contact.id,
        phone: phoneNumber,
      };
      mapCallAction.set(actionId, JSON.stringify(data));
      console.log(
        "Call customer: " +
          phoneNumber +
          " from voip " + callerid +
          " actionID: " +
          actionId
      );
      if(config.pbxProperties.showCallerId===false) callerid=config.pbxProperties.fallbackCallerId;
      clientAmi.action({
        Action: "Originate",
        ActionId: actionId,
        Variable: "ACTIONID=" + actionId,
        Channel: channel,
        Context: config.pbxProperties.context, //bmacall or ivr-1
        Exten: "s",
        Priority: 1,
        Timeout: 30000,
        CallerID: callerid,
        Async: true,
        EarlyMedia: false,
        Application: "",
        Codecs: "ulaw",
      });
      callback({ state: "dial" });
    } else callback({ state: "disabled" });
  }

  dialCallAmiGOIP(
    campaign,
    iContact,
    iGateway,
    iLine,
    phoneNumber,
    clientAmi,
    callback
  ) {
    if (!campaign) return;
    var contact = campaign.contacts[iContact];
    if (!contact) return;
    var gateway = this.gateways[iGateway];
    if (!gateway) return;

    var gatewayName = gateway.name;
    var actionId =
      phoneNumber + "-" + iGateway + "-" + iLine + "-" + new Date().getTime();
    var outLine = ("000" + (iLine + 1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" + outLine + phoneNumber;
    if (gateway.isWorkingCall === true) {
      var data = {
        type: "GOIP",
        idCampaign: campaign.id,
        idContact: contact.id,        
        iContact: iContact,
        iGateway: iGateway,
        iLine: iLine,
        phone: phoneNumber,
      };
      mapCallAction.set(actionId, JSON.stringify(data));
      console.log(
        "Call customer: " +
          phoneNumber +
          " gateway: " +
          iGateway +
          " line: " +
          iLine +
          " actionID:" +
          actionId
      );
      if (
        config.production &&
        config.pbxProperties &&
        config.pbxProperties.context
      ) {
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "ACTIONID=" + actionId,
          Channel: channel,
          Context: config.pbxProperties.context, //bmacall or ivr-1
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: false,
          Application: "",
          Codecs: "ulaw",
        });
      }
      /*
      setTimeout(() => {
        this.antiFraudCallAlgorithm(iGateway, iLine, clientAmi);
      }, 70000);
      */
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



  dialCallAmiGOIPTest(
    iGateway,
    iLine,
    phoneNumber,
    clientAmi,
    callback
  ) {
    var gateway = this.gateways[iGateway];
    if (!gateway) return;

    var gatewayName = gateway.name;
    var actionId =
      phoneNumber + "-" + iGateway + "-" + iLine + "-" + new Date().getTime();
    var outLine = ("000" + (iLine + 1)).slice(-3);
    var channel = "SIP/" + gatewayName + "/" + outLine + phoneNumber;
    if (gateway.isWorkingCall === true) {
      console.log(
        "Call customer: " +
          phoneNumber +
          " gateway: " +
          iGateway +
          " line: " +
          iLine +
          " actionID:" +
          actionId
      );
      if (
        config.pbxProperties &&
        config.pbxProperties.context
      ) {
        clientAmi.action({
          Action: "Originate",
          ActionId: actionId,
          Variable: "ACTIONID=" + actionId,
          Channel: channel,
          Context: config.pbxProperties.context, //bmacall or ivr-1
          Exten: "s",
          Priority: 1,
          Timeout: 30000,
          CallerID: "1001",
          Async: true,
          EarlyMedia: false,
          Application: "",
          Codecs: "ulaw",
        });
      }
      callback({ state: "dial" });
    } else callback({ state: "disabled" });
  }


  dialCallGoipTest(data, callback) {
    this.openAmiConnection((clientAmi) => {
      //Find gateway index
      const hasId = (element) => {
        return element.id === data.gateway.id;
      };
      var iGateway = this.gateways.findIndex(hasId);
      var iLine = data.line;
      var phonenumber = data.phonenumber;
      this.dialCallAmiGOIPTest(iGateway, iLine, phonenumber, clientAmi, (res) => {
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

  findActiveCustomerFromPhoneNumber(phonenumber, callback) {
    var query =
      "select messagecampaigns.id as idCampaign, customers.id as idCustomer from messagecampaigns inner join customers where messagecampaigns.state<>'disabled' and customers.campaignId=messagecampaigns.id and mobilephone='" +
      phonenumber +
      "' LIMIT 1;";
    this.database.execute_raw_query(query, (result) => {
      if (result.length === 1) callback(result[0]);
      else callback({ idCampaign: 0, idCustomer: 0 });
    });
  }

  insertClick(idCampaign, idCustomer, digit) {
    console.log("Click vocal campaign: " + idCampaign);
    console.log("Click vocal customer: " + idCustomer);
    console.log("Click vocal digit: " + digit);
    var confirm = false;
    //Single click
    if (digit === "1") confirm = false;
    if (digit === "2") confirm = true;

    //Single click
    if (!confirm)
      this.database.entities.click
        .findOne({
          where: { campaignId: idCampaign, customerId: idCustomer },
        })
        .then((clickFound) => {
          if (!clickFound)
            this.database.entities.click
              .create({
                campaignId: idCampaign,
                customerId: idCustomer,
                confirm: confirm,
              })
              .then((clickCreated) => {
                console.log(
                  "Single click inserted " + idCampaign + " " + idCustomer
                );
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
          clickFound.save().then((clickSaved) => {
            console.log(
              "Double click inserted " + idCampaign + " " + idCustomer
            );
          });
        });

    //Mark customer as contacted
    this.database.entities.customer
      .findOne({ where: { id: idCustomer } })
      .then((cust) => {
        cust.state = "called";
        cust.save().then((c) => {
          console.log("Saved customer: " + c.id);
        });
      });
  }

  updateCampaignStatistcs(campaign, callback) {
    var query =
      " \
    SELECT a.id, \
    (SELECT COUNT(*) FROM customers WHERE (customers.campaignId=a.id and state='noanswer')) as noanswer, \
    (SELECT COUNT(*) FROM customers WHERE (customers.campaignId=a.id and state='called')) as called,     \
    (SELECT COUNT(*) FROM clicks    WHERE (clicks.campaignId=a.id and clicks.confirm=0)) as oneclick,    \
    (SELECT COUNT(*) FROM clicks    WHERE (clicks.campaignId=a.id and clicks.confirm=1)) as twoclick     \
    FROM (SELECT DISTINCT id FROM messagecampaigns WHERE state='calling' OR  state='complete' AND id='" +
      campaign.id +
      "') a;";
    this.database.execute_raw_query(query, (res) => {
      if (res) {
        //calcolo orario di fine presunto
        var now = new Date().getTime();
        var deltaNmsg = 32 * config.pbxProperties.maxRetryCustomer;
        var deltaTime = now - this.lastUpdateTimeStats;
        var speed = deltaNmsg / deltaTime;
        if (speed < 1e-5) speed = 0.1;
        var nMillis =
          (campaign.ncontacts -
            campaign.nNoAnswerContacts -
            campaign.nCalledContacts) /
          speed;
        var endTime = new Date(now + nMillis);

        campaign.nCalledContacts = res[0].called;
        campaign.nNoAnswerContacts = res[0].noanswer;
        campaign.nClickOneContacts = res[0].oneclick;
        campaign.nClickTwoContacts = res[0].twoclick;
        var totalCalledContactes =
          campaign.nCalledContacts + campaign.nNoAnswerContacts;
        if (totalCalledContactes === campaign.ncontacts)
          campaign.state = "complete";

        campaign.end = endTime;

        campaign.save().then((camp) => {
          if (camp.state === "complete") {
            campaign.contacts = [];
            this.reloadActiveCampaings();
          }
          callback("Statistics updated in campaign: " + camp.id);
        });
        this.lastUpdateTimeStats = new Date().getTime();
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

  addBillSecCampaign(idCampaign, billsec, callback) {
    var sql ="UPDATE messagecampaigns SET nBillSecondsCall=nBillSecondsCall+"+billsec+" WHERE (id='" + idCampaign +"');"      
    this.database.execute_raw_update(sql, callback(idCampaign));
  }
  
  addBillSecContacts(idContact, billsec, callback) {
    var sql ="UPDATE customers SET nBillSecondsCall=nBillSecondsCall+"+billsec+", state='called' WHERE (id='" + idContact +"');"      
    this.database.execute_raw_update(sql, callback(idContact));
  }
}

module.exports = {
  callServerIstance: {},
  startServer(app, database) {
    this.callServerIstance = new CallServer(app, database);
  },
};
