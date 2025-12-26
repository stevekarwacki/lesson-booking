'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add lesson_duration_minutes column to payment_plans table
    await queryInterface.addColumn('payment_plans', 'lesson_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Duration in minutes for lessons this plan provides credits for (30 or 60)'
    });

    // Update existing plans to be 30-minute lesson plans by default
    await queryInterface.sequelize.query(`
      UPDATE payment_plans 
      SET lesson_duration_minutes = 30 
      WHERE lesson_duration_minutes IS NULL
    `);

    // Migration completed successfully
  },

  async down(queryInterface, Sequelize) {
    // Remove the lesson_duration_minutes column
    await queryInterface.removeColumn('payment_plans', 'lesson_duration_minutes');
    
    // Migration rollback completed
  }
};
