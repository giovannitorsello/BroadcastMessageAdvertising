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
const jwt = require("jsonwebtoken");

const shortner = require("./shortner.js");
const pingServer = require("./pingServer.js");

module.exports = {
  load_routes(app, database, smsCampaignServerWorker, clickServerWorker) {
    var app = app;
    //pingServer.startServer(app, database);

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
          res.send({
            status: "OK",
            msg: "Customers found",
            customers: results,
          });
        else
          res.send({ status: "OK", msg: "Customers not found", customers: {} });
      });
    });

    app.post("/adminarea/customer/getCaps", function (req, res) {
      database.execute_raw_query(
        "SELECT postcode, city from customers GROUP BY postcode, city;",
        function (results) {
          if (results)
            res.send({ status: "OK", msg: "Caps found", caps: results });
          else res.send({ status: "OK", msg: "Caps not found", caps: {} });
        }
      );
    });

    app.post("/adminarea/customer/getCities", function (req, res) {
      database.execute_raw_query(
        "SELECT city from customers GROUP BY city;",
        function (results) {
          if (results)
            res.send({ status: "OK", msg: "Cities found", cities: results });
          else res.send({ status: "OK", msg: "Cities not found", cities: {} });
        }
      );
    });

    app.post("/adminarea/customer/getProvinces", function (req, res) {
      database.execute_raw_query(
        "SELECT adm1 from customers GROUP BY adm1;",
        function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Provinces found",
              provinces: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Provinces not found",
              provinces: {},
            });
        }
      );
    });

    app.post("/adminarea/customer/getStates", function (req, res) {
      database.execute_raw_query(
        "SELECT adm2 from customers GROUP BY adm2;",
        function (results) {
          if (results)
            res.send({ status: "OK", msg: "States found", states: results });
          else res.send({ status: "OK", msg: "States not found", states: {} });
        }
      );
    });

    app.post("/adminarea/customer/getCountries", function (req, res) {
      database.execute_raw_query(
        "SELECT adm3 from customers GROUP BY adm3;",
        function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Countries found",
              countries: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Countries not found",
              countries: {},
            });
        }
      );
    });

    app.post("/adminarea/customer/selectByCap", function (req, res) {
      var cap = req.body.selectedCap;
      database.entities.customer
        .findAll({ where: { postcode: cap } })
        .then(function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Customers found",
              customers: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Customers not found",
              customers: {},
            });
        });
    });

    app.post("/adminarea/customer/selectByCity", function (req, res) {
      var st = req.body.selectedCity;
      database.entities.customer
        .findAll({ where: { city: st } })
        .then(function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Customers found",
              customers: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Customers not found",
              customers: {},
            });
        });
    });

    app.post("/adminarea/customer/selectByProvince", function (req, res) {
      var st = req.body.selectedProvince;
      database.entities.customer
        .findAll({ where: { adm1: st } })
        .then(function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Customers found",
              customers: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Customers not found",
              customers: {},
            });
        });
    });

    app.post("/adminarea/customer/selectByState", function (req, res) {
      var st = req.body.selectedState;
      database.entities.customer
        .findAll({ where: { adm2: st } })
        .then(function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Customers found",
              customers: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Customers not found",
              customers: {},
            });
        });
    });

    app.post("/adminarea/customer/selectByCountry", function (req, res) {
      var st = req.body.selectedCountry;
      database.entities.customer
        .findAll({ where: { adm3: st } })
        .then(function (results) {
          if (results)
            res.send({
              status: "OK",
              msg: "Customers found",
              customers: results,
            });
          else
            res.send({
              status: "OK",
              msg: "Customers not found",
              customers: {},
            });
        });
    });

    /////////////////////Message campaign ////////////////////
    app.post("/adminarea/messageCampaign/insert", function (req, res) {
      var messageCampaign = req.body.messageCampaign;
      var camp = {};
      camp.id = "";
      camp.name = messageCampaign.name;
      camp.message = messageCampaign.message;
      camp.messagePage1 = messageCampaign.messagePage1;
      camp.messagePage2 = messageCampaign.messagePage2;
      camp.ncompleted = 0;
      camp.begin = messageCampaign.begin;
      camp.state = "disabled";

      database.entities.messageCampaign.create(camp).then((campNew) => {
        if (campNew !== null) {
          res.send({
            status: "OK",
            msg: "Message campaign insert successfully",
            messageCampaign: campNew,
          });
        } else {
          res.send({
            status: "error",
            msg: "Message campaign not insert",
            messageCampaign: {},
          });
        }
      });
    });

    app.post("/adminarea/messageCampaign/update", function (req, res) {
      var messageCampaign_updated = req.body.messageCampaign;
      database.entities.messageCampaign
        .findOne({ where: { id: messageCampaign_updated.id } })
        .then(function (camp) {
          if (camp !== null) {
            camp.name = messageCampaign_updated.name;
            camp.state = messageCampaign_updated.state;
            camp.message = messageCampaign_updated.message;
            camp.messagePage1 = messageCampaign_updated.messagePage1;
            camp.messagePage2 = messageCampaign_updated.messagePage2;
            camp.ncontacts = messageCampaign_updated.ncontacts;
            camp.ncompleted = 0;

            camp.save().then(function (campNew) {
              if (campNew) {
                //Reload campaigns in smsServer
                smsCampaignServerWorker.postMessage("/campaigns/reload");
                smsCampaignServerWorker.once("message", (results) => {
                  res.send({
                    status: "OK",
                    msg: "Message campaign update successfully",
                    messageCampaign: campNew
                  });
                });
              } else {
                res.send({
                  status: "error",
                  msg: "Message campaign update error",
                  messageCampaign: messageCampaign_updated,
                });
              }
            });
          }
        });
    });

    app.post("/adminarea/messageCampaign/start", function (req, res) {
      var messageCampaign = req.body.messageCampaign;
      database.entities.messageCampaign
        .findOne({ where: { id: messageCampaign.id } })
        .then(function (obj) {
          if (obj !== null) {
            obj.state = "active";

            obj.save().then(function (campNew) {
              if (campNew !== null) {
                //Reload campaign in smsServer
                smsCampaignServerWorker.postMessage("/campaigns/reload");
                smsCampaignServerWorker.once("message", (results) => {
                  res.send({
                    status: "OK",
                    msg: "Message campaign started successfully",
                    messageCampaign: campNew,
                  });
                });
              } else {
                res.send({
                  status: "error",
                  msg: "Message campaign start error",
                  messageCampaign: campNew,
                });
              }
            });
          }
        });
    });

    app.post("/adminarea/messageCampaign/pause", function (req, res) {
      var messageCampaign = req.body.messageCampaign;
      database.exportCampaignData(messageCampaign, (fileArchive) => {
        database.entities.messageCampaign
          .findOne({ where: { id: messageCampaign.id } })
          .then(function (obj) {
            if (obj !== null) {
              obj.state = "disabled";

              obj.save().then(function (campNew) {
                if (campNew !== null) {
                  smsCampaignServerWorker.postMessage("/campaigns/reload");
                  smsCampaignServerWorker.once("message", (results) => {
                    res.send({
                      status: "OK",
                      msg: "Message campaign paused successfully",
                      messageCampaign: campNew,
                      fileArchive: fileArchive,
                    });
                  });
                } else {
                  res.send({
                    status: "error",
                    msg: "Message campaign pause error",
                    messageCampaign: campNew,
                    fileArchive: fileArchive,
                  });
                }
              });
            }
          });
      });
    });

    app.post("/adminarea/messageCampaign/delete", function (req, res) {
      var messageCampaign = req.body.messageCampaign;
      database.entities.messageCampaign
        .findOne({ where: { id: messageCampaign.id } })
        .then(function (messageCampaignToDel) {
          if (messageCampaignToDel !== null) {
            database.exportCampaignData(messageCampaignToDel, (fileArchive) => {
              //Delete all campaign data

              database.entities.customer.destroy({
                where: { campaignId: messageCampaign.id },
              });

              database.entities.click.destroy({
                where: { campaignId: messageCampaign.id },
              });
              messageCampaignToDel.destroy();

              smsCampaignServerWorker.postMessage("/campaigns/reload");
              smsCampaignServerWorker.once("message", (results) => {
                res.send({
                  status: "OK",
                  msg: "Campaign deleted successfully",
                  fileArchive: fileArchive,
                });
              });
            });
          } else {
            res.send({
              status: "error",
              msg: "Campaign delete error",
              messageCampaign: messageCampaignToDel,
            });
          }
        });
    });

    app.post("/adminarea/messageCampaign/getAll", function (req, res) {
      database.entities.messageCampaign.findAll().then(function (results) {
        if (results)
          res.send({
            status: "OK",
            msg: "Message campaigns found",
            messageCampaigns: results,
          });
        else
          res.send({
            status: "OK",
            msg: "Message campaigns not found",
            messageCampaigns: {},
          });
      });
    });

    app.post("/adminarea/messageCampaign/getCampaign", function (req, res) {
      var messageCampaign = req.body.messageCampaign;
      database.entities.messageCampaign
        .findOne({ where: { id: messageCampaign.id } })
        .then(function (camp) {
          if (camp) {
            res.send({
              status: "OK",
              msg: "Campaign found",
              messageCampaign: camp,
            });
          } else
            res.send({
              status: "OK",
              msg: "Campaign not found",
              messageCampaign: {},
            });
        });
    });

    app.post(
      "/adminarea/messageCampaign/getCampaignClicks",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        database.entities.click
          .findAll({ where: { campaignId: messageCampaign.id } })
          .then(function (results) {
            if (results)
              res.send({
                status: "OK",
                msg: "Clicks campaign found",
                clicks: results,
              });
            else
              res.send({
                status: "OK",
                msg: "Cliks campaign not found",
                cloks: {},
              });
          });
      }
    );

    app.post(
      "/adminarea/messageCampaign/getCampaignCustomers",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        if (messageCampaign && messageCampaign.id)
          database.entities.customer
            .findAll({ where: { campaignId: messageCampaign.id } })
            .then(function (results) {
              if (results)
                res.send({
                  status: "OK",
                  msg: "Customers campaign found",
                  customers: results,
                });
              else
                res.send({
                  status: "OK",
                  msg: "Customers campaign not found",
                  customers: {},
                });
            });
      }
    );

    app.post(
      "/adminarea/messageCampaign/getCampaignCustomersContacted",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        database.entities.customer
          .findAll({
            where: { campaignId: messageCampaign.id, state: "contacted" },
          })
          .then(function (results) {
            if (results)
              res.send({
                status: "OK",
                msg: "Customers campaign found",
                customers: results,
              });
            else
              res.send({
                status: "OK",
                msg: "Customers campaign not found",
                customers: {},
              });
          });
      }
    );

    app.post(
      "/adminarea/messageCampaign/getCampaignCustomersToContact",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        database.entities.customer
          .findAll({
            where: { campaignId: messageCampaign.id, state: "toContact" },
          })
          .then(function (results) {
            if (results)
              res.send({
                status: "OK",
                msg: "Customers campaign found",
                customers: results,
              });
            else
              res.send({
                status: "OK",
                msg: "Customers campaign not found",
                customers: {},
              });
          });
      }
    );

    app.post(
      "/adminarea/messageCampaign/getCampaignNoInterestedCustomers",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        var customersNoClick = [];
        database.entities.customer
          .findAll({
            where: database.sequelize.literal(
              "customer.campaignId=" +
                messageCampaign.id +
                " AND clicks.id IS null"
            ),
            include: [database.entities.click],
          })
          .then(function (customers) {
            if (customers)
              res.send({
                status: "OK",
                msg: "Customers no click found",
                customers: customers,
              });
            else
              res.send({
                status: "OK",
                msg: "Customers no click not found",
                contacts: {},
              });
          });
      }
    );

    app.post(
      "/adminarea/messageCampaign/getCampaignInterestedCustomers",
      function (req, res) {
        var messageCampaign = req.body.messageCampaign;
        database.entities.click
          .findAll({
            where: { campaignId: messageCampaign.id },
            include: [database.entities.customer],
          })
          .then(function (results) {
            if (results)
              res.send({
                status: "OK",
                msg: "Customers interested found",
                clicks: results,
              });
            else
              res.send({
                status: "OK",
                msg: "Customers interested not found",
                clicks: {},
              });
          });
      }
    );

    //////////////////////////Upload files/////////////////////
    app.post("/upload/contacts", function (req, res) {
      const form = new formidable.IncomingForm();
      form.parse(req, function (err, fields, files) {
        var oldPath = files.csv_data.path;
        var idCampaign = fields.idCampaign;
        if (!idCampaign || idCampaign <= 0) {
          res.send({
            status: "Error",
            msg: "Error in campaign id",
            ncontacts: 0,
          });
          return;
        }

        var newPath =
          path.join(__dirname, "uploads") + "/" + files.csv_data.name;
        var rawData = fs.readFileSync(oldPath);
        console.log("Received file:  " + oldPath);
        console.log("Upload file:  " + newPath);

        fs.writeFile(newPath, rawData, (err) => {
          if (err) console.log(err);
          else {
            //delete all old customers
            database.entities.customer.destroy({
              where: { campaignId: idCampaign },
            });
            utility.import_Contacts_From_Csv(
              idCampaign,
              newPath,
              database,
              (nImported) => {
                console.log("File csv successfully imported.");
                res.send({
                  status: "OK",
                  msg: "Contacts found",
                  ncontacts: nImported,
                });
              }
            );
          }
        });
      });
    });

    ///////////////////// Gateways ////////////////////////
    app.post("/adminarea/gateway/getAll", function (req, res) {
      smsCampaignServerWorker.postMessage("/gateways/getAll");
      smsCampaignServerWorker.once("message", (results) => {
        res.send({ status: "OK", msg: "Gateways found", gateways: results });
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
      if (!req.body.user) {
        res.send({ status: "error", msg: "Login error", user: usr });
      }
      var user = req.body.user.username;
      var pass = req.body.user.password;

      database.entities.user
        .findOne({ where: { username: user, password: pass } })
        .then(function (usr) {
          if (usr == null) {
            use = { id: "0", token: "" };
            res.send({ status: "error", msg: "Login error", user: usr });
          } else {
            //Login accepted
            let token = jwt.sign({ id: usr.id }, config.authJwtSecret, {
              expiresIn: 86400,
            });
            res.send({
              status: "OK",
              msg: "Login accepted.",
              user: usr,
              auth: true,
              token: token,
            });
          }
        });
    });
    //Logout from admin area by post
    app.post("/adminarea/logout", function (req, res) {
      req.session.destroy(function (err) {
        if (err) {
          res.send({ status: "error", msg: "Login accepted.", error: err });
        } else {
          res.send({
            status: "OK",
            msg: "Logout accepted.",
            user: {},
            token: {},
          });
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
  },
};
