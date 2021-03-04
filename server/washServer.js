var fs = require("fs");
const config = require("./config.js").load();
var database = require("./database.js");

const AmiClient = require("asterisk-ami-client");
var contacts = [];
var mapUniqueIdPhone = {};

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const utility = require("./utility.js");

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

  executeCalls(contacts) {
    this.client = new AmiClient();
    this.client
      .connect("bma", "bma2021!", { host: "5.83.124.98", port: 5038 })
      .then((amiConnection) => {
        this.client
          .on("connect", () => console.log("connect"))
          .on("event", (event) => {
            if (event.Event === "Cdr") {
              if (event.Disposition === "ANSWERED") {
                var uniqueobj = mapUniqueIdPhone[event.UniqueID];
                console.log(uniqueobj.phone + " exists!!! (CDR)");
                this.client.action({Action: "Hangup", Channel: event.Uniqueid});
              }
            }
            if (event.Event === "OriginateResponse") {
              if (
                event.Context === "autocallbma" &&
                event.Response === "Failure"
              ) {
                var uniqueobj = mapUniqueIdPhone[event.Channel];
                if (uniqueobj && uniqueobj.phone)
                  console.log(
                    uniqueobj.phone + " doesn't esist (OriginateResponse)"
                  );
              }
            }

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
                    " does not exists. (OutgoingSpoolFailed - failed extension)"
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
                console.log(uniqueobj.phone + " exists!!! (Answer dialplan)");
                this.client.action({ Action: "Hangup", Channel: event.Uniqueid });
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
            } else if (event.Event === "Hangup") {
              if (event.ChannelStateDesc === "Ringing") {
                console.log("Hangup - Ringing");
              }
            } else {
              //console.log(event);
            }
          })
          .on("data", (chunk) => {
            /*console.log(chunk)*/
          })
          .on("disconnect", () => console.log("disconnect"))
          .on("reconnection", () => console.log("reconnection"))
          .on("internalError", (error) => console.log(error))
          .on("response", (response) => {
            console.log(response);
          })
          .on("close", (response) => {
            console.log(response);
          });

        var iGateway = 0,
          iContacts = 0;
        var gateways = this.gateways;
        setInterval(() => {
          if (iGateway === gateways.length - 1) iGateway = 0;
          if (iContacts === contacts.length - 1) iContacts = 0;
          var gatewayName = gateways[iGateway].name;
          var phone = contacts[iContacts].mobilephone;
          var phone = "3939241987";
          var actionId = phone + "-" + new Date().getTime();
          var channel = "SIP/GOIP32_1/" + phone;

          this.client.action({
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
          
          iGateway++;
          iContacts++;
        }, 5000);
      })
      .catch((error) => console.log(error));
  }

  generateCalls(campaign) {
    database.entities.customer
      .findAll({ where: { campaignId: campaign.id, state: "toContact" } })
      .then((customers) => {
        this.contacts = customers;
        this.executeCalls(customers);
      });
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
    database.entities.customer
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

  startWashServer() {
    this.reloadActiveCampaings();
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

  loadGateways(callback) {
    var gateways = [];
    database.entities.gateway
      .findAll()
      .then((results) => {
        callback(results);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  reloadActiveCampaings(callback) {
    //Charge active campaign and their
    this.loadCampaings((campaigns) => {
      this.campaigns = campaigns;
      this.campaigns.forEach((campaign, index, arrCamp) => {
        //controllo campagna attiva
        if (campaign.state === "active") {
          this.generateCalls(campaign);
          //writeAutoDialAsteriskFile(campaign);
        }
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

      setTimeout(() => this.startWashServer(), 3000);
    }
  }
}

const washServerIstance = new WashServer();
module.exports = washServerIstance;
washServerIstance.startServer();
