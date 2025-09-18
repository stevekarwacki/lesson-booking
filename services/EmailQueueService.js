const emailService = require('./EmailService');

class EmailQueueService {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
        this.maxQueueSize = 1000;
        this.rateLimitDelay = 1000; // 1 second between emails
    }

    /**
     * Add an email to the queue for asynchronous processing
     * This ensures emails don't block payment transactions
     */
    async queueEmail(emailType, data, priority = 'normal') {
        const emailJob = {
            id: Date.now() + Math.random(),
            type: emailType,
            data: data,
            priority: priority,
            attempts: 0,
            createdAt: new Date(),
            status: 'queued'
        };

        // Prevent queue overflow
        if (this.queue.length >= this.maxQueueSize) {
            console.warn('Email queue is full. Dropping oldest emails.');
            this.queue.shift();
        }

        // Add to queue based on priority
        if (priority === 'high') {
            this.queue.unshift(emailJob);
        } else {
            this.queue.push(emailJob);
        }

        console.log(`Email queued: ${emailType} (ID: ${emailJob.id})`);

        // Start processing if not already running
        if (!this.processing) {
            this.processQueue();
        }

        return emailJob.id;
    }

    /**
     * Process the email queue asynchronously
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        console.log(`Starting email queue processing. Queue size: ${this.queue.length}`);

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            
            try {
                await this.processEmailJob(job);
                
                // Rate limiting to respect Gmail limits
                if (this.queue.length > 0) {
                    await this.delay(this.rateLimitDelay);
                }
            } catch (error) {
                console.error(`Failed to process email job ${job.id}:`, error);
            }
        }

        this.processing = false;
        console.log('Email queue processing completed');
    }

    /**
     * Process a single email job with retry logic
     */
    async processEmailJob(job) {
        job.attempts++;
        job.status = 'processing';

        try {
            let result;

            switch (job.type) {
                case 'purchase_confirmation':
                    result = await emailService.sendPurchaseConfirmation(
                        job.data.userId,
                        job.data.planDetails,
                        job.data.transactionDetails
                    );
                    break;

                case 'low_balance_warning':
                    result = await emailService.sendLowBalanceWarning(
                        job.data.userId,
                        job.data.creditsRemaining
                    );
                    break;

                case 'booking_confirmation':
                    result = await emailService.sendBookingConfirmation(
                        job.data.bookingData,
                        job.data.paymentMethod
                    );
                    break;

                case 'rescheduling_confirmation':
                    result = await emailService.sendReschedulingConfirmation(
                        job.data.oldBooking,
                        job.data.newBooking,
                        job.data.recipientType
                    );
                    break;

                default:
                    throw new Error(`Unknown email type: ${job.type}`);
            }

            if (result.success) {
                job.status = 'completed';
                console.log(`Email job ${job.id} completed successfully`);
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`Email job ${job.id} failed (attempt ${job.attempts}):`, error.message);
            
            // Retry logic
            if (job.attempts < this.retryAttempts) {
                job.status = 'retrying';
                console.log(`Retrying email job ${job.id} in ${this.retryDelay}ms`);
                
                // Add back to queue for retry after delay
                setTimeout(() => {
                    this.queue.unshift(job);
                    if (!this.processing) {
                        this.processQueue();
                    }
                }, this.retryDelay);
            } else {
                job.status = 'failed';
                console.error(`Email job ${job.id} permanently failed after ${job.attempts} attempts`);
                
                // TODO: Could store failed jobs in database for manual review
                this.handleFailedEmail(job, error);
            }
        }
    }

    /**
     * Handle permanently failed emails
     */
    handleFailedEmail(job, error) {
        // For now, just log. In the future, could:
        // - Store in database for admin review
        // - Send to dead letter queue
        // - Alert administrators
        console.error('FAILED EMAIL JOB:', {
            id: job.id,
            type: job.type,
            userId: job.data.userId,
            error: error.message,
            attempts: job.attempts,
            createdAt: job.createdAt
        });
    }

    /**
     * Utility method for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Queue a purchase confirmation email
     */
    async queuePurchaseConfirmation(userId, planDetails, transactionDetails) {
        return this.queueEmail('purchase_confirmation', {
            userId,
            planDetails,
            transactionDetails
        }, 'high'); // High priority for purchase confirmations
    }

    /**
     * Queue a low balance warning email
     */
    async queueLowBalanceWarning(userId, creditsRemaining) {
        return this.queueEmail('low_balance_warning', {
            userId,
            creditsRemaining
        }, 'normal');
    }

    /**
     * Queue a booking confirmation email
     */
    async queueBookingConfirmation(bookingData, paymentMethod = 'credits') {
        return this.queueEmail('booking_confirmation', {
            bookingData,
            paymentMethod
        }, 'high'); // High priority for booking confirmations
    }

    /**
     * Queue rescheduling confirmation emails for both student and instructor
     */
    async queueReschedulingConfirmations(oldBooking, newBooking) {
        const jobIds = [];

        // Queue email for student
        const studentJobId = await this.queueEmail('rescheduling_confirmation', {
            oldBooking,
            newBooking,
            recipientType: 'student'
        }, 'high'); // High priority for rescheduling notifications
        
        jobIds.push({ recipient: 'student', jobId: studentJobId });

        // Queue email for instructor
        const instructorJobId = await this.queueEmail('rescheduling_confirmation', {
            oldBooking,
            newBooking,
            recipientType: 'instructor'
        }, 'high'); // High priority for rescheduling notifications
        
        jobIds.push({ recipient: 'instructor', jobId: instructorJobId });

        return jobIds;
    }

    /**
     * Get queue status for monitoring
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            maxQueueSize: this.maxQueueSize,
            retryAttempts: this.retryAttempts
        };
    }

    /**
     * Clear the queue (for shutdown or emergencies)
     */
    clearQueue() {
        const clearedCount = this.queue.length;
        this.queue = [];
        this.processing = false;
        console.log(`Cleared ${clearedCount} emails from queue`);
        return clearedCount;
    }
}

// Export singleton instance
const emailQueueService = new EmailQueueService();
module.exports = emailQueueService;
