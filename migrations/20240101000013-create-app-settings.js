'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create app_settings table for storing application configuration
    await queryInterface.createTable('app_settings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Setting category: business, theme, email'
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Setting key within the category'
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Setting value, can be JSON for complex data'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User ID who last updated this setting'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint for category + key combination
    await queryInterface.addIndex('app_settings', ['category', 'key'], {
      unique: true,
      name: 'unique_category_key'
    });

    // Add index for category lookups
    await queryInterface.addIndex('app_settings', ['category'], {
      name: 'idx_app_settings_category'
    });

    // Note: SQLite doesn't support CHECK constraints in this format
    // Category validation is handled in the model instead
  },

  async down (queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('app_settings', 'unique_category_key');
    await queryInterface.removeIndex('app_settings', 'idx_app_settings_category');
    
    // Drop the table
    await queryInterface.dropTable('app_settings');
  }
};
