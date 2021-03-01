const config = require("./config.js").load();
var database = require("./database.js");

const AmiClient = require('asterisk-ami-client');
let client = new AmiClient();
 

//Quando il numero non esiste manda prima Hangup->ringing e poi Originate->Response Failure
//Quando il numero esiste ma è disconnesso manda prima Originate->Response Failure e poi Hangup->ringing. 
client.connect('bma', 'bma2021!', {host: '5.83.124.98', port: 5038})
 .then(amiConnection => {
 
     client
         .on('connect', () => console.log('connect'))
         .on('event', event => {
           if(event.Event==="DialState") {
            if(event.DialStatus==="RINGING") {
              console.log("DialState ringing");
            }
           }
           else if(event.Event==="DeviceStateChange") {
            if(event.State==="NOT_INUSE") {
              //console.log("Number not in use");
            }
           }
           else if (event.Event==="Hangup") {
             if(event.ChannelStateDesc==="Ringing") {
              console.log("Hangup - Ringing");
             }
           }
           else if (event.Event==="OriginateResponse") {
            if(event.Response==="Failure") {
              console.log("Originate Response - Failure");
            }
            if(event.Response==="Success") {
              console.log("Number exist!!!");
            }
           }
           else if (event.Event==="Cdr") {
            console.log("CDR: "+event.Disposition)
            if(event.Disposition==="ANSWERED") {
              console.log("Number exist!!!");
            }
           }
           else if(event.Event==="ExtensionStatus") {
             console.log(event);
           }
           else if(event.Event==="Link") {
            console.log(event);
           }
           else {
            console.log(event);
           }          
          })
         .on('data', chunk => {/*console.log(chunk)*/})
         .on('response', response => {
           console.log(response);
          })
         .on('disconnect', () => console.log('disconnect'))
         .on('reconnection', () => console.log('reconnection'))
         .on('internalError', error => console.log(error))
         .action({
          Action: 'Originate',
          Channel:'SIP/TIMENET/3939241987', //3807904377', //3807912095',  //3939241987 //3815556665 
          Context:'from-internal',
          Timeout: 20000,
          CallerID: '1001',
          Exten:'s',
          Priority:1,
          Async: true,
          Application: "Answer(500)",
          Codecs: 'g729'
        }, function(err, res) {
        console.log(err);
        console.log(res);
        });
         /*.action({
             Action: 'Ping'
         });*/
 

         
    // setTimeout(() => {
    //     client.disconnect();
    // }, 5000);
 
 })
 .catch(error => console.log(error));

 

