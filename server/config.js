const fs= require('fs');

module.exports = {
    load: function () {
        var filenameConfig = process.cwd() + "/config.json";
        var filenameGateways = process.cwd() + "/gateways.json";
        var filenameAntifraudMessage = process.cwd() + "/antifraudMessages.json";
        var rawdata = "";
        try {
            rawdata = fs.readFileSync(filenameConfig);
            let config = JSON.parse(rawdata);

            rawdata = fs.readFileSync(filenameGateways);
            let gateways= JSON.parse(rawdata);
            config.smsGateways = gateways.smsGateways;

            rawdata = fs.readFileSync(filenameAntifraudMessage);
            let messages= JSON.parse(rawdata);
            config.antifraudMessageTexts = messages.antifraudMessageTexts;


            return config;
        } catch (err) {
            console.log("Working directory is " + process.cwd());
            console.log("Use config: " + filenameConfig);
            console.log("Config file is not present");
            console.log(err);
        }
    }
}





