const cron = require('node-cron');
const emailService = require('./EmailService');
const emailQueueService = require('./EmailQueueService');
const { checkUserCreditsStatus } = require('../utils/creditNotifications');
const { User } = require('../models/User');

class CronJobService {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
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

            // Start scheduled jobs
            this.setupLowBalanceCheck();
            
            this.isInitialized = true;
            // Cron job service initialized successfully
        } catch (error) {
            console.error('Failed to initialize cron job service:', error);
        }
    }

    setupLowBalanceCheck() {
        // Run every day at 9:00 AM
        const job = cron.schedule('0 9 * * *', async () => {
            await this.checkLowBalanceUsers();
        }, {
            scheduled: false, // Don't start automatically
            timezone: process.env.TIMEZONE || 'UTC'
        });

        this.jobs.set('lowBalanceCheck', job);
        
        // Start the job
        job.start();
        // Low balance check scheduled for 9:00 AM daily
    }

    async checkLowBalanceUsers() {
        // Running low balance check
        
        // NOTE: Credit monitoring is now handled real-time during booking
        // This cron job is kept for future use (maybe monthly summaries, etc.)
        // but no longer sends credit warnings to prevent spam
        
        // Credit monitoring is handled real-time during booking. Cron job disabled for credits
        // Low balance check completed (no action taken)
    }

    // Stop a specific job
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            // Stopped job
        }
    }

    // Start a specific job
    startJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.start();
            // Started job
        }
    }

    // Stop all jobs
    stopAll() {
        this.jobs.forEach((job, name) => {
            job.stop();
            // Stopped job
        });
        this.isInitialized = false;
    }

    // Get status of all jobs
    getStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running,
                scheduled: job.scheduled
            };
        });
        return status;
    }

    // Manual trigger for testing
    async runLowBalanceCheck() {
        // Manually triggering low balance check
        await this.checkLowBalanceUsers();
    }
}

// Export singleton instance
const cronJobService = new CronJobService();
module.exports = cronJobService;
