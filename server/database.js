const config = require("./config.js").load();
var path = require("path");

const { Sequelize, Model, DataTypes, QueryTypes } = require("sequelize");
const utility = require("./utility.js");
const sequelize = new Sequelize(config.database);
sequelize.options.logging = true;

//const sequelize = new Sequelize('database', 'username', 'password', {host: config.database.host,dialect: config.database.type});
class User extends Model {}
class Customer extends Model {}
class MessageCampaign extends Model {}
class Gateway extends Model {}
class Link extends Model {}
class Click extends Model {}
class Config extends Model {}

module.exports = {
  seq: {},
  sequelize: sequelize,
  entities: {
    user: User,
    customer: Customer,
    click: Click,
    messageCampaign: MessageCampaign,
    gateway: Gateway,
    config: Config,
  },
  setup(callback) {
    sequelize
      .authenticate()
      .then(() => {
        this.init_entities();
        this.seq = sequelize;
        sequelize.options.logging = false;
        console.log("Connection has been established successfully.");
        setTimeout(function () {
          console.log("Init database successfull");
          callback(this.seq);
        }, 2000);
      })
      .catch((err) => {
        console.error("Unable to connect to the database:", err);
      });
  },
  init_entities() {
    User.init(
      {
        username: { type: Sequelize.STRING, allowNull: false },
        password: { type: Sequelize.STRING, allowNull: false },
        role: { type: Sequelize.STRING, allowNull: false }, //admin, operator, ecc.
        state: { type: Sequelize.STRING, allowNull: false }, //active, suspended
        email: { type: Sequelize.STRING, allowNull: false },
        codfis: { type: Sequelize.STRING, allowNull: true },
        address: { type: Sequelize.STRING, allowNull: true },
        mobilephone: { type: Sequelize.STRING, allowNull: true },
        firstname: { type: Sequelize.STRING, allowNull: false },
        lastname: { type: Sequelize.STRING, allowNull: false },
        createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        objData: { type: Sequelize.JSON },
      },
      {
        sequelize,
        modelName: "user",
      }
    );

    Customer.init(
      {
        id: {type: Sequelize.INTEGER,autoIncrement: true,primaryKey: true},
        firstname: { type: Sequelize.STRING, allowNull: false },
        lastname: { type: Sequelize.STRING, allowNull: true },
        email: { type: Sequelize.STRING, allowNull: true },
        mobilephone: { type: Sequelize.STRING, allowNull: false },
        address: { type: Sequelize.STRING, allowNull: true },
        postcode: { type: Sequelize.STRING, allowNull: true },
        city: { type: Sequelize.STRING, allowNull: true },
        adm1: { type: Sequelize.STRING, allowNull: true }, //Provincia
        adm2: { type: Sequelize.STRING, allowNull: true }, //Regione
        adm3: { type: Sequelize.STRING, defaultValue: "ITALY" }, //Stato
        campaignId: { type: Sequelize.INTEGER, allowNull: false },
        state: { type: Sequelize.STRING, defaultValue: "toContact" }, //toContact, contacted
        objData: { type: DataTypes.JSON },
      },
      {
        sequelize,
        modelName: "customer",
      }
    );

    MessageCampaign.init(
      {
        name: { type: Sequelize.STRING, allowNull: false },
        message: { type: Sequelize.STRING, allowNull: false },
        messagePage1: { type: Sequelize.STRING, allowNull: false },
        messagePage2: { type: Sequelize.STRING, allowNull: false },
        ncontacts: { type: Sequelize.INTEGER, allowNull: true },
        ncompleted: { type: Sequelize.INTEGER, allowNull: true },
        begin: { type: Sequelize.DATE, allowNull: true },
        end: { type: Sequelize.DATE, allowNull: true },
        state: { type: Sequelize.STRING, allowNull: false }, //active, disabled, complete
      },
      {
        sequelize,
        modelName: "messagecampaign",
      }
    );

    Click.init(
      {
        campaignId: { type: Sequelize.INTEGER, allowNull: false },
        customerId: { type: Sequelize.INTEGER, allowNull: false },
        confirm: { type: Sequelize.BOOLEAN, allowNull: false },
      },
      {
        sequelize,
        modelName: "click",
      }
    );

    Gateway.init(
      {
        name: { type: Sequelize.STRING, allowNull: false },
        operator: { type: Sequelize.STRING, allowNull: true },
        nRadios: { type: Sequelize.INTEGER, defaultValue: 0 },
        ip: { type: Sequelize.STRING, allowNull: true },
        port: { type: Sequelize.STRING, allowNull: true },
        login: { type: Sequelize.STRING, allowNull: true },
        password: { type: Sequelize.STRING, allowNull: true },
        longitude: { type: Sequelize.STRING, allowNull: true },
        latitude: { type: Sequelize.STRING, allowNull: true },
        selectedLine: { type: Sequelize.INTEGER, defaultValue: 1 },
        nSmsSent: { type: Sequelize.INTEGER, defaultValue: 0 },
        nSmsReceived: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxDailyMessagePerLine: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxSentPercetage: { type: Sequelize.INTEGER, defaultValue: 0 },
        isWorking: { type: Sequelize.BOOLEAN, allowNull: true },
        objData: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        modelName: "gateway",
      }
    );

    Config.init(
      {
        key: { type: Sequelize.STRING, allowNull: true }, //key section config
        value: { type: Sequelize.BLOB, allowNull: true }, //JSON configuration
      },
      {
        sequelize,
        modelName: "config",
      }
    );

    Config.sync({ force: false });
    User.sync({ force: false });
    Gateway.sync({ force: false });
    MessageCampaign.sync({ force: false });
    Customer.sync({ force: false });
    Click.sync({ force: false });

    //Association Campaign-Customer
    MessageCampaign.hasMany(Customer, { foreignKey: "campaignId" });
    Customer.belongsTo(MessageCampaign, { foreignKey: "campaignId" });

    //Association Customers-Link
    Customer.hasMany(Click, { foreignKey: "customerId" });
    Click.belongsTo(Customer, { foreignKey: "customerId" });
  },
  execute_raw_query(sql, callback) {
    sequelize.query(sql, { type: QueryTypes.SELECT }).then((results) => {
      callback(results);
    });
  },
  insert_bulk(sql, callback) {
    sequelize.query(sql, { type: QueryTypes.INSERT }).then((results) => {
      callback(results);
    });
  },
  exportCampaignData(campaign, callback) {
    //Export contacts, clicks
    var contacts = [],
      clicks = [];
    this.entities.customer
      .findAll({ where: { campaignId: campaign.id } })
      .then((custs) => {
        if (custs) {
          contacts = custs;
          this.entities.click
            .findAll({
              where: { campaignId: campaign.id },
              include: [this.entities.customer],
            })
            .then((cs) => {
              if (cs) {
                clicks = cs;
                this.entities.customer
                  .findAll({
                    where: this.sequelize.literal(
                      "customer.campaignId=" +
                        campaign.id +
                        " AND clicks.id IS null"
                    ),
                    include: [this.entities.click],
                  })
                  .then((notInterestedContacts) => {
                    if (notInterestedContacts) {
                      pkgData = {
                        campaign: campaign,
                        contacts: contacts,
                        clicks: clicks,
                        notInterestedContacts: notInterestedContacts,
                      };
                      utility.createCampaignPackage(pkgData, (data) => {
                        callback(data);
                      });
                    }
                  });
              }
            });
        }
      });
  },
};
