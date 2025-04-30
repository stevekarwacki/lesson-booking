const { Sequelize, Op } = require('sequelize');
const config = require('../config/database');

// Create Sequelize instance
const sequelize = new Sequelize(config);

// Add operators to sequelize instance
sequelize.Op = Op;

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

module.exports = sequelize;