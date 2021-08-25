const config = require("./config.js").load();
var randtoken = require("rand-token");
const csvParser = require("csv-parser");
const csvWriter = require("csv-writer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const admZip = require("adm-zip");
const es = require("event-stream");
const fs = require("fs");
var textEncoding = require('text-encoding');  
const uuid = require("uuid");
var moment = require("moment");
const path = require('path');
const child_process = require('child_process');

const couchdb = require("./couchdb.js");
const database = require("./database.js");

const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");

var console = {};
console.log = function () {};

module.exports = {
  import_Contacts_From_Csv(idCampaign, filename, database, callback) {
    console.log("Destroy old contacts and import new");
    var nImported = 0;
    var customers = [];
    //Delete old contacts
    database.entities.customer
      .destroy({ where: { campaignId: idCampaign } })
      .then((results) => {
        const rows = [];
        fs.createReadStream(filename)
          .pipe(csvParser({ separator: config.csvSeparator }))
          .on("data", (data) => {
            var cust = {};
            //Gestione campi vuoti
            if(data.Nome==="NULL") data.Nome="VUOTO";
            if(data.Cognome==="NULL") data.Nome="VUOTO";
            if(data.Telefono==="NULL") data.Telefono="VUOTO";

            cust.id = "";
            cust.uid = this.makeUuid();            
            cust.firstname = data.Nome;
            cust.lastname = data.Cognome;
            cust.email = data.Email;
            cust.mobilephone = data.Telefono;
            cust.address = data.Indirizzo;
            cust.postcode = data.CAP;
            cust.city = data.Citta;
            cust.adm1 = data.Provincia;
            cust.adm2 = data.Regione;
            cust.adm3 = data.Stato;
            cust.campaignId = idCampaign;
            cust.state = "toContact";            
            cust.objData = {};
            console.log("Customer try to insert " + cust.mobilephone);
            if (cust.firstname) {
              customers.push(cust);
            }
          })
          .on("end", () => {
            console.log("Read CSV successfully processed: " + filename);
            var filename_import =
              config.database.secureimportfolder +
              "/import_customers.csv";

            //save data in csv standard file
            const csvWriter = createCsvWriter({
              path: filename_import,
              header: [
                { id: "firstname", title: "firstname" },
                { id: "lastname", title: "lastname" },
                { id: "email", title: "email" },
                { id: "mobilephone", title: "mobilephone" },
                { id: "address", title: "address" },
                { id: "postcode", title: "postcode" },
                { id: "city", title: "city" },
                { id: "adm1", title: "adm1" },
                { id: "adm2", title: "adm2" },
                { id: "adm3", title: "adm3" },
                { id: "campaignId", title: "campaignId" },
                { id: "state", title: "state" },
              ],
            });
            csvWriter.writeRecords(customers).then(() => {
              console.log(
                "Write CSV successfully processed: " + filename_import
              );
              
              var sql =
                "LOAD DATA INFILE '" +
                filename_import +
                "' INTO TABLE bma.customers  FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 ROWS "+
                " (firstname,lastname,email,mobilephone,address,postcode,city,adm1,adm2,adm3,campaignId,state)";
              database.insert_bulk(sql, results => {
                  console.log("CSV successfully imported in database");                  
                  callback(results[1]);
                })
            });            
          });
      });
  },
  import_Sims_From_Csv(idBank,filename, database, callback) {
    console.log("Destroy old sims and import new");
    var nImported = 0;
    var sims = [];
    //Delete old contacts
    database.entities.sim
      .destroy({ where: { bankId: idBank } })
      .then((results) => {
        const rows = [];
        fs.createReadStream(filename)
          .pipe(csvParser({ separator: config.csvSeparator }))
          .on("data", (data) => {
            var sim = {};
            sim.id = "";
            sim.bankId=idBank;
            sim.name = data.name;
            sim.phoneNumber = data.phoneNumber;
            sim.operator = data.operator;
            sim.iccid = data.iccid;
            sim.ean = data.ean;
            sim.pin = data.pin;
            sim.puk = data.puk;
            sim.isWorkingCall = 1;
            sim.isWorkingSms = 1;
            sim.objData = {};
            console.log("Sim try to insert " + sim.phoneNumber);
            if (sim.phoneNumber) {
              sims.push(sim);
            }
          })
          .on("end", () => {
            console.log("Read CSV successfully processed: " + filename);
            var filename_import =
              config.database.secureimportfolder +
              "/import_sim.csv";

            //save data in csv standard file
            const csvWriter = createCsvWriter({
              path: filename_import,
              header: [
                { id: "name", title: "name" },
                { id: "phoneNumber", title: "phoneNumber" },
                { id: "operator", title: "operator" },
                { id: "ean", title: "ean" },
                { id: "iccid", title: "iccid" },
                { id: "pin", title: "pin" },
                { id: "puk", title: "puk" },
                { id: "bankId", title: "bankId" },
                { id: "isWorkingCall", title: "isWorkingCall" },
                { id: "isWorkingSms", title: "isWorkingSms" },                
              ],
            });
            csvWriter.writeRecords(sims).then(() => {
              console.log(
                "Write CSV successfully processed: " + filename_import
              );
              
              var sql =
                "LOAD DATA INFILE '" +
                filename_import +
                "' INTO TABLE bma.sims  FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 ROWS "+
                " (name,phoneNumber,operator,ean,iccid,pin,puk,bankId,isWorkingCall,isWorkingSms)";
              database.insert_bulk(sql, results => {
                  console.log("CSV successfully imported in database");                  
                  callback(results[1]);
                })
            });            
          });
      });
  },
  makeAuthenticationCode() {
    var rnd = randtoken.generate(5, "0123456789");
    var d = new Date(); //now date
    var ticks = d.getTime();
    return ticks.toString() + rnd.toString();
  },
  makePinCode() {
    return randtoken.generate(5, "0123456789");
  },
  makePassword(lenght) {
    return randtoken.generate(lenght);
  },
  makeUuid() {
    var code = uuid.v1();
    return code;
  },
  makeShortUrlCode() {
    return randtoken.generate(
      2,
      "abcdefghijklmnopkrstuvwzABCDEFGHIJKLMNOPQRSTUVWz0123456789"
    );
  },
  createCampaignPackage(pkgData, callback) {
    const fileCampaign =
      process.cwd() + config.paths.cacheFolder + "/campaign.csv";
    const fileContacts =
      process.cwd() + config.paths.cacheFolder + "/contacts.csv";
    const fileClicks = process.cwd() + config.paths.cacheFolder + "/clicks.csv";
    const fileNotIntersted =
      process.cwd() + config.paths.cacheFolder + "/noclicks.csv";

    //create csv files, zip and callback
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    const csvWriterCampaign = createCsvWriter({
      fieldDelimiter: config.csvSeparator,
      path: fileCampaign,
      header: [
        { id: "id", title: "Id" },
        { id: "name", title: "NomeCampagna" },
        { id: "message", title: "Messaggio" },
        { id: "begin", title: "Inizio" },
        { id: "end", title: "Fine" },
        { id: "state", title: "Stato" },
        { id: "ncontacts", title: "NumeroContatti" },
        { id: "ncompleted", title: "NumeroCompletati" },
      ],
    });
    const csvWriterContacts = createCsvWriter({
      fieldDelimiter: config.csvSeparator,
      path: fileContacts,
      header: [
        { id: "id", title: "Id" },
        { id: "state", title: "Contattato?" },
        { id: "ncalls", title: "Chiamate" },
        { id: "firstname", title: "Nome" },
        { id: "lastname", title: "Cognome" },
        { id: "mobilephone", title: "Telefono" },
        { id: "address", title: "Indirizzo" },
        { id: "postcode", title: "Cap" },
        { id: "city", title: "Citta" },
        { id: "adm1", title: "Provincia" },
        { id: "adm2", title: "Regione" },
        { id: "adm3", title: "Stato" },
      ],
    });
    const csvWriterClicks = createCsvWriter({
      fieldDelimiter: config.csvSeparator,
      path: fileClicks,
      header: [
        { id: "id", title: "Id" },
        { id: "confirm", title: "Conferme" },
        { id: "date", title: "Data" },
        { id: "ipAddress", title: "IP" },
        { id: "firstname", title: "Nome" },
        { id: "lastname", title: "Cognome" },
        { id: "mobilephone", title: "Telfono" },
        { id: "address", title: "Indirizzo" },
        { id: "postcode", title: "Cap" },
        { id: "city", title: "Citta" },
        { id: "adm1", title: "Provincia" },
        { id: "adm2", title: "Regione" },
        { id: "adm3", title: "Stato" },        
      ],
    });
    const csvWriterNonInterested = createCsvWriter({
      fieldDelimiter: config.csvSeparator,
      path: fileNotIntersted,
      header: [
        { id: "id", title: "Id" },
        { id: "state", title: "Contattato?" },
        { id: "firstname", title: "Nome" },
        { id: "lastname", title: "Cognome" },
        { id: "mobilephone", title: "Telefono" },
        { id: "address", title: "Indirizzo" },
        { id: "postcode", title: "Cap" },
        { id: "city", title: "Citta" },
        { id: "adm1", title: "Provincia" },
        { id: "adm2", title: "Regione" },
        { id: "adm3", title: "Stato" },
      ],
    });

    //forma clicks
    var clickData = [];
    pkgData.clicks.forEach((click, index, arrClick) => {
      var strConfirm = "1 click";
      if (click.confirm) strConfirm = "2 click";
      var options = {'month': '2-digit', 'day': '2-digit', year: 'numeric'};
      var date = new Date(click.updatedAt).toLocaleString('it-IT', options);
      clickData.push({
        id: click.id,
        confirm: strConfirm,
        date: date,
        ipAddress: click.ipAddress,        
        firstname: click.firstname,
        lastname: click.lastname,
        mobilephone: click.mobilephone,
        address: click.address,
        postcode: click.postcode,
        city: click.city,
        adm1: click.adm1,
        adm2: click.adm2,
        adm3: click.adm3               
      });

      if (index === pkgData.clicks.length - 1)
        csvWriterCampaign.writeRecords([pkgData.campaign]).then(() => {
          csvWriterContacts.writeRecords(pkgData.contacts).then(() => {
            csvWriterNonInterested
              .writeRecords(pkgData.notInterestedContacts)
              .then(() => {
                csvWriterClicks.writeRecords(clickData).then(() => {
                  //zip all files
                  // creating archives
                  var zip = new admZip();

                  // add file directly
                  zip.addLocalFile(fileCampaign);
                  zip.addLocalFile(fileContacts);
                  zip.addLocalFile(fileClicks);
                  zip.addLocalFile(fileNotIntersted);

                  filenameZip =
                    pkgData.campaign.name +
                    "__" +
                    pkgData.campaign.end +
                    ".zip";
                  zip.writeZip(
                    process.cwd() +
                      config.paths.downloadFolder +
                      "/" +
                      filenameZip
                  );
                  callback({ fileArchive: filenameZip });
                });
              });
          });
        });
    });

    if (pkgData.clicks.length === 0) {
      csvWriterCampaign.writeRecords([pkgData.campaign]).then(() => {
        csvWriterContacts.writeRecords(pkgData.contacts).then(() => {
          csvWriterNonInterested
            .writeRecords(pkgData.notInterestedContacts)
            .then(() => {
              //zip all files
              // creating archives
              var zip = new admZip();

              // add file directly
              zip.addLocalFile(fileCampaign);
              zip.addLocalFile(fileContacts);
              zip.addLocalFile(fileNotIntersted);
              filenameZip =
                pkgData.campaign.name + "__" + pkgData.campaign.end + ".zip";
              zip.writeZip(
                process.cwd() + config.paths.downloadFolder + "/" + filenameZip
              );
              callback({ fileArchive: filenameZip });
            });
        });
      });
    }
  },
  runService(scriptFilename, configData) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(scriptFilename, { workerData: configData });
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  },
  convertAudioForAsterisk(fileIn, fileOut, callback) {
    var cmdLine=config.pbxProperties.cmdlineConverter;
    cmdLine=cmdLine.replace('%FileIn%',fileIn);
    cmdLine=cmdLine.replace('%FileOut%',fileOut);
    console.log("Launch coneverter...");
    console.log(cmdLine);
    child_process.exec(cmdLine, (error, stdout, stderr) => {
      if (error) {
        console.log(error.stack);
        console.log('Error code: '+error.code);
        console.log('Signal received: '+error.signal);
        callback({status: 'Error', msg: error.stack});
      }
      else {
        console.log('Child Process STDOUT: '+stdout);
        console.log('Child Process STDERR: '+stderr);
        callback({status: 'OK', msg: stdout});
      }
    });    
  },
};
