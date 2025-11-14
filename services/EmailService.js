const { default: ical } = require('ical-generator');
const { User } = require('../models/User');
const logger = require('../utils/logger');
const { fromString } = require('../utils/dateHelpers');
const { selectProvider } = require('./email/emailConfig');
const config = require('../config');
const {
    generatePurchaseConfirmationHTML,
    generateLowBalanceHTML,
    generateCreditsExhaustedHTML,
    generateBookingConfirmationHTML,
    generateReschedulingHTML,
    generateAbsenceNotificationHTML,
    getTemplateSubject
} = require('../utils/emailTemplates');

class EmailService {
    constructor() {
        // Initialize and check provider configurations
        this.initializeProviders();
    }

    /**
     * Initialize providers and handle centralized logging
     */
    async initializeProviders() {
        const nodemailerProvider = require('./email/nodemailerProvider');
        const gmailProvider = require('./email/gmailProvider');
        
        // Only wait for async providers if they might be configured
        // Gmail requires async initialization to check API availability
        if (config.features.oauthEmail) {
            await gmailProvider.initializationPromise;
        }
        
        const nodemailerStatus = nodemailerProvider.getConfigurationStatus();
        const gmailStatus = gmailProvider.getConfigurationStatus();
        
        const configuredProviders = [];
        const failedProviders = [];
        
        if (nodemailerStatus.configured) {
            configuredProviders.push('Nodemailer');
        } else {
            failedProviders.push(`Nodemailer: ${nodemailerStatus.message}`);
        }
        
        if (gmailStatus.configured) {
            configuredProviders.push('Gmail API');
        } else {
            failedProviders.push(`Gmail: ${gmailStatus.message}`);
        }
        
        // Log results
        if (configuredProviders.length > 0) {
            logger.email(`Email service initialized with providers: ${configuredProviders.join(', ')}`);
            
            if (failedProviders.length > 0) {
                logger.email(`Additional providers not configured: ${failedProviders.join('; ')}`);
            }
        } else {
            console.warn('Email service not configured. No email providers are available.');
            console.warn(`Configuration issues: ${failedProviders.join('; ')}`);
        }
    }

    /**
     * Core send method using provider selection
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} htmlContent - HTML email body
     * @param {Object} options - Options including instructorId for provider selection
     * @returns {Promise<Object>} Send result
     */
    async sendEmail(to, subject, htmlContent, options = {}) {
        const provider = selectProvider(options);
        const result = await provider.send(to, subject, htmlContent, options);
        
        if (result.success) {
            logger.email(`Email sent successfully via ${result.provider}`, { 
                to, 
                messageId: result.messageId 
            });
        } else {
            logger.email(`Email failed via ${result.provider}`, { 
                to, 
                error: result.error 
            });
        }
        
        return result;
    }

    /**
     * Core send method with attachment using provider selection
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} htmlContent - HTML email body
     * @param {Object} attachment - Attachment object
     * @param {Object} options - Options including instructorId for provider selection
     * @returns {Promise<Object>} Send result
     */
    async sendEmailWithAttachment(to, subject, htmlContent, attachment, options = {}) {
        const provider = selectProvider(options);
        const result = await provider.sendWithAttachment(to, subject, htmlContent, attachment, options);
        
        if (result.success) {
            logger.email(`Email with attachment sent successfully via ${result.provider}`, { 
                to, 
                messageId: result.messageId 
            });
        } else {
            logger.email(`Email with attachment failed via ${result.provider}`, { 
                to, 
                error: result.error 
            });
        }
        
        return result;
    }

    /**
     * Check if email service is available (any provider)
     * Used by CronJobService to determine if scheduled emails can be sent
     */
    async verifyConnection() {
        const nodemailerProvider = require('./email/nodemailerProvider');
        const gmailProvider = require('./email/gmailProvider');
        
        // Check if either provider is properly configured
        const nodemailerAvailable = nodemailerProvider.isAvailable();
        const gmailAvailable = gmailProvider.isAvailable();
        
        return nodemailerAvailable || gmailAvailable;
    }

    // Business logic methods using the new provider system

    /**
     * Helper method to get business settings with logo URL
     * @private
     */
    async getBusinessSettingsWithLogo() {
        const { AppSettings } = require('../models/AppSettings');
        const businessSettings = await AppSettings.getSettingsByCategory('business');
        
        // Get logo from branding category
        const logoFilename = await AppSettings.getSetting('branding', 'logo_url');
        
        // Construct absolute URL for logo using base_url from business settings
        let logoUrl = null;
        if (logoFilename && businessSettings.base_url) {
            // Remove trailing slash from base_url if present
            const baseUrl = businessSettings.base_url.replace(/\/$/, '');
            logoUrl = `${baseUrl}/api/assets/logo`;
        }
        
        // Add logo URL to business settings
        businessSettings.logo_url = logoUrl;
        
        return businessSettings;
    }

    /**
     * Send purchase confirmation email (system email - always uses nodemailer)
     */
    async sendPurchaseConfirmation(userId, planDetails, transactionDetails) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const subject = await getTemplateSubject('purchase-confirmation', 'Purchase Confirmation - Lesson Credits');
            const htmlContent = await generatePurchaseConfirmationHTML(user, planDetails, transactionDetails, businessSettings);

            // No instructorId = uses nodemailer provider (system email)
            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send purchase confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send low balance warning email (system email - always uses nodemailer)
     */
    async sendLowBalanceWarning(userId, creditsRemaining) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const subject = await getTemplateSubject('low-balance-warning', 'Lesson Credits Running Low');
            const htmlContent = await generateLowBalanceHTML(user, creditsRemaining, businessSettings);

