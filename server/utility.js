const config = require("./config.js").load();
var randtoken = require("rand-token");
const csv = require("csv-parser");
const es = require("event-stream");
const fs = require("fs");
const uuid = require("uuid");
var moment = require("moment");
const couchdb = require("./couchdb.js");
const database = require("./database.js");

module.exports = {

  import_Contacts_From_Csv(filename, callback) {    
    fs.createReadStream(filename)
      .pipe(csv())
      .on("data", (row) => {
        console.log(row);        
        var cust = row;
        cust.id="";
        cust.uid=this.makeUuid();
        database.entities.customer
          .findOne({ where: { mobilephone: cust.mobilephone } })
          .then(function (item) {
            if (item === null) {
                console.log("Customer try to insert "+cust.mobilephone);
              database.entities.customer.create(cust).then(function (objnew) {
                if (objnew !== null) {
                  console.log("Customer insert successfully: " + objnew.mobilephone);                  
                }
              });
            } else {
              console.log("Customer exists: " + item.mobilephone+" --> "+ item.firstname +" "+item.lastname);              
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
};
