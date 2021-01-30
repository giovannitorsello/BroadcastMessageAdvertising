const config = require("./config.js").load();
var path = require("path");

const { Sequelize, Model, DataTypes, QueryTypes } = require("sequelize");
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
  entities: {
    user: User,
    customer: Customer,
    link: Link,
    click: Click,
    messageCampaign: MessageCampaign,
    gateway: Gateway,
    config: Config,
  },
  setup(app, callback) {
    sequelize
      .authenticate()
      .then(() => {
        this.init_entities();
        console.log("Connection has been established successfully.");
        setTimeout(function () {
          console.log("Init database successfull");
          callback();
        }, 5000);
        this.seq = sequelize;
        sequelize.options.logging = false;
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
        objData: { type: Sequelize.JSON },
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

    Link.init(
      {
        campaignId: { type: Sequelize.INTEGER, allowNull: false },
        urlOriginal: { type: Sequelize.STRING, allowNull: false },        
      },
      {
        sequelize,
        modelName: "link",
      }
    );

    Click.init(
      {
        campaignId: { type: Sequelize.INTEGER, allowNull: false },
        customerId: { type: Sequelize.INTEGER, allowNull: false },
        linkId: { type: Sequelize.INTEGER, allowNull: false },       
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
        login: { type: Sequelize.STRING, allowNull: true },
        password: { type: Sequelize.STRING, allowNull: true },
        longitude: { type: Sequelize.STRING, allowNull: true },
        latitude: { type: Sequelize.STRING, allowNull: true },
        nSmsSent: { type: Sequelize.INTEGER, defaultValue: 0 },
        nSmsReceived: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxDailyMessagePerLine: { type: Sequelize.INTEGER, defaultValue: 0 },
        nMaxSentPercetage: { type: Sequelize.INTEGER, defaultValue: 0 },
        isWorking: { type: Sequelize.BOOLEAN, allowNull: true },
        objData: { type: Sequelize.JSON }
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
    
    //Association Campaign-Customer
    MessageCampaign.hasMany(Customer, {foreignKey: 'campaignId'});
    Customer.belongsTo(MessageCampaign, {foreignKey: 'campaignId'});
    //Association Campaign-Link
    MessageCampaign.hasMany(Link, {foreignKey: 'campaignId'});
    Link.belongsTo(MessageCampaign, {foreignKey: 'campaignId'});
    //Association Link-Click
    Link.hasMany(Click, {foreignKey: 'linkId'});
    Click.belongsTo(Link, {foreignKey: 'linkId'});
    //Association Customers-Link
    Customer.hasMany(Click, {foreignKey: 'customerId'});
    Click.belongsTo(Customer, {foreignKey: 'customerId'});
    
    /*
    Config.sync({ force: true });
    User.sync({ force: true });
    Gateway.sync({ force: true });
    Click.sync({ force: true });
    Link.sync({ force: true });    
    Customer.sync({ force: true });
    MessageCampaign.sync({ force: true });    
    */

  },
  execute_raw_query(sql, callback) {
    this.seq.query(sql, { type: QueryTypes.SELECT }).then((results) => {
      callback(results);
    });
  },
};
