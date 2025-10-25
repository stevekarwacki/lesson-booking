const createAdminUser = require('./admin');
const createEmailTemplates = require('./email-templates');

const runSeeds = async (models) => {
    try {
        // Run all seeds here
        await createAdminUser(models);
        await createEmailTemplates(models);
    } catch (error) {
        console.error('Error running seeds:', error);
        throw error;
    }
};

module.exports = runSeeds;