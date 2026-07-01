require('dotenv').config();
const ViteExpress = require('vite-express');
const path = require('path');
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

ViteExpress.config({
    distDir: path.join(__dirname, 'frontend/dist'),
    viteConfigFile: path.join(__dirname, 'frontend/vite.config.js'),
});

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
        
        ViteExpress.listen(app, port, () => {
            logger.server(`Server is running on http://localhost:${port}`);
            // Signal PM2 that the process is fully ready (used by wait_ready: true
            // in ecosystem.config.js). Without this, PM2 reload considers the
            // process started after listen_timeout ms, which means the smoke test
            // could begin before the port is actually bound.
            if (process.send) {
                process.send('ready');
            }
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