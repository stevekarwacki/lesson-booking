const createAdminUser = require('./admin');
const createEmailTemplates = require('./email-templates');
const createDefaultAppSettings = require('./app-settings');

const runSeeds = async (models) => {
    try {
        // Run all seeds here - ORDER MATTERS!
        // 1. Admin user must be created first (needed for app_settings foreign keys)
        await createAdminUser(models);
        
        // 2. Create default app settings (needs admin user)
        await createDefaultAppSettings(models);
        
        // 3. Create email templates
        await createEmailTemplates(models);
    } catch (error) {
        console.error('Error running seeds:', error);
        throw error;
    }
};

module.exports = runSeeds;