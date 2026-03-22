'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, make the updated_by column nullable
    await queryInterface.changeColumn('app_settings', 'updated_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'User ID who last updated this setting'
    });

    // Drop the existing foreign key constraint
    // Note: SQLite doesn't support dropping constraints directly
    // For PostgreSQL/MySQL, we need to drop and recreate
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE app_settings 
        DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey
      `);
      
      // Recreate the foreign key with SET NULL on delete
      await queryInterface.sequelize.query(`
        ALTER TABLE app_settings
        ADD CONSTRAINT app_settings_updated_by_fkey
        FOREIGN KEY (updated_by)
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
        AND TABLE_NAME = 'app_settings' 
        AND COLUMN_NAME = 'updated_by'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (constraints.length > 0) {
        const constraintName = constraints[0].CONSTRAINT_NAME;
        await queryInterface.sequelize.query(`
          ALTER TABLE app_settings 
          DROP FOREIGN KEY ${constraintName}
        `);
      }
      
      // Add the new constraint
      await queryInterface.addConstraint('app_settings', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'app_settings_updated_by_fkey',
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
        ALTER TABLE app_settings 
        DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE app_settings
        ADD CONSTRAINT app_settings_updated_by_fkey
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
      `);
    } else if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(`
        ALTER TABLE app_settings 
        DROP FOREIGN KEY app_settings_updated_by_fkey
      `);
      
      await queryInterface.addConstraint('app_settings', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'app_settings_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    }
    
    // Make updated_by NOT NULL again
    await queryInterface.changeColumn('app_settings', 'updated_by', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'User ID who last updated this setting'
    });
  }
};