/*
var ari = require("ari-client");
var client = require('ari-client');
var util = require("util");
var chanArr = [];
//"freepbxuser", "b8c140755d9c28992b3740559d6dab34"
ari.connect("http://5.83.124.98:8888/ari", "freepbxuser", "b8c140755d9c28992b3740559d6dab34", clientLoaded);
client.connect("http://5.83.124.98:8888/ari", "freepbxuser", "b8c140755d9c28992b3740559d6dab34", function (err, ari) {

  ari.channels.originate({
    endpoint: "PJSIP/2000",
    extension: "93939241987"
  })
  .then(function (channel) {
    console.log(channel);
    ari.channels.dial(
      {channelId: channel.id},
      function (err) {
        console.log(err);
      }
    );
  })
  .catch(function (err) {
    console.log(err);
  });
  

});




// handler for client being loaded
function clientLoaded (err, client) {
  if (err) {
    throw err;
  }
 
  // find or create a holding bridge
  var bridge = null;
  client.bridges.list(function(err, bridges) {
    if (err) {
      throw err;
    }
 
    bridge = bridges.filter(function(candidate) {
      return candidate.bridge_type === 'holding';
    })[0];
 
    if (bridge) {
      console.log(util.format('Using bridge %s', bridge.id));
    } else {
      client.bridges.create({type: 'holding'}, function(err, newBridge) {
        if (err) {
          throw err;
        }
 
        bridge = newBridge;
        console.log(util.format('Created bridge %s', bridge.id));
      });
    }
  });
 
  // handler for StasisStart event
  function stasisStart(event, channel) {
    var dialed = event.args[0] === 'dialed';
    if (!dialed) {
      channel.answer(function(err) {
        if (err) {
          throw err;
        }

        console.log('Channel %s has entered our application', channel.name);

        var playback = client.Playback();
        channel.play({media: 'sound:pls-wait-connect-call'},
          playback, function(err, playback) {
            if (err) {
              throw err;
            }
        });

        originate(channel);
      });
    }

    function originate(channel) {
      var dialed = client.Channel();
  
      channel.on('StasisEnd', function(event, channel) {
        hangupDialed(channel, dialed);
      });
  
      dialed.on('ChannelDestroyed', function(event, dialed) {
        hangupOriginal(channel, dialed);
      });
  
      dialed.on('StasisStart', function(event, dialed) {
        joinMixingBridge(channel, dialed);
      });
  
      dialed.originate(
        {endpoint: "PJSIP/1002", extension: "93939241987", app: 'bridge-dial', appArgs: 'dialed'},
        function(err, dialed) {
          if (err) {
            throw err;
          }
      });
    }


    console.log(util.format(
        'Channel %s just entered our application, adding it to bridge %s',
        channel.name,
        bridge.id));
 
    channel.answer(function(err) {
      if (err) {
        throw err;
      }
 
      bridge.addChannel({channel: channel.id}, function(err) {
        if (err) {
          throw err;
        }
 
        bridge.startMoh(function(err) {
          if (err) {
            throw err;
          }
        });
      });
    });
  }
 
  // handler for StasisEnd event
  function stasisEnd(event, channel) {
    console.log(util.format(
        'Channel %s just left our application', channel.name));
  }
 

  // handler for original channel hanging up so we can gracefully hangup the
  // other end
  function hangupDialed(channel, dialed) {
    console.log(
      'Channel %s left our application, hanging up dialed channel %s',
      channel.name, dialed.name);

    // hangup the other endsecret
    dialed.hangup(function(err) {
      // ignore error since dialed channel could have hung up, causing the
      // original channel to exit Stasis
    });
  }

  // handler for the dialed channel hanging up so we can gracefully hangup the
  // other end
  function hangupOriginal(channel, dialed) {
    console.log('Dialed channel %s has been hung up, hanging up channel %s',
      dialed.name, channel.name);

    // hangup the other end
    channel.hangup(function(err) {
      // ignore error since original channel could have hung up, causing the
      // dialed channel to exit Stasis
    });
  }

  // handler for dialed channel entering Stasis
  function joinMixingBridge(channel, dialed) {
    var bridge = client.Bridge();

    dialed.on('StasisEnd', function(event, dialed) {
      dialedExit(dialed, bridge);
    });

    dialed.answer(function(err) {
      if (err) {
        throw err;
      }
    });

    bridge.create({type: 'mixing'}, function(err, bridge) {
      if (err) {
        throw err;
      }

      console.log('Created bridge %s', bridge.id);

      addChannelsToBridge(channel, dialed, bridge);
    });
  }

  // handler for the dialed channel leaving Stasis
  function dialedExit(dialed, bridge) {
    console.log(
        'Dialed channel %s has left our application, destroying bridge %s',
        dialed.name, bridge.id);

    bridge.destroy(function(err) {
      if (err) {
        throw err;
      }
    });
  }

  // handler for new mixing bridge ready for cclient.action({
  'action':'originate',
  'channel':'PJSIP/2000/93939241987',
  'context':'from-internal',
  'CallerID': '1000',
  'exten':'s',
  'priority':1,
  'async': true,
  'Codecs': 'g729'
}, function(err, res) {
console.log(err);
console.log(res);hannels to be added to it
  function addChannelsToBridge(channel, dialed, bridge) {
    console.log('Adding channel %s and dialed channel %s to bridge %s',
        channel.name, dialed.name, bridge.id);

    bridge.addChannel({channel: [channel.id, dialed.id]}, function(err) {
      if (err) {
        throw err;
      }
    });
  }


  client.on('StasisStart', stasisStart);
  client.on('StasisEnd', stasisEnd);
 
  client.start('bridge-hold');
}
/*
// handler for client being loaded
function clientLoaded (err, client) {
  if (err) {
    throw err;
  }

  // handler for StasisStart event
  function stasisStart(event, channel) {
    // ensure the channel is not a dialed channel
    var dialed = event.args[0] === 'dialed';

    if (!dialed) {
      channel.answer(function(err) {
        if (err) {
          throw err;
        }

        console.log('Channel %s has entered our application', channel.name);

        var playback = client.Playback();
        channel.play({media: 'sound:pls-wait-connect-call'},
          playback, function(err, playback) {
            if (err) {
              throw err;
            }
        });

        originate(channel);
      });
    }
  }

  function originate(channel) {
    var dialed = client.Channel();

    channel.on('StasisEnd', function(event, channel) {
      hangupDialed(channel, dialed);
    });

    dialed.on('ChannelDestroyed', function(event, dialed) {
      hangupOriginal(channel, dialed);
    });

    dialed.on('StasisStart', function(event, dialed) {
      joinMixingBridge(channel, dialed);
    });

    dialed.originate(
      {endpoint: "Local/1001@from-internal", app: 'bridge-dial', appArgs: 'dialed'},
      function(err, dialed) {
        if (err) {
          throw err;
        }
    });
  }

  // handler for original channel hanging up so we can gracefully hangup the
  // other end
  function hangupDialed(channel, dialed) {
    console.log(
      'Channel %s left our application, hanging up dialed channel %s',
      channel.name, dialed.name);

    // hangup the other end
    dialed.hangup(function(err) {
      // ignore error since dialed channel could have hung up, causing the
      // original channel to exit Stasis
    });
  }

  // handler for the dialed channel hanging up so we can gracefully hangup the
  // other end
  function hangupOriginal(channel, dialed) {
    console.log('Dialed channel %s has been hung up, hanging up channel %s',
      dialed.name, channel.name);

    // hangup the other end
    channel.hangup(function(err) {
      // ignore error since original channel could have hung up, causing the
      // dialed channel to exit Stasis
    });
  }

  // handler for dialed channel entering Stasis
  function joinMixingBridge(channel, dialed) {
    var bridge = client.Bridge();

    dialed.on('StasisEnd', function(event, dialed) {
      dialedExit(dialed, bridge);
    });

    dialed.answer(function(err) {
      if (err) {
        throw err;
      }
    });

    bridge.create({type: 'mixing'}, function(err, bridge) {
      if (err) {
        throw err;
      }

      console.log('Created bridge %s', bridge.id);

      addChannelsToBridge(channel, dialed, bridge);
    });
  }

  // handler for the dialed channel leaving Stasis
  function dialedExit(dialed, bridge) {
    console.log(
        'Dialed channel %s has left our application, destroying bridge %s',
        dialed.name, bridge.id);

    bridge.destroy(function(err) {
      if (err) {
        throw err;
      }
    });
  }

  // handler for new mixing bridge ready for channels to be added to it
  function addChannelsToBridge(channel, dialed, bridge) {
    console.log('Adding channel %s and dialed channel %s to bridge %s',
        channel.name, dialed.name, bridge.id);

    bridge.addChannel({channel: [channel.id, dialed.id]}, function(err) {
      if (err) {
        throw err;
      }
    });
  }

  client.on('StasisStart', stasisStart);
  client.start('bridge-dial');
}

*/
  //http://freepbxuser:b8c140755d9c28992b3740559d6dab34@5.83.124.98:8888/ari/channels?endpoint=93939241987&extension=1001&context=from-internal&priority=1&callerId=1001


  //http://{ARIUser}:{ARIPass}@localhost:8088/ari/channels?endpoint=SIP/{exten to call from}&extension={number/exten to call}&context=from-internal&priority=1&callerId={callerID}


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
    }true
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
