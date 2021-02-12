const config = require("./config.js").load();
var randtoken = require("rand-token");
const csvParser = require("csv-parser");
const csvWriter = require("csv-writer");
const admZip = require("adm-zip");
const es = require("event-stream");
const fs = require("fs");
const uuid = require("uuid");
var moment = require("moment");
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
    //Delete old contacts
    database.entities.customer
      .destroy({ where: { campaignId: idCampaign } })
      .then((results) => {
        const rows = [];
        fs.createReadStream(filename)
          .pipe(csvParser({ separator: config.csvSeparator }))
          .on("data", (data) => {
            rows.push(data);
          })
          .on("end", () => {
            console.log("CSV file successfully processed: " + filename);
            rows.forEach((row, index, arrRows) => {
              var cust = {};
              cust.id = "";
              cust.uid = this.makeUuid();
              cust.firstname = row.Nome;
              cust.lastname = row.Cognome;
              cust.email = row.Email;
              cust.mobilephone = row.Telefono;
              cust.address = row.Indirizzo;
              cust.postcode = row.CAP;
              cust.city = row.Citta;
              cust.adm1 = row.Provincia;
              cust.adm2 = row.Regione;
              cust.adm3 = row.Stato;
              cust.campaignId = idCampaign;
              console.log("Customer try to insert " + cust.mobilephone);
              if(cust.firstname)
              database.entities.customer.create(cust).then((objnew) => {
                if (objnew !== null) {
                  nImported++;
                }
                if (index === arrRows.length - 1) {
                  callback(nImported);
                }
              });
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
      clickData.push({
        id: click.customer.id,
        confirm: strConfirm,
        firstname: click.customer.firstname,
        lastname: click.customer.lastname,
        mobilephone: click.customer.mobilephone,
        address: click.customer.address,
        postcode: click.customer.postcode,
        city: click.customer.city,
        adm1: click.customer.adm1,
        adm2: click.customer.adm2,
        adm3: click.customer.adm3,
        country: click.customer.country,
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
};
