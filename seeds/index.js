const createAdminUser = require('./admin');

const runSeeds = async (models) => {
    try {
        // Run all seeds here
        await createAdminUser(models);
    } catch (error) {
        console.error('Error running seeds:', error);
        throw error;
    }
};

module.exports = runSeeds; 