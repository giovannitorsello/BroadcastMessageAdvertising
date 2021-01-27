const config = require("./config.js").load();
const utility = require("./utility.js");

module.exports = {
  app: {},
  database: {},
  load(app, database) {
    this.app = app;
    this.database = database;
  },
  makeShortLink(campaign, originalUrls, callback) {
    var thisModule = this;
    var database = this.database;

    originalUrls.forEach((url, index, urls) => {
      shortUrl = config.shortDomain + "/" + utility.makeShortUrlCode();
        originalUrl=url;
        database.entities.link
        .findAll({ where: { urlShort: shortUrl } })
        .then(function (results) {
          if (results.length>0) thisModule.makeShortLink(campaign, [urls[index]], callback);
          else {
            database.entities.link
              .create({
                uid: utility.makeUuid(),
                urlOriginal: originalUrl,
                urlShort: shortUrl,
                campaignUid: campaign.uid,
              })
              .then(function (objnew) {
                if (objnew !== null) {
                  console.log({
                    status: "OK",
                    msg: "Link insert successfully",
                    messageCampaign: objnew,
                  });
                } else {
                  console.log({
                    status: "error",
                    msg: "Link not insert",
                    messageCampaign: {},
                  });
                }
              });
          }
        });
      if (index === urls.length - 1) {
        callback();
      }
    });
  },
};
