'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('credit_usage', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      calendar_event_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'calendar_events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    });

    // Add indexes for common queries
    await queryInterface.addIndex('credit_usage', ['user_id']);
    await queryInterface.addIndex('credit_usage', ['calendar_event_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('credit_usage');
  }
};

