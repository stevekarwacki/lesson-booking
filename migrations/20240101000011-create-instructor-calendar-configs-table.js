'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instructor_calendar_configs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      instructor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'instructors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      calendar_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Google Calendar ID'
      },
      calendar_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Display name for the calendar'
      },
      calendar_type: {
        type: Sequelize.ENUM('personal', 'shared'),
        defaultValue: 'personal',
        comment: 'Type of calendar (personal email or shared calendar)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this calendar integration is active'
      },
      last_tested_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time the calendar connection was tested'
      },
      last_test_status: {
        type: Sequelize.ENUM('success', 'failed', 'never_tested'),
        defaultValue: 'never_tested',
        comment: 'Status of the last connection test'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique index on instructor_id
    await queryInterface.addIndex('instructor_calendar_configs', ['instructor_id'], { unique: true });
    await queryInterface.addIndex('instructor_calendar_configs', ['calendar_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('instructor_calendar_configs');
  }
};

