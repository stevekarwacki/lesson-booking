'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // This migration previously inserted default_duration_minutes setting
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
      `SELECT id FROM app_settings WHERE category = 'lessons' AND key = 'default_duration_minutes' LIMIT 1`
    );
    
    if (existing.length === 0) {
      // Setting doesn't exist, add it
      await queryInterface.bulkInsert('app_settings', [
        {
          category: 'lessons',
          key: 'default_duration_minutes',
          value: '30',
          updated_by: users[0].id,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('app_settings', {
      category: 'lessons',
      key: 'default_duration_minutes'
    });
  }
};
