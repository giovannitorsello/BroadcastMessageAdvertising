const config = require("./config.js").load();
var path = require('path');

const { Sequelize, Model, DataTypes, QueryTypes } = require('sequelize');
const sequelize = new Sequelize(config.database);
sequelize.options.logging = true;


//const sequelize = new Sequelize('database', 'username', 'password', {host: config.database.host,dialect: config.database.type});
class User extends Model { };
class Config extends Model { };


module.exports = {

    seq: {},
    entities: {
        user: User,
        config: Config,
    },
    setup(app, callback) {
        sequelize
            .authenticate()
            .then(() => {
                this.init_entities();
                console.log('Connection has been established successfully.');
                setTimeout(function () { console.log("Init database successfull"); callback(); }, 5000);                
                this.seq = sequelize;
                sequelize.options.logging = false;
            })
            .catch(err => {
                console.error('Unable to connect to the database:', err);
            });
    },
    init_entities() {
        User.init({
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
            objData: { type: Sequelize.JSON }
        }, {
            sequelize,
            modelName: 'user'
        });

        Config.init({
            key: { type: Sequelize.STRING, allowNull: true },    //key section config
            value: { type: Sequelize.BLOB, allowNull: true },  //JSON configuration     
        }, {
            sequelize,
            modelName: 'config'
        });

        //Tabelle da non modificare. Dati Fissi.
        Config.sync({ force: false });
        User.sync({ force: false });
    },
    execute_raw_query(sql, callback) {
        this.seq.query(sql, { type: QueryTypes.SELECT }).then(results => {
            callback(results);
        });
    },



}