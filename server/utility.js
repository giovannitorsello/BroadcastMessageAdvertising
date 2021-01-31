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

module.exports = {
  import_Contacts_From_Csv(idCampaign, filename, database, callback) {
    fs.createReadStream(filename)
      .pipe(csvParser({ separator: config.csvSeparator }))
      .on("data", (row) => {
        var cust = row;
        cust.id = "";
        cust.uid = this.makeUuid();
        cust.firstname = row.NOME;
        cust.lastname = row.COGNOME;
        cust.email = row.EMAIL;
        cust.mobilephone = row.NUMERO;
        (cust.address = row.INDIRIZZO), (cust.postcode = row.CAP);
        cust.city = row.PAESE;
        cust.adm1 = row.PROV;
        cust.adm2 = row.REGIONE;
        cust.adm3 = row.STATO;
        cust.campaignId = idCampaign;

        database.entities.customer
          .findOne({ where: { mobilephone: cust.mobilephone } })
          .then((item) => {
            if (item === null) {
              console.log("Customer try to insert " + cust.mobilephone);
              database.entities.customer.create(cust).then(function (objnew) {
                if (objnew !== null) {
                  console.log(
                    "Customer insert successfully: " + objnew.mobilephone
                  );
                }
              });
            } else {
              console.log(
                "Customer exists: " +
                  item.mobilephone +
                  " --> " +
                  item.firstname +
                  " " +
                  item.lastname
              );
            }
          });
      })
      .on("end", () => {
        callback();
        console.log("CSV file successfully processed." + filename);
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
    const fileCampaign = process.cwd() + config.paths.cacheFolder + "/campaign.csv";
    const fileLinks = process.cwd() + config.paths.cacheFolder + "/links.csv";
    const fileContacts = process.cwd() + config.paths.cacheFolder + "/contacts.csv";
    const fileClicks = process.cwd() + config.paths.cacheFolder + "/clicks.csv";

    //create csv files, zip and callback
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    const csvWriterCampaign = createCsvWriter({
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
    const csvWriterLink = createCsvWriter({
      path: fileLinks,
      header: [
        { id: "campaignId", title: "identificativoCampagna" },
        { id: "urlOriginal", title: "urlOriginale" },
      ],
    });
    const csvWriterContacts = createCsvWriter({
      path: fileContacts,
      header: [
        { id: "id", title: "Id" },
        { id: "state", title: "Contattato?" },
        { id: "firstname", title: "Nome" },
        { id: "lastname", title: "Cognome" },
        { id: "mobilephone", title: "Telefono" },
        { id: "address", title: "Indirizzo" },
        { id: "postcode", title: "Cap" },
        { id: "adm1", title: "Citta" },
        { id: "adm2", title: "Provincia" },
        { id: "adm3", title: "Regione" },
        { id: "country", title: "Stato" },
      ],
    });
    const csvWriterCliks = createCsvWriter({
      path: fileClicks,
      header: [
        { id: "customer.id", title: "Id" },
        { id: "link.urlOriginal", title: "Link" },
        { id: "click.customer.firstname", title: "Nome" },
        { id: "click.customer.lastname", title: "Cognome" },
        { id: "click.customer.mobilephone", title: "Telfono" },
        { id: "click.customer.address", title: "Indirizzo" },
        { id: "click.customer.postcode", title: "Cap" },
        { id: "click.customer.adm1", title: "Citta" },
        { id: "click.customer.adm2", title: "Provincia" },
        { id: "click.customer.adm3", title: "Regione" },
        { id: "click.customer.country", title: "Stato" },
      ],
    });

    csvWriterCampaign.writeRecords([pkgData.campaign]).then(() => {
      csvWriterContacts.writeRecords(pkgData.contacts).then(() => {
        csvWriterLink.writeRecords(pkgData.links).then(() => {
          csvWriterCliks.writeRecords(pkgData.clicks).then(() => {
            //zip all files
            // creating archives
            var zip = new admZip();

            // add file directly
            zip.addLocalFile(fileCampaign);
            zip.addLocalFile(fileContacts);
            zip.addLocalFile(fileLinks);
            zip.addLocalFile(fileClicks);

            filenameZip =
              pkgData.campaign.name + "__" + pkgData.campaign.end + ".zip";
            zip.writeZip(
              process.cwd() + config.paths.downloadFolder + "/" + filenameZip
            );
            callback({ fileArchive: filenameZip });
          });
        });
      });
    });
  },
};
