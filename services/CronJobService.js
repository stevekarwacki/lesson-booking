const cron = require('node-cron');
const emailService = require('./EmailService');

// Module-level state
const jobs = new Map();
let isInitialized = false;

const initialize = async () => {
    if (isInitialized) {
        return;
    }

    try {
        // Initializing cron job service
        
        // Verify email service is working
        const emailConfigured = await emailService.verifyConnection();
        if (!emailConfigured) {
            console.warn('Email service not configured. Scheduled email jobs will be disabled.');
            return;
        }


        
        isInitialized = true;
        // Cron job service initialized successfully
    } catch (error) {
        console.error('Failed to initialize cron job service:', error);
    }
};

// Stop a specific job
const stopJob = (jobName) => {
    const job = jobs.get(jobName);
    if (job) {
        job.stop();
        // Stopped job
    }
};

// Start a specific job
const startJob = (jobName) => {
    const job = jobs.get(jobName);
    if (job) {
        job.start();
        // Started job
    }
};

// Stop all jobs
const stopAll = () => {
    jobs.forEach((job, name) => {
        job.stop();
        // Stopped job
    });
    isInitialized = false;
};

// Get status of all jobs
const getStatus = () => {
    const status = {};
    jobs.forEach((job, name) => {
        status[name] = {
            running: job.running,
            scheduled: job.scheduled
        };
    });
    return status;
};

module.exports = {
    initialize,
    stopJob,
    startJob,
    stopAll,
    getStatus
};
