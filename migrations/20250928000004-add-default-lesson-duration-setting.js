'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the default lesson duration setting to app_settings
    await queryInterface.bulkInsert('app_settings', [
      {
        category: 'lessons',
        key: 'default_duration_minutes',
        value: '30',
        updated_by: 1, // Assuming admin user ID 1, or we could use a system user
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove the default lesson duration setting
    await queryInterface.bulkDelete('app_settings', {
      category: 'lessons',
      key: 'default_duration_minutes'
    });
  }
};
