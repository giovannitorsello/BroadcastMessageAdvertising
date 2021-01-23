const config = require("./config.js").load();
const ping = require('ping');
const { fork } = require('child_process');
var snmp = require("net-snmp");

var hostsBackbone = [];
var hostsCustomer = [];

function updateStatistics(dev, res, nPings, maxLoops) {
    if (!dev.statistics) dev.statistics = {};
    if (!dev.statistics.ping) dev.statistics.ping = {};
    dev.statistics.ping = res;

    if (res.times.length > 0) {
        if (dev.statistics.countCycle >= maxLoops) {
            dev.statistics.lossPackets = 0;
            dev.statistics.countCycle = 0;
        }
        else {
            dev.statistics.lossPackets += (nPings - res.times.length);
            dev.statistics.countCycle++;
        }
    }
}

module.exports = {
    app: {},
    database: {},
    nPings: 10,
    waitPing: 1,
    maxLoops: 10,
    cfgPing: {
        timeout: 1,  
        extra: ['-c', 10, '-i', 1]
    },
    getSnmpDeviceInfo(ip, oids, callback) {
        if(oids===undefined || oids===null || oids.length===0) {console.log("Error oids not defined"); return;}
        var snmpSession = snmp.createSession(ip, "public");        
        snmpSession.get(oids, function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                callback(varbinds)                
            }
            snmpSession.close();
        });

        snmpSession.trap(snmp.TrapType.LinkDown, function (error) {
            if (error)
                console.error(error);
        });

    },
    getMonitoredDevicesFromDb() {
        var oidsArray=this.getOidsArray();

    },
    monitor() {
        var nPings = this.nPings
        var maxLoops = this.maxLoops;

        hostsBackbone.forEach((host) => {
            ping.promise.probe(host.ipv4, this.cfgPing)
                .then(function (res) {
                    updateStatistics(host, res, nPings, maxLoops);
                });
        });

        hostsCustomer.forEach((host) => {
            var nPings = this.nPings
            ping.promise.probe(host.ipv4, this.cfgPing)
                .then(function (res) {
                    updateStatistics(host, res, nPings, maxLoops);                    
                });
        });


        ///SNMP////
        /*
        hostsBackbone.forEach((host) => {
            this.getSnmpDeviceInfo(host.ipv4, host.oids, function(snmpResults) {
                host.snmpParameters=snmpResults;                             
            });
        });

        hostsCustomer.forEach((host) => {
            this.getSnmpDeviceInfo(host.ipv4, host.oids, function(snmpResults) {   
                host.snmpParameters=snmpResults;                          
            });
        });*/
    },
    startServer(app, db) {
        this.app = app;
        this.database = db;
        this.getMonitoredDevicesFromDb();
        var waitTime = this.nPings * this.waitPing*1000;
        setInterval(() => {
            this.monitor();
        }, waitTime);

    },
    sendMonitoredBackbone(callback) {
        return callback(hostsBackbone);
    },
    sendMonitoredCustomer(callback) {
        return callback(hostsCustomer);
    },
    removeMonitoredCustomer(dev) {
        hostsCustomer.forEach((element, index, array) => {
            if (dev.id === element.id)
                delete hostsCustomer[index];
        });
    },
    removeMonitoredBackbone(dev) {
        hostsBackbone.forEach((element, index, array) => {
            if (dev.id === element.id)
                delete hostsBackbone[index];
        });
    },
    insertMonitoredCustomer(dev) {
        if (dev && (dev.ipv4 || dev.ipv6)) {
            var devMon = {
                id: dev.id,
                ipv4: dev.ipv4,
                ipv6: dev.ipv6,
                mac: dev.mac,
                note: dev.note,
                description: dev.description,
                statistics: {
                    lossPackets: 0,
                    countCycle: 0,
                    ping: {}
                }
            }
            hostsCustomer.push(devMon);
        }
    },
    insertMonitoredBackbone(dev) {
        if (dev && (dev.ipv4 || dev.ipv6)) {
            var devMon = {
                id: dev.id,
                ipv4: dev.ipv4,
                ipv6: dev.ipv6,
                mac: dev.mac,
                note: dev.note,
                description: dev.description,
                statistics: {
                    lossPackets: 0,
                    countCycle: 0,
                    ping: {}
                }
            }
            hostsBackbone.push(devMon);
        }
    },
    getOidsArray() {
        var oids_objs = {
            txRate: "1.3.6.1.4.1.14988.1.1.1.1.1.2.1",
            rxRate: "1.3.6.1.4.1.14988.1.1.1.1.1.3.1",
            strength: "1.3.6.1.4.1.14988.1.1.1.1.1.4.1",
            ssid: "1.3.6.1.4.1.14988.1.1.1.1.1.5.1",
            frequency: "1.3.6.1.4.1.14988.1.1.1.1.1.7.1",
            band: "1.3.6.1.4.1.14988.1.1.1.1.1.8.1"
          };
      
          var oidsArray = [];
          for (var key in oids_objs) {
            oidsArray.push(oids_objs[key]);
          }
          return oidsArray;
    }
}
