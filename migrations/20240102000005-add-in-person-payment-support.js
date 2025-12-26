'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add in_person_payment_override column to users table
    await queryInterface.addColumn('users', 'in_person_payment_override', {
      type: Sequelize.ENUM('enabled', 'disabled'),
      allowNull: true,
      defaultValue: null,
      comment: 'Override global in-person payment setting for this user'
    });

    // Update payment_method enum in transactions table to include 'in-person' and remove 'cash'
    // For PostgreSQL, we need to handle enum changes differently
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // PostgreSQL: Add new enum value first, then remove old one in separate migration
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_transactions_payment_method" ADD VALUE IF NOT EXISTS 'in-person';
      `);
      // Note: PostgreSQL doesn't support removing enum values directly
      // The removal of 'cash' will be handled in the next migration
    } else {
      // SQLite and other databases
      await queryInterface.changeColumn('transactions', 'payment_method', {
        type: Sequelize.ENUM('stripe', 'credits', 'in-person'),
        allowNull: false,
        comment: 'Payment method used for the transaction'
      });
    }

    // Update status enum in transactions table to include 'outstanding'
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // PostgreSQL: Add new enum value
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_transactions_status" ADD VALUE IF NOT EXISTS 'outstanding';
      `);
    } else {
      // SQLite and other databases
      await queryInterface.changeColumn('transactions', 'status', {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'outstanding'),
        allowNull: false,
        defaultValue: 'completed',
        comment: 'Transaction status - outstanding for in-person payments awaiting collection'
      });
    }

    // Add index for in_person_payment_override for efficient queries
    await queryInterface.addIndex('users', ['in_person_payment_override'], {
      name: 'idx_users_in_person_payment_override'
    });

    // Add index for payment_method and status combination for efficient filtering
    await queryInterface.addIndex('transactions', ['payment_method', 'status'], {
      name: 'idx_transactions_payment_method_status'
    });

    // Add in-person payment enabled setting to app_settings (for existing installations only)
    // Fresh installs: seeds/app-settings.js handles this
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users LIMIT 1'
    );
    
    if (users.length > 0) {
      // Existing installation - check if setting already exists
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM app_settings WHERE category = 'lessons' AND key = 'in_person_payment_enabled' LIMIT 1`
      );
      
      if (existing.length === 0) {
        // Setting doesn't exist, add it
        await queryInterface.bulkInsert('app_settings', [
          {
            category: 'lessons',
            key: 'in_person_payment_enabled',
            value: 'false',
            updated_by: users[0].id,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('users', 'idx_users_in_person_payment_override');
    await queryInterface.removeIndex('transactions', 'idx_transactions_payment_method_status');

    // Remove the in-person payment setting from app_settings
    await queryInterface.bulkDelete('app_settings', {
      category: 'lessons',
      key: 'in_person_payment_enabled'
    });

    // Revert status enum in transactions table (remove 'outstanding')
    await queryInterface.changeColumn('transactions', 'status', {
      type: Sequelize.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'completed'
    });

    // Revert payment_method enum in transactions table (remove 'in-person', restore 'cash')
    await queryInterface.changeColumn('transactions', 'payment_method', {
      type: Sequelize.ENUM('stripe', 'cash', 'credits'),
      allowNull: false
    });

    // Remove in_person_payment_override column from users table
    await queryInterface.removeColumn('users', 'in_person_payment_override');
  }
};
