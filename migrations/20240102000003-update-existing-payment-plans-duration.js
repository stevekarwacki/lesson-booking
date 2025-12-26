'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update existing payment plans that mention "60" in their name to be 60-minute lesson plans
    await queryInterface.sequelize.query(`
      UPDATE payment_plans 
      SET lesson_duration_minutes = 60 
      WHERE (name LIKE '%60%' OR name LIKE '%sixty%') 
      AND type = 'one-time'
      AND lesson_duration_minutes != 60
    `);

    // Update existing payment plans that mention "30" in their name to be 30-minute lesson plans (for clarity)
    await queryInterface.sequelize.query(`
      UPDATE payment_plans 
      SET lesson_duration_minutes = 30 
      WHERE (name LIKE '%30%' OR name LIKE '%thirty%') 
      AND type = 'one-time'
      AND lesson_duration_minutes != 30
    `);

    // Migration completed successfully
  },

  async down(queryInterface, Sequelize) {
    // Reset all one-time payment plans to 30-minute duration
    await queryInterface.sequelize.query(`
      UPDATE payment_plans 
      SET lesson_duration_minutes = 30 
      WHERE type = 'one-time'
    `);
    
    // Migration rollback completed
  }
};
