const path = require('path');

const config = {
    development: {
        dialect: process.env.DB_DIALECT || 'sqlite',
        storage: process.env.DB_STORAGE || path.join(__dirname, '../db/database.sqlite'),
        ssl: process.env.DB_SSL || false,
        logging: false,
    },
    test: {
        dialect: process.env.DB_DIALECT || 'sqlite',
        storage: process.env.DB_STORAGE || path.join(__dirname, '../db/test.sqlite'),
        ssl: process.env.DB_SSL || false,
        logging: false,
    },
    production: {
        dialect: process.env.DB_DIALECT || 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        logging: false,
        ssl: process.env.DB_SSL === 'true',
        dialectOptions: process.env.DB_SSL === 'true' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    }
};

// Export full config for CLI, individual config for app
module.exports = process.env.SEQUELIZE_CLI ? config : config[process.env.NODE_ENV || 'development']; 