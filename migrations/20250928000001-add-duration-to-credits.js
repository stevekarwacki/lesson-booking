'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add duration_minutes column to user_credits table
    await queryInterface.addColumn('user_credits', 'duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Duration in minutes for this credit (30 or 60)'
    });

    // Add duration_minutes column to credit_usage table for tracking
    await queryInterface.addColumn('credit_usage', 'duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true, // Nullable for existing records
      comment: 'Duration in minutes of the lesson this credit was used for'
    });

    // Add index for performance on user_id + duration_minutes queries
    await queryInterface.addIndex('user_credits', ['user_id', 'duration_minutes'], {
      name: 'idx_user_credits_duration'
    });

    // Backfill existing credit_usage records with 30-minute duration
    // This assumes all existing lessons were 30-minute lessons
    await queryInterface.sequelize.query(`
      UPDATE credit_usage 
      SET duration_minutes = 30 
      WHERE duration_minutes IS NULL
    `);

    console.log('✅ Added duration support to credit system');
    console.log('   - All existing credits are now 30-minute credits');
    console.log('   - All existing credit usage records marked as 30-minute');
    console.log('   - Added performance index for duration queries');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('user_credits', 'idx_user_credits_duration');
    
    // Remove columns
    await queryInterface.removeColumn('user_credits', 'duration_minutes');
    await queryInterface.removeColumn('credit_usage', 'duration_minutes');
    
    console.log('✅ Removed duration support from credit system');
  }
};
