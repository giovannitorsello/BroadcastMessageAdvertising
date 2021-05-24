const config = require("./config.js").load();
var path = require("path");

const { Sequelize, Model, DataTypes, QueryTypes } = require("sequelize");
const utility = require("./utility.js");
const sequelize = new Sequelize(config.database);

class User extends Model {}
class Customer extends Model {}
class MessageCampaign extends Model {}
class Gateway extends Model {}
class Sim extends Model {}
class Bank extends Model {}
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
    sim: Sim,
    bank: Bank,
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
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
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
        imageFile: { type: Sequelize.STRING, allowNull: true },
        senderService: { type: Sequelize.INTEGER, allowNull: true },
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
        ipAddress: { type: Sequelize.STRING, allowNull: true },
        confirm: { type: Sequelize.BOOLEAN, allowNull: false },
      },
      {
        sequelize,
        modelName: "click",
      }
    );

    Sim.init(
      {
        name: { type: Sequelize.STRING, allowNull: false },
        phoneNumber: { type: Sequelize.STRING, allowNull: false },
        operator: { type: Sequelize.STRING, allowNull: false },
        ean: { type: Sequelize.STRING, allowNull: true },
        iccid: { type: Sequelize.STRING, allowNull: true },
        pin: { type: Sequelize.STRING, allowNull: true },
        puk: { type: Sequelize.STRING, allowNull: true },
        bankId: { type: Sequelize.INTEGER, allowNull: true },
        isWorkingCall: { type: Sequelize.BOOLEAN, allowNull: true },
        isWorkingSms: { type: Sequelize.BOOLEAN, allowNull: true },
      },
      {
        sequelize,
        modelName: "sim",
      }
    );

    Bank.init(
      {
        name: { type: Sequelize.STRING, allowNull: false },
        ip: { type: Sequelize.STRING, allowNull: false },
        port: { type: Sequelize.STRING, allowNull: false },
        nplaces: { type: Sequelize.STRING, allowNull: true },
        location: { type: Sequelize.STRING, allowNull: true },
      },
      {
        sequelize,
        modelName: "bank",
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
        longitude: { type: Sequelize.STRING, allowNull: true },
        location: { type: Sequelize.STRING, allowNull: true },
        selectedLine: { type: Sequelize.INTEGER, defaultValue: 1 },
        isWorkingSms: { type: Sequelize.BOOLEAN, allowNull: true },
        nSmsSent: { type: Sequelize.INTEGER, defaultValue: 0 },
        nSmsReceived: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxDailyMessagePerLine: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxSentPercetage: { type: Sequelize.INTEGER, defaultValue: 0 },

        isWorkingCall: { type: Sequelize.BOOLEAN, allowNull: true },
        nCallsSent: { type: Sequelize.INTEGER, defaultValue: 0 },
        nCallsReceived: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxDailyCallPerLine: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxCallPercetage: { type: Sequelize.INTEGER, defaultValue: 0 },

        bankId: { type: Sequelize.INTEGER, allowNull: true },

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
    Sim.sync({ force: false });
    Bank.sync({ force: false });
    Gateway.sync({ force: false });
    MessageCampaign.sync({ force: false });
    Customer.sync({ force: false });
    Click.sync({ force: false });

    //Association Campaign-Customer
    MessageCampaign.hasMany(Customer, { foreignKey: "campaignId" });
    Customer.belongsTo(MessageCampaign, { foreignKey: "campaignId" });
  },
  execute_raw_query(sql, callback) {
    sequelize.query(sql, { type: QueryTypes.SELECT }).then((results) => {
      callback(results);
    });
  },
  execute_raw_update(sql, callback) {
    sequelize.query(sql, { type: QueryTypes.UPDATE }).then((results) => {
      callback(results);
    });
  },
  insert_bulk(sql, callback) {
    sequelize.query(sql, { type: QueryTypes.INSERT }).then((results) => {
      callback(results);
    });
  },
  changeStateCalled(contactId, callback) {
    sql ="UPDATE customers SET state='called' WHERE (id='" + contactId +"');"      
    this.execute_raw_update(sql, callback);
  },
  changeStateContactedByCallInterested(phone, callback) {
    sql =
      "UPDATE customers SET state='contactedByCallInterested' WHERE (mobilephone='" +
      phone +
      "');";
    this.execute_raw_update(sql, callback);
  }, 
  exportCampaignData(campaign, callback) {
    //Export contacts, clicks
    var contacts = [];
    var clicks = [];
    this.entities.customer
      .findAll({ where: { campaignId: campaign.id } })
      .then((custs) => {
        if (custs) {
          contacts = custs;
          var sql =
            "SELECT * from customers,clicks where (clicks.campaignId='" +
            campaign.id+
            "' AND " +
            "clicks.customerId=customers.id);";
          this.execute_raw_query(sql, (cs) => {
            if (cs) {
              clicks = cs;
              var sql =
                "SELECT * from customers where (" +
                "customers.campaignId='" +
                campaign.id +
                "' AND " +
                "customers.id NOT IN (SELECT customerId FROM clicks WHERE clicks.campaignId='" +
                campaign.id +
                "'))";
              this.execute_raw_query(sql, (notInterestedContacts) => {
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
  checkIfBalanceIsPossible(callback) {
    var sql="select distinct operator from gateways where (isWorkingSms=1)";
    this.execute_raw_query(sql, callback);
  },
  updateFileImage(idCampaign,urlImageCampaign,callback) {
    sql =
      "UPDATE messagecampaigns SET imageFile='"+urlImageCampaign+"' WHERE (id='" +
      idCampaign +
      "');";
    this.execute_raw_update(sql, callback);
  }
};
