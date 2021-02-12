var config = require("./config.js").load();
var database = require("./database.js");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const https = require("https");
const http = require("http");

function startClickServer(database) {
this.server = http.createServer((req, res) => {
    if (req.url) {
      [hexIdCamp, hexIdCust, confirm] = req.url.substring(1).split("/");
      if (hexIdCamp === "favicon.ico") {
        res.writeHeader(200, { "Content-Type": "text/html" });
        res.write("");
        res.end();
        return;
      }
      var idCampaign = parseInt(hexIdCamp, 36);
      var idCustomer = parseInt(hexIdCust, 36);

      //Second click
      if (confirm && confirm === "1") {
        database.entities.click
          .findOne({
            where: { campaignId: idCampaign, customerId: idCustomer },
          })
          .then((click) => {
            click.confirm = true;
            click.save().then((clickSaved) => {
              res.writeHeader(200, { "Content-Type": "text/html" });
              res.write("");
              res.end();
            });
          });
      }

      //First click
      else if (!confirm || confirm === "0") {
        //Load page from templates
        templateHTML = fs.readFileSync(
          __dirname + "/templates/messagePage.html",
          { encoding: "utf8", flag: "r" }
        );
        //First find to avoid double click
        database.entities.click
          .findOne({
            where: {
              campaignId: idCampaign,
              customerId: idCustomer,
              confirm: false,
            },
          })
          .then((clickExist) => {
            if (clickExist) {
              //click exist no database update
              //search campaign and send page
              database.entities.messageCampaign
                .findOne({ where: { id: clickExist.campaignId } })
                .then((camp) => {
                  templateHTML = templateHTML.replace(
                    "%%LinkConfirm%%",
                    config.shortDomain + req.url + "/1"
                  ); //config.shortDomain
                  templateHTML = templateHTML.replace(
                    "%%MessagePage1%%",
                    camp.messagePage1
                  );
                  templateHTML = templateHTML.replace(
                    "%%MessagePage2%%",
                    camp.messagePage2
                  );
                  res.writeHeader(200, { "Content-Type": "text/html" });
                  res.write(templateHTML);
                  res.end();
                });
            } else {
              //create click database
              database.entities.click
                .create({
                  campaignId: idCampaign,
                  customerId: idCustomer,
                  confirm: false,
                })
                .then((clickNew) => {
                  if (clickNew) {
                    //search campaign and send page
                    database.entities.messageCampaign
                      .findOne({ where: { id: clickNew.campaignId } })
                      .then((camp) => {
                        templateHTML = templateHTML.replace(
                          "%%LinkConfirm%%",
                          config.shortDomain + req.url + "/1"
                        ); //config.shortDomain
                        templateHTML = templateHTML.replace(
                          "%%MessagePage1%%",
                          camp.messagePage1
                        );
                        templateHTML = templateHTML.replace(
                          "%%MessagePage2%%",
                          camp.messagePage2
                        );
                        res.writeHeader(200, { "Content-Type": "text/html" });
                        res.write(templateHTML);
                        res.end();
                      });
                  }
                });
            }
          });
      }
    }
  });

  this.server.listen(config.clickServer.port, config.clickServer.ip, () => {    
    var msg= `Click server is running at http://${config.clickServer.ip}:${config.clickServer.port}/`
    console.log(msg);
    parentPort.postMessage({status: "OK", msg: msg});
  });
}

if (!isMainThread) {
  database.setup(() => {
    startClickServer(database);
  });
  
}
