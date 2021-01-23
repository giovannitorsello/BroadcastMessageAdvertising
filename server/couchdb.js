const config = require("./config.js").load();

const nano = require('nano')(config.couchdb.url);
const db_couch = nano.use(config.couchdb.db);

module.exports = {

  getCustomer: function (key, value) {

  },
  getSingleCustomer: function (key, value) {

  },
  getAllCustomers: function (callback) {
    db_couch.view("app", "clienti").then((body) => {
      body.rows.forEach((doc) => {
        console.log(doc.value);
        callback(doc.value);
      });
    });
  },
  getAllContracts: function (callback) {
    db_couch.view("app", "contratti").then((body) => {
      body.rows.forEach((doc) => {        
        callback(doc.value);
      });
    });
  },
  getAllDevices: function (callback) {
    db_couch.view("app", "dispositivi").then((body) => {
      body.rows.forEach((doc) => {        
        callback(doc.value);
      });
    });
  }
}