'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update payment_method enum in transactions table to remove 'cash'
    // Since we confirmed there are no existing cash transactions, this is safe
    
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // PostgreSQL: Create new enum type without 'cash', then replace the column
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_transactions_payment_method_new" AS ENUM ('stripe', 'credits', 'in-person');
      `);
      
      // Update the column to use the new enum type
      await queryInterface.sequelize.query(`
        ALTER TABLE transactions 
        ALTER COLUMN payment_method TYPE "enum_transactions_payment_method_new" 
        USING payment_method::text::"enum_transactions_payment_method_new";
      `);
      
      // Drop the old enum type and rename the new one
      await queryInterface.sequelize.query(`
        DROP TYPE "enum_transactions_payment_method";
        ALTER TYPE "enum_transactions_payment_method_new" RENAME TO "enum_transactions_payment_method";
      `);
    } else {
      // SQLite and other databases
      await queryInterface.changeColumn('transactions', 'payment_method', {
        type: Sequelize.ENUM('stripe', 'credits', 'in-person'),
        allowNull: false,
        comment: 'Payment method used for the transaction - cash removed as option'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore 'cash' as a payment method option
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      // PostgreSQL: Create new enum type with 'cash', then replace the column
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_transactions_payment_method_new" AS ENUM ('stripe', 'cash', 'credits', 'in-person');
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE transactions 
        ALTER COLUMN payment_method TYPE "enum_transactions_payment_method_new" 
        USING payment_method::text::"enum_transactions_payment_method_new";
      `);
      
      await queryInterface.sequelize.query(`
        DROP TYPE "enum_transactions_payment_method";
        ALTER TYPE "enum_transactions_payment_method_new" RENAME TO "enum_transactions_payment_method";
      `);
    } else {
      // SQLite and other databases
      await queryInterface.changeColumn('transactions', 'payment_method', {
        type: Sequelize.ENUM('stripe', 'cash', 'credits', 'in-person'),
        allowNull: false,
        comment: 'Payment method used for the transaction'
      });
    }
  }
};
