'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create refunds table for detailed audit trail
    await queryInterface.createTable('refunds', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'calendar_events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to calendar_events table'
      },
      original_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Original transaction that is being refunded'
      },
      refund_transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Stripe refund transaction ID'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Refund amount in dollars'
      },
      type: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          isIn: [['stripe', 'credit']]
        },
        comment: 'Type of refund: stripe or credit'
      },
      refunded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User ID who issued the refund'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional reason for the refund'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for common queries
    await queryInterface.addIndex('refunds', ['booking_id'], {
      name: 'idx_refunds_booking_id'
    });

    await queryInterface.addIndex('refunds', ['original_transaction_id'], {
      name: 'idx_refunds_original_transaction_id'
    });

    await queryInterface.addIndex('refunds', ['type'], {
      name: 'idx_refunds_type'
    });

    await queryInterface.addIndex('refunds', ['refunded_by'], {
      name: 'idx_refunds_refunded_by'
    });

    await queryInterface.addIndex('refunds', ['created_at'], {
      name: 'idx_refunds_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('refunds', 'idx_refunds_created_at');
    await queryInterface.removeIndex('refunds', 'idx_refunds_refunded_by');
    await queryInterface.removeIndex('refunds', 'idx_refunds_type');
    await queryInterface.removeIndex('refunds', 'idx_refunds_original_transaction_id');
    await queryInterface.removeIndex('refunds', 'idx_refunds_booking_id');
    
    // Drop the table
    await queryInterface.dropTable('refunds');
  }
};
