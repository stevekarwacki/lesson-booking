'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, make the refunded_by column nullable
    await queryInterface.changeColumn('refunds', 'refunded_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'User ID who issued the refund'
    });

    // Drop the existing foreign key constraint and recreate with SET NULL
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE refunds 
        DROP CONSTRAINT IF EXISTS refunds_refunded_by_fkey
      `);
      
      // Recreate the foreign key with SET NULL on delete
      await queryInterface.sequelize.query(`
        ALTER TABLE refunds
        ADD CONSTRAINT refunds_refunded_by_fkey
        FOREIGN KEY (refunded_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
      `);
    } else if (dialect === 'mysql' || dialect === 'mariadb') {
      // Get the actual constraint name (may vary)
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'refunds' 
        AND COLUMN_NAME = 'refunded_by'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (constraints.length > 0) {
        const constraintName = constraints[0].CONSTRAINT_NAME;
        await queryInterface.sequelize.query(`
          ALTER TABLE refunds 
          DROP FOREIGN KEY ${constraintName}
        `);
      }
      
      // Add the new constraint
      await queryInterface.addConstraint('refunds', {
        fields: ['refunded_by'],
        type: 'foreign key',
        name: 'refunds_refunded_by_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }
    // SQLite: requires recreating the entire table (handled by model changes)
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE refunds 
        DROP CONSTRAINT IF EXISTS refunds_refunded_by_fkey
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE refunds
        ADD CONSTRAINT refunds_refunded_by_fkey
        FOREIGN KEY (refunded_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
      `);
    } else if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(`
        ALTER TABLE refunds 
        DROP FOREIGN KEY refunds_refunded_by_fkey
      `);
      
      await queryInterface.addConstraint('refunds', {
        fields: ['refunded_by'],
        type: 'foreign key',
        name: 'refunds_refunded_by_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    }
    
    // Make refunded_by NOT NULL again
    await queryInterface.changeColumn('refunds', 'refunded_by', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'User ID who issued the refund'
    });
  }
};
