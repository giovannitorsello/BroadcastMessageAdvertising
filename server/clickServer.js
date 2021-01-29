var config = require("./config.js").load();

const fs = require("fs");
const https = require("https");
const http = require("http");
const locutus = require("locutus");

var server = {};

module.exports = {
  app: {},
  database: {},

  setup(app, database) {
    this.server = http.createServer((req, res) => {
      if (req.url) {
        [hexIdCamp, hexIdCust, hexIdLink] = req.url.substring(1).split("/");
        var idCampaign=parseInt(hexIdCamp,36);
        var idCustomer=parseInt(hexIdCust,36);
        var idLink=parseInt(hexIdLink,36);

        //update database
        database.entities.click.create({
            campaignId: idCampaign,
            customerId: idCustomer,
            linkId: idLink
        }).then( (clickNew) => {
            if(clickNew) {
                database.entities.link.findAll({where: {campaignId: clickNew.campaignId, id: clickNew.linkId}}).then( links => {
                    if(links && links.length!==0){
                        var newUrl=links[0].urlOriginal;
                        res.writeHead(302, {'Location': newUrl});
                        res.end();
                    }
                })
            }
        })
      }
    });
    this.server.listen(config.clickServer.port, config.clickServer.ip, () => {
      console.log(
        `Server running at http://${config.clickServer.ip}:${config.clickServer.port}/`
      );
    });
  },
};
