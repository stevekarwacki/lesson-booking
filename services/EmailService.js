const nodemailer = require('nodemailer');
const { default: ical } = require('ical-generator');
const { User } = require('../models/User');
const logger = require('../utils/logger');
const { fromString, createDateHelper } = require('../utils/dateHelpers');
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
        this.transporter = null;
        this.isConfigured = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            // Check if email configuration is available
            if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
                console.warn('Email service not configured. EMAIL_USER and EMAIL_APP_PASSWORD environment variables are required.');
                return;
            }

            this.transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true, // use SSL
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD
                }
            });

            this.isConfigured = true;
            logger.email('Email service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize email service:', error);
            this.isConfigured = false;
        }
    }

    async verifyConnection() {
        if (!this.isConfigured) {
            return false;
        }

        try {
            await this.transporter.verify();
            logger.email('Email service connection verified');
            return true;
        } catch (error) {
            console.error('Email service connection failed:', error);
            return false;
        }
    }

    async sendEmail(to, subject, htmlContent, textContent = null) {
        if (!this.isConfigured) {
            console.warn('Email service not configured. Skipping email send.');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'Lesson Booking'}" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.htmlToText(htmlContent)
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.email('Email sent successfully', { messageId: info.messageId });
            
            return { 
                success: true, 
                messageId: info.messageId,
                response: info.response 
            };
        } catch (error) {
            console.error('Failed to send email:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async sendEmailWithAttachment(to, subject, htmlContent, attachment = null, textContent = null) {
        if (!this.isConfigured) {
            console.warn('Email service not configured. Skipping email send.');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'Lesson Booking'}" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.htmlToText(htmlContent)
            };

            // Add attachment if provided
            if (attachment) {
                mailOptions.attachments = [attachment];
            }

            const info = await this.transporter.sendMail(mailOptions);
            logger.email('Email with attachment sent successfully', { messageId: info.messageId });
            
            return { 
                success: true, 
                messageId: info.messageId,
                response: info.response 
            };
        } catch (error) {
            console.error('Failed to send email with attachment:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Convert HTML to basic text (simple fallback)
    htmlToText(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    // Purchase confirmation email
    async sendPurchaseConfirmation(userId, planDetails, transactionDetails) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            // Get subject from database template, fallback to default
            const subject = await getTemplateSubject('purchase-confirmation', 'Purchase Confirmation - Lesson Credits');
            const htmlContent = await generatePurchaseConfirmationHTML(user, planDetails, transactionDetails, businessSettings);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send purchase confirmation:', error);
            return { success: false, error: error.message };
        }
    }


    // Low balance warning email (for future use with cron jobs)
    async sendLowBalanceWarning(userId, creditsRemaining) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            const subject = await getTemplateSubject('low-balance-warning', 'Lesson Credits Running Low');
            const htmlContent = await generateLowBalanceHTML(user, creditsRemaining, businessSettings);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send low balance warning:', error);
            return { success: false, error: error.message };
        }
    }

    // Lesson rescheduling confirmation emails
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

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            const templateKey = isForStudent ? 'rescheduling-student' : 'rescheduling-instructor';
            const defaultSubject = `Lesson Rescheduled - ${isForStudent ? 'Updated' : 'Student Updated'} Booking`;
            const subject = await getTemplateSubject(templateKey, defaultSubject);
            const htmlContent = await generateReschedulingHTML(oldBooking, newBooking, recipientType, businessSettings);
            
            // Generate updated calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(newBooking);

            const instructorId = newBooking.Instructor?.id || newBooking.instructor_id;

            return await this.sendEmailSmart(
                recipient.email,
                subject,
                htmlContent,
                {
                    instructorId: instructorId,  // Enable Gmail API if available
                    attachment: calendarAttachment
                }
            );
        } catch (error) {
            console.error('Failed to send rescheduling confirmation:', error);
            return { success: false, error: error.message };
        }
    }


    // Credits exhausted email
    async sendCreditsExhausted(userId, totalLessonsCompleted = 0) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            const subject = await getTemplateSubject('credits-exhausted', 'All Lesson Credits Used - Time to Restock!');
            const htmlContent = await generateCreditsExhaustedHTML(user, totalLessonsCompleted, businessSettings);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send credits exhausted email:', error);
            return { success: false, error: error.message };
        }
    }


    // Lesson booking confirmation email
    async sendBookingConfirmation(bookingData, paymentMethod = 'credits') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            const subject = await getTemplateSubject('booking-confirmation', 'Lesson Booking Confirmed');
            const htmlContent = await generateBookingConfirmationHTML(bookingData, paymentMethod, businessSettings);
            
            // Generate calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(bookingData);

            // Get instructor ID for Gmail API
            const instructorId = bookingData.Instructor?.id || bookingData.instructor_id;

            return await this.sendEmailSmart(
                bookingData.student.email,
                subject,
                htmlContent,
                {
                    instructorId: instructorId,  // Enable Gmail API if available
                    attachment: calendarAttachment
                }
            );
        } catch (error) {
            console.error('Failed to send booking confirmation:', error);
            return { success: false, error: error.message };
        }
    }



    // Absence notification email
    async sendAbsenceNotification(bookingData, attendanceNotes = '') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            // Get business settings
            const { AppSettings } = require('../models/AppSettings');
            const businessSettings = await AppSettings.getSettingsByCategory('business');
            
            const subject = await getTemplateSubject('absence-notification', 'Lesson Update - Book Your Next Session');
            const htmlContent = await generateAbsenceNotificationHTML(bookingData, attendanceNotes, businessSettings);

            return await this.sendEmail(bookingData.student.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send absence notification:', error);
            return { success: false, error: error.message };
        }
    }


    // Generate calendar attachment for booking
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

            // Return attachment object for nodemailer
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
