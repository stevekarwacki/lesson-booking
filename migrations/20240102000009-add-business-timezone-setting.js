'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // This migration previously inserted timezone setting
    // Now handled by seeds/app-settings.js for consistency
    // For existing installations, check if setting exists and add if missing
    
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users LIMIT 1'
    );
    
    if (users.length === 0) {
      // Fresh install - seeds will handle this
      return;
    }
    
    // Existing installation - check if setting already exists
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM app_settings WHERE category = 'business' AND key = 'timezone' LIMIT 1`
    );
    
    if (existing.length === 0) {
      // Setting doesn't exist, add it using model for consistency
      try {
        const { AppSettings } = require('../models/AppSettings');
        await AppSettings.setSetting('business', 'timezone', 'UTC', users[0].id);
      } catch (error) {
        console.error('Error adding business timezone setting:', error);
        throw error;
      }
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