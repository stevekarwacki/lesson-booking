const { Sequelize, Op } = require('sequelize');
const config = require('../config/database');
const createCache = require('./cache/factory');

let sequelize;
let cache;

try {
    // Create Sequelize instance
    sequelize = new Sequelize(config);

    // Add operators to sequelize instance
    sequelize.Op = Op;

    // Initialize cache
    cache = createCache();

    // Test the connection
    (async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
            // Don't exit the process, just log the error
            // Set sequelize to null to indicate connection failure
            sequelize = null;
        }
    })();

} catch (error) {
    console.error('Error initializing database:', error);
    // Initialize with null values to allow the application to start
    // even if the database connection fails
    sequelize = null;
    cache = createCache();
}

module.exports = {
    sequelize,
    cache
};