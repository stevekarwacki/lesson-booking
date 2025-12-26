'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create attendance table for storing lesson attendance records
    await queryInterface.createTable('attendance', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      calendar_event_id: {
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
      status: {
        type: Sequelize.ENUM('present', 'absent', 'tardy'),
        allowNull: true,
        defaultValue: null,
        comment: 'Attendance status - null means not recorded yet'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes from instructor about attendance'
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

    // Add unique constraint to ensure one attendance record per calendar event
    await queryInterface.addIndex('attendance', ['calendar_event_id'], {
      unique: true,
      name: 'unique_attendance_per_event'
    });

    // Add index for status lookups
    await queryInterface.addIndex('attendance', ['status'], {
      name: 'idx_attendance_status'
    });
  },

  async down (queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('attendance', 'unique_attendance_per_event');
    await queryInterface.removeIndex('attendance', 'idx_attendance_status');
    
    // Drop the table
    await queryInterface.dropTable('attendance');
  }
};
