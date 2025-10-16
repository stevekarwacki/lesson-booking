'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Import AppSettings model
      const { AppSettings } = require('../models/AppSettings');
      
      // Add default business timezone setting (UTC)
      // Using admin user ID 1 (assuming admin user exists)
      await AppSettings.setSetting('business', 'timezone', 'UTC', 1);
      
      // Successfully added default business timezone setting (UTC)
    } catch (error) {
      console.error('Error adding business timezone setting:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Import AppSettings model  
      const { AppSettings } = require('../models/AppSettings');
      
      // Remove business timezone setting
      await AppSettings.deleteSetting('business', 'timezone');
      
      // Successfully removed business timezone setting
    } catch (error) {
      console.error('Error removing business timezone setting:', error);
      throw error;
    }
  }
};