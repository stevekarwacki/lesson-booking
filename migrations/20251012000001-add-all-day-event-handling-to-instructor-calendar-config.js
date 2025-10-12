'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('instructor_calendar_configs', 'all_day_event_handling', {
      type: Sequelize.ENUM('ignore', 'block'),
      defaultValue: 'ignore',
      allowNull: false,
      comment: 'How to handle all-day events: ignore them or block the entire day'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('instructor_calendar_configs', 'all_day_event_handling');
    
    // Clean up the ENUM type (PostgreSQL specific, but won't hurt other databases)
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_instructor_calendar_configs_all_day_event_handling";');
    } catch (error) {
      // Ignore errors for non-PostgreSQL databases
    }
  }
};
