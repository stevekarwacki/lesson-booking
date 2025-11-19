'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('instructor_calendar_configs', 'calendar_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Google Calendar ID (for service account) or null (for OAuth primary calendar)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('instructor_calendar_configs', 'calendar_id', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Google Calendar ID (usually email address)'
    });
  }
};