'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instructor_weekly_availability', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      instructor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'instructors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      start_slot: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      instructor_timezone: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'UTC'
      },
      local_start_time: {
        type: Sequelize.STRING(5),
        allowNull: true
      },
      local_end_time: {
        type: Sequelize.STRING(5),
        allowNull: true
      }
    });

    // Add indexes for common queries
    await queryInterface.addIndex('instructor_weekly_availability', ['instructor_id']);
    await queryInterface.addIndex('instructor_weekly_availability', ['instructor_id', 'day_of_week']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('instructor_weekly_availability');
  }
};

