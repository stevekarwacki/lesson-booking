const cron = require('node-cron');
const emailService = require('./EmailService');
const emailQueueService = require('./EmailQueueService');
const { Credits } = require('../models/Credits');
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
            console.log('Initializing cron job service...');
            
            // Verify email service is working
            const emailConfigured = await emailService.verifyConnection();
            if (!emailConfigured) {
                console.warn('Email service not configured. Scheduled email jobs will be disabled.');
                return;
            }

            // Start scheduled jobs
            this.setupLowBalanceCheck();
            
            this.isInitialized = true;
            console.log('Cron job service initialized successfully');
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
        console.log('Low balance check scheduled for 9:00 AM daily');
    }

    async checkLowBalanceUsers() {
        console.log('Running low balance check...');
        
        try {
            // Get all users with the 'student' role
            const students = await User.findAll({
                where: { role: 'student' },
                attributes: ['id', 'name', 'email']
            });

            let emailsSent = 0;
            const lowBalanceThreshold = 2; // Send warning when 2 or fewer credits remain

            for (const student of students) {
                try {
                    const credits = await Credits.getUserCredits(student.id);
                    
                    // Check if user has low balance (2 or fewer credits)
                    if (credits.total_credits <= lowBalanceThreshold && credits.total_credits > 0) {
                        // TODO: Add logic to check if we've already sent a warning recently
                        // For now, we'll send every time the job runs
                        
                        try {
                            const emailJobId = await emailQueueService.queueLowBalanceWarning(
                                student.id, 
                                credits.total_credits
                            );
                            
                            emailsSent++;
                            console.log(`Low balance warning queued for ${student.email} (${credits.total_credits} credits remaining, Job ID: ${emailJobId})`);
                        } catch (error) {
                            console.error(`Failed to queue low balance warning for ${student.email}:`, error);
                        }
                    }
                } catch (error) {
                    console.error(`Error checking credits for user ${student.id}:`, error);
                }
            }

            console.log(`Low balance check completed. Emails queued: ${emailsSent}`);
        } catch (error) {
            console.error('Error during low balance check:', error);
        }
    }

    // Stop a specific job
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            console.log(`Stopped job: ${jobName}`);
        }
    }

    // Start a specific job
    startJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.start();
            console.log(`Started job: ${jobName}`);
        }
    }

    // Stop all jobs
    stopAll() {
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`Stopped job: ${name}`);
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
        console.log('Manually triggering low balance check...');
        await this.checkLowBalanceUsers();
    }
}

// Export singleton instance
const cronJobService = new CronJobService();
module.exports = cronJobService;
