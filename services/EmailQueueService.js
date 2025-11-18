const emailService = require('./EmailService');

// Module-level state
let queue = [];
let processing = false;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds
const MAX_QUEUE_SIZE = 1000;
const RATE_LIMIT_DELAY = 1000; // 1 second between emails

/**
 * Utility method for delays
 */
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Add an email to the queue for asynchronous processing
 * This ensures emails don't block payment transactions
 */
const queueEmail = async (emailType, data, priority = 'normal') => {
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
    if (queue.length >= MAX_QUEUE_SIZE) {
        console.warn('Email queue is full. Dropping oldest emails.');
        queue.shift();
    }

    // Add to queue based on priority
    if (priority === 'high') {
        queue.unshift(emailJob);
    } else {
        queue.push(emailJob);
    }

    // Start processing if not already running
    if (!processing) {
        processQueue();
    }

    return emailJob.id;
};

/**
 * Handle permanently failed emails
 */
const handleFailedEmail = (job, error) => {
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
};

/**
 * Process the email queue asynchronously
 */
const processQueue = async () => {
    if (processing || queue.length === 0) {
        return;
    }

    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();
        
        try {
            await processEmailJob(job);
            
            // Rate limiting to respect Gmail limits
            if (queue.length > 0) {
                await delay(RATE_LIMIT_DELAY);
            }
        } catch (error) {
            console.error(`Failed to process email job ${job.id}:`, error);
        }
    }

    processing = false;
};

/**
 * Process a single email job with retry logic
 */
const processEmailJob = async (job) => {
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

            case 'credits_exhausted':
                result = await emailService.sendCreditsExhausted(
                    job.data.userId,
                    job.data.totalLessonsCompleted
                );
                break;

            default:
                throw new Error(`Unknown email type: ${job.type}`);
        }

        if (result.success) {
            job.status = 'completed';
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error(`Email job ${job.id} failed (attempt ${job.attempts}):`, error.message);
        
        // Retry logic
        if (job.attempts < RETRY_ATTEMPTS) {
            job.status = 'retrying';
            
            // Add back to queue for retry after delay
            setTimeout(() => {
                queue.unshift(job);
                if (!processing) {
                    processQueue();
                }
            }, RETRY_DELAY);
        } else {
            job.status = 'failed';
            console.error(`Email job ${job.id} permanently failed after ${job.attempts} attempts`);
            
            // TODO: Could store failed jobs in database for manual review
            handleFailedEmail(job, error);
        }
    }
};

/**
 * Queue a purchase confirmation email
 */
const queuePurchaseConfirmation = async (userId, planDetails, transactionDetails) => {
    return queueEmail('purchase_confirmation', {
        userId,
        planDetails,
        transactionDetails
    }, 'high'); // High priority for purchase confirmations
};

/**
 * Queue a low balance warning email
 */
const queueLowBalanceWarning = async (userId, creditsRemaining) => {
    return queueEmail('low_balance_warning', {
        userId,
        creditsRemaining
    }, 'normal');
};

/**
 * Queue a credits exhausted email
 */
const queueCreditsExhausted = async (userId, totalLessonsCompleted = 0) => {
    return queueEmail('credits_exhausted', {
        userId,
        totalLessonsCompleted
    }, 'high'); // High priority since user can't book without credits
};

/**
 * Queue a booking confirmation email
 */
const queueBookingConfirmation = async (bookingData, paymentMethod = 'credits') => {
    return queueEmail('booking_confirmation', {
        bookingData,
        paymentMethod
    }, 'high'); // High priority for booking confirmations
};

/**
 * Queue rescheduling confirmation emails for both student and instructor
 */
const queueReschedulingConfirmations = async (oldBooking, newBooking) => {
    const jobIds = [];

    // Queue email for student
    const studentJobId = await queueEmail('rescheduling_confirmation', {
        oldBooking,
        newBooking,
        recipientType: 'student'
    }, 'high'); // High priority for rescheduling notifications
    
    jobIds.push({ recipient: 'student', jobId: studentJobId });

    // Queue email for instructor
    const instructorJobId = await queueEmail('rescheduling_confirmation', {
        oldBooking,
        newBooking,
        recipientType: 'instructor'
    }, 'high'); // High priority for rescheduling notifications
    
    jobIds.push({ recipient: 'instructor', jobId: instructorJobId });

    return jobIds;
};

/**
 * Get queue status for monitoring
 */
const getStatus = () => {
    return {
        queueSize: queue.length,
        processing: processing,
        maxQueueSize: MAX_QUEUE_SIZE,
        retryAttempts: RETRY_ATTEMPTS
    };
};

/**
 * Clear the queue (for shutdown or emergencies)
 */
const clearQueue = () => {
    const clearedCount = queue.length;
    queue = [];
    processing = false;
    return clearedCount;
};

module.exports = {
    queueEmail,
    queuePurchaseConfirmation,
    queueLowBalanceWarning,
    queueCreditsExhausted,
    queueBookingConfirmation,
    queueReschedulingConfirmations,
    getStatus,
    clearQueue
};
