const config = require("./config.js").load();
const mailer = require("./mailer.js");
const utility = require("./utility.js");
const formidable = require("formidable");
const { Op } = require("sequelize");
const { fork } = require("child_process");
const fs = require("fs");
const https = require("https");
const http = require("https");
const { Sequelize, Model, DataTypes } = require("sequelize");
const path = require("path");
const axios = require("axios");

//Geo library
const pingServer = require("./pingServer.js");

module.exports = {
  load_routes(app, database) {
    pingServer.startServer(app, database);

    /////////////////////GENERAL UTILITIES //////////////////////
    app.post("/adminarea/find_obj_by_field", function (req, res) {
      const searchObj = req.body.searchObj;
      const type = searchObj.type;
      const fields = searchObj.fields;
      const value = "%" + searchObj.value + "%";
      const whereObj = { where: {} };

      var orArray = [];
      fields.forEach(function (element, index, array) {
        orArray.push({ [element]: { [Op.like]: value } });
      });
      const orObj = { [Op.or]: orArray };
      whereObj["where"] = orObj;

      database.entities[type].findAll(whereObj).then(function (results) {
        if (results !== null)
          res.send({
            status: "OK",
            msg: "Fulltext search success",
            results: results,
          });
        else
          res.send({
            status: "error",
            msg: "Fulltext search fail",
            results: {},
          });
      });
    });

    app.post("/adminarea/fulltextsearch", function (req, res) {
      var str_search = req.body.textToSearch;
      var sql =
        "SELECT * FROM customers WHERE (" +
        " (customers.firstname LIKE value)  OR" +
        " (customers.lastname LIKE value) OR" +
        " (customers.codfis LIKE value) OR" +
        " (customers.vatcode LIKE value) OR" +
        " (customers.email LIKE value) OR" +
        " (customers.pec LIKE value) OR" +
        " (customers.phone LIKE value) OR" +
        " (customers.mobilephone LIKE value) OR" +
        " (customers.company LIKE value) OR" +
        " (customers.city LIKE value));";

      sql = sql.replace(/value/g, "'%" + str_search + "%'");
      database.execute_raw_query(sql, function (items) {
        if (items !== null)
          res.send({
            status: "OK",
            msg: "Fulltext search success",
            results: items,
          });
        else
          res.send({
            status: "error",
            msg: "Fulltext search fail",
            results: {},
          });
      });
    });

    app.post("/adminarea/get_uuid", function (req, res) {
      var uuid_str = utility.makeUuid();
      res.send({
        status: "OK",
        msg: "UUID generated",
        results: { uuid: uuid_str },
      });
    });

    /////////////////////GENERAL//////////////////////////
    app.post("/adminarea/get_session", function (req, res) {
      if (req.session) res.send({ session: req.session, status: "OK" });
      else res.send({ session: {}, status: "error" });
    });

    ///////////////////// Customer ///////////////////////////
    app.post("/adminarea/customer/getall", function (req, res) {
      database.entities.customer.findAll().then(function (results) {
        if (results)
          res.send({ status: "OK", msg: "Customers found", customers: results });
        else res.send({ status: "OK", msg: "Customers not found", customers: {} });
      });
    });

    app.post("/adminarea/customer/getCaps", function (req, res) {
      database.execute_raw_query("SELECT postcode, city from customers GROUP BY postcode, city;", function (results){
        if (results)
          res.send({ status: "OK", msg: "Caps found", caps: results });
        else res.send({ status: "OK", msg: "Caps not found", caps: {} });
      });
    });

    app.post("/adminarea/customer/getStates", function (req, res) {
      database.execute_raw_query("SELECT state from customers GROUP BY state;", function (results){
        if (results)
          res.send({ status: "OK", msg: "States found", states: results });
        else res.send({ status: "OK", msg: "States not found", states: {} });
      });
    });

    app.post("/adminarea/customer/selectByCap", function (req, res) {
      var cap=req.body.selectedCap;
      database.entities.customer.findAll({where: {postcode: cap}}).then(function (results) {
        if (results)
          res.send({ status: "OK", msg: "Customers found", customers: results });
        else res.send({ status: "OK", msg: "Customers not found", customers: {} });
      });
    });

    app.post("/adminarea/customer/selectByState", function (req, res) {
      var st=req.body.selectedState;
      database.entities.customer.findAll({where: {state: st}}).then(function (results) {
        if (results)
          res.send({ status: "OK", msg: "Customers found", customers: results });
        else res.send({ status: "OK", msg: "Customers not found", customers: {} });
      });
    });

    ///////////////////// User ///////////////////////////////
    app.post("/adminarea/user/get_by_id", function (req, res) {
      var userId = req.body.idUser;
      if (userId)
        database.entities.user
          .findOne({ where: { id: userId } })
          .then(function (user) {
            if (user) {
              res.send({ status: "OK", msg: "Users found", user: results });
            } else res.send({ status: "OK", msg: "Users not found", user: {} });
          });
    });

    app.post("/adminarea/user/getall", function (req, res) {
      database.entities.user.findAll().then(function (results) {
        if (results)
          res.send({ status: "OK", msg: "Users found", users: results });
        else res.send({ status: "OK", msg: "Users not found", users: {} });
      });
    });

    app.post("/adminarea/user/insert", function (req, res) {
      var user = req.body.user;
      user.status = "active";
      database.entities.user
        .findOne({ where: { email: user.email } })
        .then(function (usr) {
          if (usr === null) {
            database.entities.user.create(user).then(function (usrnew) {
              if (usrnew !== null) {
                usrnew.password = "****";
                res.send({
                  status: "OK",
                  msg: "User create successfully",
                  user: usrnew,
                });
              }
            });
          } else {
            usr.password = "****";
            res.send({
              status: "error",
              msg: "User creation error",
              user: usr,
            });
          }
        });
    });

    app.post("/adminarea/user/update", function (req, res) {
      var user_updated = req.body.user;
      if (!user_updated.id || user_updated.id === 0) {
        //New insert
        user_updated.state = "active";
        database.entities.user
          .findOne({ where: { email: user_updated.email } })
          .then(function (usr) {
            if (usr === null) {
              database.entities.user
                .create(user_updated)
                .then(function (usrnew) {
                  if (usrnew !== null) {
                    res.send({
                      status: "OK",
                      msg: "User create successfully",
                      user: usrnew,
                    });
                  }
                });
            } else {
              res.send({
                status: "error",
                msg: "User creation error",
                user: usr,
              });
            }
          });
      } else if (user_updated.id !== 0) {
        database.entities.user
          .findOne({ where: { id: user_updated.id } })
          .then(function (usr) {
            usr.firstname = user_updated.firstname;
            usr.lastname = user_updated.lastname;
            usr.codfis = user_updated.codfis;
            usr.email = user_updated.email;
            usr.state = user_updated.state;
            usr.address = user_updated.address;
            usr.mobilephone = user_updated.mobilephone;
            usr.username = user_updated.username;
            usr.password = user_updated.password;
            usr.role = user_updated.role;

            usr.save().then(function (usrupdate) {
              if (usrupdate !== null) {
                res.send({
                  status: "OK",
                  msg: "User update successfully",
                  user: usrupdate,
                });
              } else {
                res.send({
                  status: "error",
                  msg: "User update error",
                  user: usr,
                });
              }
            });
          });
      }
    });

    app.post("/adminarea/user/delete", function (req, res) {
      var usr = req.body.user;
      database.entities.user
        .findOne({ where: { id: usr.id } })
        .then(function (usertodel) {
          if (usertodel !== null) {
            usertodel.destroy();
            res.send({
              status: "OK",
              msg: "User deleted successfully",
              user: usertodel,
            });
          } else {
            res.send({
              status: "error",
              msg: "User delete error",
              user: usertodel,
            });
          }
        });
    });

    //////////////////////Login and Logout //////////////////////////////
    //Get login by post
    app.post("/adminarea/login", function (req, res) {
      var user = req.body.username;
      var pass = req.body.password;

      database.entities.user
        .findOne({ where: { username: user, password: pass } })
        .then(function (usr) {
          if (usr == null) {
            res.send({ status: "error", msg: "Login error", user: usr });
          } else {
            //Login accepted
            res.send({ status: "OK", msg: "Login accepted.", user: usr });
            //res.redirect("/customerarea/main");
          }
        });
    });
    //Logout from admin area by post
    app.post("/adminarea/logout", function (req, res) {
      req.session.destroy(function (err) {
        if (err) {
          res.send({ status: "error", msg: "Login accepted.", error: err });
        } else {
          res.send({ status: "OK", msg: "Logout accepted.", user: {} });
        }
      });
    });
    //Logout from admin area by get
    app.get("/adminarea/logout", function (req, res) {
      req.session.destroy(function (err) {
        if (err) {
          res.send({ status: "error", msg: "Login accepted.", error: err });
        } else {
          res.send({ status: "OK", msg: "Logout accepted.", user: {} });
        }
      });
    });

    //////////////////////////Upload files/////////////////////
    app.post("/upload/contacts", function (req, res) {
      const form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {        
        var oldPath = files.csv_data.path; 
        var newPath = path.join(__dirname, 'uploads') 
                + '/'+files.csv_data.name 
        var rawData = fs.readFileSync(oldPath) 
        console.log("Received file:  "+oldPath);
        console.log("Upload file:  "+newPath);
        
        fs.writeFile(newPath, rawData, function(err){ 
            if(err) console.log(err) 
            else {
              utility.import_Contacts_From_Csv(newPath, function () {
                database.entities.customer.findAll().then(function (results) {
                  res.send({ status: "OK", msg: "Customers found", customers: results });
                });                    
              });            
            }
            
        })
      });
    });
  },
};