            // No instructorId = uses nodemailer provider (system email)
            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send low balance warning:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send rescheduling confirmation email (instructor email - uses provider selection)
     */
    async sendReschedulingConfirmation(oldBooking, newBooking, recipientType = 'student') {
        try {
            if (!oldBooking || !newBooking) {
                throw new Error('Both old and new booking data required');
            }

            const isForStudent = recipientType === 'student';
            const recipient = isForStudent ? newBooking.student : newBooking.Instructor?.User;
            
            if (!recipient || !recipient.email) {
                throw new Error(`${recipientType} email not found in booking data`);
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const templateKey = isForStudent ? 'rescheduling-student' : 'rescheduling-instructor';
            const defaultSubject = `Lesson Rescheduled - ${isForStudent ? 'Updated' : 'Student Updated'} Booking`;
            const subject = await getTemplateSubject(templateKey, defaultSubject);
            const htmlContent = await generateReschedulingHTML(oldBooking, newBooking, recipientType, businessSettings);
            
            // Generate updated calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(newBooking);

            // Get instructor ID for provider selection (Gmail API if available)
            const instructorId = newBooking.Instructor?.id || newBooking.instructor_id;

            return await this.sendEmailWithAttachment(
                recipient.email,
                subject,
                htmlContent,
                calendarAttachment,
                { instructorId }
            );
        } catch (error) {
            console.error('Failed to send rescheduling confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send credits exhausted email (system email - always uses nodemailer)
     */
    async sendCreditsExhausted(userId, totalLessonsCompleted = 0) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const subject = await getTemplateSubject('credits-exhausted', 'All Lesson Credits Used - Time to Restock!');
            const htmlContent = await generateCreditsExhaustedHTML(user, totalLessonsCompleted, businessSettings);

            // No instructorId = uses nodemailer provider (system email)
            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send credits exhausted email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send booking confirmation email (instructor email - uses provider selection)
     */
    async sendBookingConfirmation(bookingData, paymentMethod = 'credits') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const subject = await getTemplateSubject('booking-confirmation', 'Lesson Booking Confirmed');
            const htmlContent = await generateBookingConfirmationHTML(bookingData, paymentMethod, businessSettings);
            
            // Generate calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(bookingData);

            // Get instructor ID for provider selection (Gmail API if available)
            const instructorId = bookingData.Instructor?.id || bookingData.instructor_id;

            return await this.sendEmailWithAttachment(
                bookingData.student.email,
                subject,
                htmlContent,
                calendarAttachment,
                { instructorId }
            );
        } catch (error) {
            console.error('Failed to send booking confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send absence notification email (system email - always uses nodemailer)
     */
    async sendAbsenceNotification(bookingData, attendanceNotes = '') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            // Get business settings with logo
            const businessSettings = await this.getBusinessSettingsWithLogo();
            
            const subject = await getTemplateSubject('absence-notification', 'Lesson Update - Book Your Next Session');
            const htmlContent = await generateAbsenceNotificationHTML(bookingData, attendanceNotes, businessSettings);

            // No instructorId = uses nodemailer provider (system email)
            return await this.sendEmail(bookingData.student.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send absence notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate calendar attachment for booking
     * Utility method kept from original EmailService
     */
    generateCalendarAttachment(booking) {
        try {
            // Convert slot to actual datetime using date helpers
            const startHour = Math.floor(booking.start_slot / 4);
            const startMinute = (booking.start_slot % 4) * 15;
            
            // Create start datetime using date helpers for proper timezone handling
            const bookingDateHelper = fromString(booking.date);
            const startDateTime = bookingDateHelper.addHours(startHour).addMinutes(startMinute);
            const endDateTime = startDateTime.addMinutes(booking.duration * 15);
            
            const startDate = startDateTime.toDate();
            const endDate = endDateTime.toDate();
            
            const instructorName = booking.Instructor?.User?.name || 'Your Instructor';
            const studentName = booking.student?.name || 'Student';
            
            // Create calendar
            const calendar = ical({
                name: 'Lesson Booking',
                prodId: {
                    company: process.env.EMAIL_FROM_NAME || 'Lesson Booking',
                    product: 'Booking System'
                }
            });

            // Add the lesson event
            calendar.createEvent({
                start: startDate,
                end: endDate,
                summary: `Lesson with ${instructorName}`,
                description: `Lesson booking confirmation for ${studentName}\n\nBooking ID: #${booking.id}\nDuration: ${booking.duration * 15} minutes\n\nWe look forward to your lesson!`,
                organizer: {
                    name: instructorName,
                    email: process.env.EMAIL_USER
                },
                attendees: [
                    {
                        name: studentName,
                        email: booking.student.email,
                        role: 'REQ-PARTICIPANT',
                        status: 'ACCEPTED'
                    }
                ],
                uid: `booking-${booking.id}@${process.env.EMAIL_USER?.split('@')[1] || 'lessonbooking.com'}`,
                sequence: 0,
                busyStatus: 'BUSY',
                created: new Date(),
                lastModified: new Date()
            });

            // Return attachment object for providers
            return {
                filename: `lesson-${booking.id}.ics`,
                content: calendar.toString(),
                contentType: 'text/calendar; charset=utf-8; method=REQUEST'
            };
        } catch (error) {
            console.error('Error generating calendar attachment:', error);
            return null; // Return null if calendar generation fails
        }
    }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
