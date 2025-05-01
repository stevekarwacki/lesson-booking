const { Sequelize, Op } = require('sequelize');
const config = require('../config/database');
const createCache = require('./cache/factory');

// Create Sequelize instance
const sequelize = new Sequelize(config);

// Add operators to sequelize instance
sequelize.Op = Op;

// Initialize cache
const cache = createCache();

// Test the connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

testConnection();

module.exports = {
    sequelize,
    cache
};