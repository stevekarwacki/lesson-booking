require('dotenv').config();
const { app } = require('./app');
const { initModels } = require('./models');
const { AppSettings } = require('./models/AppSettings');
const { initializeStorage } = require('./storage/index');
const cronJobService = require('./services/CronJobService');
const { initializeProviders } = require('./services/EmailService');
const logger = require('./utils/logger');
const config = require('./config');
const { ensureConstantsLoaded } = require('./utils/constants');

const port = config.server.port;

// Initialize models and start server
const startServer = async () => {
    try {
        // Load isomorphic constants from @common/
        await ensureConstantsLoaded();
        
        await initModels();
        
        // Initialize storage system with AppSettings for configuration
        await initializeStorage({ appSettings: AppSettings });
        
        // Initialize email providers AFTER database is ready
        // This prevents race condition where nodemailerProvider tries to query DB before it's ready
        await initializeProviders();
        
        // Initialize scheduled email jobs
        await cronJobService.initialize();
        
        app.listen(port, () => {
            logger.server(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    try {
        logger.server('Shutting down gracefully...');
        
        // Stop all cron jobs
        cronJobService.stopAll();
        
        // Close database connection
        const { sequelize } = require('./models');
        await sequelize.close();
        
        logger.server('Server shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}); 