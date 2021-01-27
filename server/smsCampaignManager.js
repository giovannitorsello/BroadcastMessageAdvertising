const config = require("./config.js").load();
const { fork } = require('child_process');
const sms_gateway_hardware=require("./smsGateway.js");

var smsGateways=[];
var smsCampaigns=[];
var smsContacts=[];
var selectedGateway=0;
var selectedContact=0;
var waitTime=5000;
var nMaxSmsPerSim=200;
var nTotRadios=8;

module.exports = {
    app: {},
    database: {},
    
    setup(app, db) {
        this.app = app;
        this.database = db;
        this.loadSmsGateways();
        this.loadActiveCampaings();
        waitTime=1000*(86400/(nMaxSmsPerSim*nTotRadios));
        //start campaigns execution
        setInterval(() => {
            this.startCampaignManager();
        }, waitTime);
    },
    startCampaignManager() {
        this.smsCampaigns.forEach(campaign => {
            //Seleziona automaticamente il messaggio successivo e il dispositivo da utilizzare
            this.sendNextMessage(campaign);
        });
    },
    sendNextMessage(campaign) {
        //Select next contact in couch database
        // Gateways selection
        var contact=this.selectCurrentContact(campaign);
        var gateway=this.selectCurrentGateway();
        if(gateway.isWorking) {
            this.sendMessage(campaign, gateway, contact);
        }
    },
    sendMessage(campaign, gateway, contact) {
        var message=campaign.message;
        var ip=gateway.ip;
        var mobilephone=contact.mobilephone;
        console.log("Sending trough "+gateway.name+ " to "+contact.mobilephone);
        sms_gateway_hardware.sendSMS(
            gateway.ip, gateway.port, gateway.password, 
            campaign.message, contact.mobilephone,
            function(response){
                console.log(response);
            })

    },
    selectCurrentContact(campaign) {
        //1) Connect to couch db
        //2) Retrieve next contact in campaign
        //3) return contact
        return {id: "100", mobilephone: "393939241987", firstname: "giovanni", lastname: "torsello", address: "Via Pasubio n.33", city: "Soleto"}
    },
    selectCurrentGateway() {
        //Find the first active gateway
        while (!(smsGateways[selectedGateway].isWorking)) {
            selectedGateway++;
            if(selectedGateway===smsGateways.length) selectedGateway=0;
        }
        var found_active_gateway=smsGateways[selectedGateway];
        
        //increment index to prepare next gateway for nex message
        selectedGateway++;
        if(selectedGateway===smsGateways.length) selectedGateway=0;

        return found_active_gateway;
    },
    startCampaign(campaignData,callback) {
        return callback();
    },
    stopCampaign(campaignData,callback) {
        return callback();
    },
    getCampaignInfo(campaignData,callback) {
        return callback();
    },
    loadSmsGateways() {
        smsGateways=config.smsGateways; 
        //Calculate total number of radios
        for( var i=0; i<smsGateways.length;i++) {
            nTotRadios=smsGateways[i].nRadios;
        }
    },
    loadActiveCampaings() {
        //Caricare dal database solo le campagne attive
        this.smsCampaigns=[
            {id: "1", "name": "prov1", uuid: "1111", message: "Ciao 1", begin: "", end: ""}            
        ];
    }
}
