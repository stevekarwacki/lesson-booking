'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add user_profile_data JSONB field for address and optional parent info
    await queryInterface.addColumn('users', 'user_profile_data', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null
    });

    // Add phone_number VARCHAR field
    await queryInterface.addColumn('users', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null
    });

    // Add is_student_minor boolean field
    await queryInterface.addColumn('users', 'is_student_minor', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null
    });

    // Add profile_completed_at timestamp field
    await queryInterface.addColumn('users', 'profile_completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns in reverse order
    await queryInterface.removeColumn('users', 'profile_completed_at');
    await queryInterface.removeColumn('users', 'is_student_minor');
    await queryInterface.removeColumn('users', 'phone_number');
    await queryInterface.removeColumn('users', 'user_profile_data');
  }
};
