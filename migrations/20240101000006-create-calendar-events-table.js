'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('calendar_events', {
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
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
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
      status: {
        type: Sequelize.ENUM('booked', 'blocked', 'cancelled'),
        allowNull: false,
        defaultValue: 'booked'
      }
    });

    // Add indexes for common queries
    await queryInterface.addIndex('calendar_events', ['instructor_id']);
    await queryInterface.addIndex('calendar_events', ['student_id']);
    await queryInterface.addIndex('calendar_events', ['date']);
    await queryInterface.addIndex('calendar_events', ['instructor_id', 'date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('calendar_events');
  }
};

