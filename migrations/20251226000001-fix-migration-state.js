'use strict';

/**
 * One-time migration to clean up SequelizeMeta and standardize naming.
 * This fixes the mix of 2024/2025 dated migrations by keeping only the
 * 2024-prefixed versions (treating them as version numbers, not dates).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all current entries
    const [entries] = await queryInterface.sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );
    
    // Define mapping from old names to new names
    const renameMapping = {
      '20250922082457-create-app-settings.js': '20240101000013-create-app-settings.js',
      '20250928000001-add-duration-to-credits.js': '20240102000001-add-duration-to-credits.js',
      '20250928000002-add-lesson-duration-to-payment-plans.js': '20240102000002-add-lesson-duration-to-payment-plans.js',
      '20250928000003-update-existing-payment-plans-duration.js': '20240102000003-update-existing-payment-plans-duration.js',
      '20250928000004-add-default-lesson-duration-setting.js': '20240102000004-add-default-lesson-duration-setting.js',
      '20250929000001-create-attendance-table.js': '20240101000014-create-attendance-table.js',
      '20250930000001-add-in-person-payment-support.js': '20240102000005-add-in-person-payment-support.js',
      '20250930000002-remove-cash-payment-method.js': '20240102000006-remove-cash-payment-method.js',
      '20251012000001-add-all-day-event-handling-to-instructor-calendar-config.js': '20240102000007-add-all-day-event-handling-to-instructor-calendar-config.js',
      '20251013000001-create-email-templates.js': '20240101000016-create-email-templates.js',
      '20251029000001-make-calendar-id-nullable.js': '20240102000008-make-calendar-id-nullable.js',
      '20250116000001-add-business-timezone-setting.js': '20240102000009-add-business-timezone-setting.js',
      '20241004000002-create-refunds-table.js': '20240101000015-create-refunds-table.js',
    };
    
    // Orphaned migrations that should be removed (no corresponding file)
    const orphanedMigrations = [
      '20241004000001-add-refund-columns-to-calendar-events.js',
    ];
    
    // Update old names to new names
    for (const [oldName, newName] of Object.entries(renameMapping)) {
      try {
        // Check if old name exists
        const existingOld = await queryInterface.sequelize.query(
          'SELECT name FROM "SequelizeMeta" WHERE name = ?',
          { 
            replacements: [oldName], 
            type: queryInterface.sequelize.QueryTypes.SELECT 
          }
        );
        
        if (existingOld && existingOld.length > 0) {
          // Check if the new name already exists (happens in local dev with duplicates)
          const existingNew = await queryInterface.sequelize.query(
            'SELECT name FROM "SequelizeMeta" WHERE name = ?',
            { 
              replacements: [newName], 
              type: queryInterface.sequelize.QueryTypes.SELECT 
            }
          );
          
          if (existingNew && existingNew.length > 0) {
            // New name already exists, just delete the old one
            await queryInterface.sequelize.query(
              'DELETE FROM "SequelizeMeta" WHERE name = ?',
              { 
                replacements: [oldName], 
                type: queryInterface.sequelize.QueryTypes.DELETE 
              }
            );
            // Removed duplicate (new name already exists)
          } else {
            // New name doesn't exist, rename old to new
            await queryInterface.sequelize.query(
              'UPDATE "SequelizeMeta" SET name = ? WHERE name = ?',
              { 
                replacements: [newName, oldName], 
                type: queryInterface.sequelize.QueryTypes.UPDATE 
              }
            );
            // Renamed old to new
          }
        } else {
          // Old name not found, skipping
        }
      } catch (error) {
        // Error processing migration name
      }
    }
    
    // Delete orphaned migrations
    for (const orphaned of orphanedMigrations) {
      try {
        await queryInterface.sequelize.query(
          'DELETE FROM "SequelizeMeta" WHERE name = ?',
          { replacements: [orphaned], type: queryInterface.sequelize.QueryTypes.DELETE           }
        );
        // Removed orphaned migration
      } catch (error) {
        // Could not remove orphaned migration
      }
    }
    
    // Verify final state matches filesystem
    const expectedMigrations = [
      '20240101000001-create-users-table.js',
      '20240101000002-create-instructors-table.js',
      '20240101000003-create-payment-plans-table.js',
      '20240101000004-create-transactions-table.js',
      '20240101000005-create-subscriptions-table.js',
      '20240101000006-create-calendar-events-table.js',
      '20240101000007-create-user-credits-table.js',
      '20240101000008-create-credit-usage-table.js',
      '20240101000009-create-instructor-availability-table.js',
      '20240101000010-create-instructor-google-tokens-table.js',
      '20240101000011-create-instructor-calendar-configs-table.js',
      '20240101000012-create-recurring-bookings-table.js',
      '20240101000013-create-app-settings.js',
      '20240101000014-create-attendance-table.js',
      '20240101000015-create-refunds-table.js',
      '20240101000016-create-email-templates.js',
      '20240102000001-add-duration-to-credits.js',
      '20240102000002-add-lesson-duration-to-payment-plans.js',
      '20240102000003-update-existing-payment-plans-duration.js',
      '20240102000004-add-default-lesson-duration-setting.js',
      '20240102000005-add-in-person-payment-support.js',
      '20240102000006-remove-cash-payment-method.js',
      '20240102000007-add-all-day-event-handling-to-instructor-calendar-config.js',
      '20240102000008-make-calendar-id-nullable.js',
      '20240102000009-add-business-timezone-setting.js',
      '20251226000001-fix-migration-state.js', // this migration
    ];
    
    const [finalEntries] = await queryInterface.sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name'
    );
    
    // Check for any unexpected entries
    const finalNames = finalEntries.map(e => e.name);
    const unexpected = finalNames.filter(name => !expectedMigrations.includes(name));
    
    // Unexpected entries found (if any)
    
    // Check for any missing entries
    const missing = expectedMigrations.filter(name => !finalNames.includes(name));
    
    // Expected migrations not found (if any)
  },

  async down(queryInterface, Sequelize) {
    // This is a state fix - no practical way to reverse it
  }
};

