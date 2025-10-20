require('dotenv').config();
const { app } = require('./app');
const { initModels } = require('./models');
const { AppSettings } = require('./models/AppSettings');
const { initializeStorage } = require('./storage/index');
const cronJobService = require('./services/CronJobService');
const logger = require('./utils/logger');

const port = process.env.PORT || 3000;

// Initialize models and start server
const startServer = async () => {
    try {
        await initModels();
        
        // Initialize storage system with AppSettings for configuration
        await initializeStorage({ appSettings: AppSettings });
        
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