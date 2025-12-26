'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_templates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      template_key: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      subject_template: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      body_template: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      default_subject_template: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      default_body_template: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      available_variables: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      last_edited_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('email_templates', ['template_key'], {
      name: 'idx_email_templates_key',
      unique: true
    });

    await queryInterface.addIndex('email_templates', ['category'], {
      name: 'idx_email_templates_category'
    });

    await queryInterface.addIndex('email_templates', ['is_active'], {
      name: 'idx_email_templates_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('email_templates');
  }
};