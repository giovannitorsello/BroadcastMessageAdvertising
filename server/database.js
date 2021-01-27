const config = require("./config.js").load();
var path = require("path");

const { Sequelize, Model, DataTypes, QueryTypes } = require("sequelize");
const sequelize = new Sequelize(config.database);
sequelize.options.logging = true;

//const sequelize = new Sequelize('database', 'username', 'password', {host: config.database.host,dialect: config.database.type});
class User extends Model {}
class Customer extends Model {}
class MessageCampaign extends Model {}
class Link extends Model {}
class Config extends Model {}

module.exports = {
  seq: {},
  entities: {
    user: User,
    customer: Customer,
    link: Link,
    messageCampaign: MessageCampaign,
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
        uid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
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
        uid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
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
        creationdate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        objData: { type: Sequelize.JSON },
      },
      {
        sequelize,
        modelName: "customer",
      }
    );

    MessageCampaign.init(
      {
        uid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        name: { type: Sequelize.STRING, allowNull: false },
        message: { type: Sequelize.STRING, allowNull: false },
        ncontacts: { type: Sequelize.STRING, allowNull: true },
        ncompleted: { type: Sequelize.STRING, allowNull: true },
        state: { type: Sequelize.STRING, allowNull: false }, //active, disabled
      },
      {
        sequelize,
        modelName: "messagecampaign",
      }
    );

    Link.init(
      {
        uid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },       
        campaignUid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        urlOriginal: { type: Sequelize.STRING, allowNull: false },
        urlShort: { type: Sequelize.STRING, allowNull: false },        
      },
      {
        sequelize,
        modelName: "link",
      }
    );

    Config.init(
      {
        uid: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
        key: { type: Sequelize.STRING, allowNull: true }, //key section config
        value: { type: Sequelize.BLOB, allowNull: true }, //JSON configuration
      },
      {
        sequelize,
        modelName: "config",
      }
    );

    //MessageCampaign.hasMany(Link);
    //Link.belongsTo(MessageCampaign);

    Customer.sync({ force: true });
    Link.sync({ force: true });
    MessageCampaign.sync({ force: true });

    //Tabelle da non modificare. Dati Fissi.
    Config.sync({ force: false });
    User.sync({ force: false });
  },
  execute_raw_query(sql, callback) {
    this.seq.query(sql, { type: QueryTypes.SELECT }).then((results) => {
      callback(results);
    });
  },
};
