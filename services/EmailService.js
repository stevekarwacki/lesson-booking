const nodemailer = require('nodemailer');
const { default: ical } = require('ical-generator');
const { User } = require('../models/User');

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
            console.log('Email service initialized successfully');
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
            console.log('Email service connection verified');
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
            console.log('Email sent successfully:', info.messageId);
            
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
            console.log('Email with attachment sent successfully:', info.messageId);
            
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

            const subject = 'Purchase Confirmation - Lesson Credits';
            const htmlContent = this.generatePurchaseConfirmationHTML(user, planDetails, transactionDetails);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send purchase confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    generatePurchaseConfirmationHTML(user, planDetails, transactionDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .purchase-details { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .amount { font-size: 24px; font-weight: bold; color: #28a745; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Your Purchase!</h1>
                </div>
                
                <div class="content">
                    <p>Hello ${user.name},</p>
                    
                    <p>We're excited to confirm your recent purchase. Your lesson credits have been successfully added to your account!</p>
                    
                    <div class="purchase-details">
                        <h3>Purchase Details:</h3>
                        <p><strong>Plan:</strong> ${planDetails.name}</p>
                        <p><strong>Credits Added:</strong> ${planDetails.credits} lessons</p>
                        <p><strong>Amount Paid:</strong> <span class="amount">$${transactionDetails.amount}</span></p>
                        <p><strong>Payment Method:</strong> ${transactionDetails.payment_method}</p>
                        <p><strong>Transaction Date:</strong> ${new Date().toLocaleDateString()}</p>
                        ${transactionDetails.payment_intent_id ? `<p><strong>Transaction ID:</strong> ${transactionDetails.payment_intent_id}</p>` : ''}
                    </div>
                    
                    <p>You can now use these credits to book lessons through your account dashboard.</p>
                    
                    <p>If you have any questions about your purchase or need assistance booking lessons, please don't hesitate to contact us.</p>
                    
                    <p>Thank you for choosing our lesson booking service!</p>
                    
                    <p>Best regards,<br>The Lesson Booking Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated confirmation email. Please do not reply to this message.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Low balance warning email (for future use with cron jobs)
    async sendLowBalanceWarning(userId, creditsRemaining) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const subject = 'Lesson Credits Running Low';
            const htmlContent = this.generateLowBalanceHTML(user, creditsRemaining);

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

            const subject = `Lesson Rescheduled - ${isForStudent ? 'Updated' : 'Student Updated'} Booking`;
            const htmlContent = this.generateReschedulingHTML(oldBooking, newBooking, recipientType);
            
            // Generate updated calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(newBooking);

            return await this.sendEmailWithAttachment(
                recipient.email, 
                subject, 
                htmlContent,
                calendarAttachment
            );
        } catch (error) {
            console.error('Failed to send rescheduling confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    generateLowBalanceHTML(user, creditsRemaining) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #fff3cd; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .warning { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .credits-remaining { font-size: 24px; font-weight: bold; color: #dc3545; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Lesson Credits Are Running Low</h1>
                </div>
                
                <div class="content">
                    <p>Hello ${user.name},</p>
                    
                    <div class="warning">
                        <p><strong>You have <span class="credits-remaining">${creditsRemaining}</span> lesson credits remaining.</strong></p>
                    </div>
                    
                    <p>To ensure you can continue booking lessons without interruption, we recommend purchasing additional credits soon.</p>
                    
                    <p>You can easily add more credits by logging into your account and visiting the payment plans section.</p>
                    
                    <p>Thank you for being a valued student!</p>
                    
                    <p>Best regards,<br>The Lesson Booking Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated reminder email.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Lesson booking confirmation email
    async sendBookingConfirmation(bookingData, paymentMethod = 'credits') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            const subject = 'Lesson Booking Confirmed';
            const htmlContent = this.generateBookingConfirmationHTML(bookingData, paymentMethod);
            
            // Generate calendar attachment
            const calendarAttachment = this.generateCalendarAttachment(bookingData);

            return await this.sendEmailWithAttachment(
                bookingData.student.email, 
                subject, 
                htmlContent,
                calendarAttachment
            );
        } catch (error) {
            console.error('Failed to send booking confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    generateBookingConfirmationHTML(booking, paymentMethod) {
        // Convert slot to readable time using UTC slots (0 = 00:00 UTC)
        const startHour = Math.floor(booking.start_slot / 4);
        const startMinute = (booking.start_slot % 4) * 15;
        const endSlot = booking.start_slot + booking.duration;
        const endHour = Math.floor(endSlot / 4);
        const endMinute = (endSlot % 4) * 15;

        const formatTime = (hour, minute) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        };

        const startTime = formatTime(startHour, startMinute);
        const endTime = formatTime(endHour, endMinute);
        const lessonDate = new Date(booking.date + 'T00:00:00Z').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });

        const paymentDisplay = paymentMethod === 'credits' ? 'Lesson Credits' : 'Credit Card';
        const instructorName = booking.Instructor?.User?.name || 'Your Instructor';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #e8f5e8; padding: 20px; text-align: center; border-radius: 8px; }
                .content { padding: 20px 0; }
                .booking-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; }
                .detail-row { margin: 10px 0; }
                .detail-label { font-weight: bold; color: #555; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .lesson-time { font-size: 18px; font-weight: bold; color: #28a745; }
                .payment-method { background-color: #e9ecef; padding: 8px 12px; border-radius: 4px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Lesson Booked Successfully!</h1>
                </div>
                
                <div class="content">
                    <p>Hello ${booking.student.name},</p>
                    
                    <p>Great news! Your lesson has been confirmed. Here are the details:</p>
                    
                    <div class="booking-details">
                        <h3>📚 Lesson Details</h3>
                        
                        <div class="detail-row">
                            <span class="detail-label">Date:</span> ${lessonDate}
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Time:</span> 
                            <span class="lesson-time">${startTime} - ${endTime}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Instructor:</span> ${instructorName}
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Duration:</span> ${booking.duration * 15} minutes
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Payment Method:</span> 
                            <span class="payment-method">${paymentDisplay}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="detail-label">Booking ID:</span> #${booking.id}
                        </div>
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>📅 <strong>Add to Calendar:</strong> Click the attached calendar file (.ics) to automatically add this lesson to your calendar</li>
                        <li>📝 Prepare any materials you'd like to work on</li>
                        <li>💬 Contact your instructor if you have any questions</li>
                    </ul>
                    
                    <p>We're excited for your upcoming lesson!</p>
                    
                    <p>Best regards,<br>The Lesson Booking Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated confirmation email for booking ID #${booking.id}</p>
                    <p>If you need to modify or cancel this booking, please log into your account.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateReschedulingHTML(oldBooking, newBooking, recipientType) {
        // Helper function to format time (using UTC slots where 0 = 00:00 UTC)
        const formatTimeFromSlot = (slot) => {
            const hour = Math.floor(slot / 4);
            const minute = (slot % 4) * 15;
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        };

        // Helper function to format date
        const formatDate = (dateString) => {
            return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC'
            });
        };

        // Old booking details
        const oldStartTime = formatTimeFromSlot(oldBooking.start_slot);
        const oldEndTime = formatTimeFromSlot(oldBooking.start_slot + oldBooking.duration);
        const oldDate = formatDate(oldBooking.date);

        // New booking details
        const newStartTime = formatTimeFromSlot(newBooking.start_slot);
        const newEndTime = formatTimeFromSlot(newBooking.start_slot + newBooking.duration);
        const newDate = formatDate(newBooking.date);

        const isForStudent = recipientType === 'student';
        const recipientName = isForStudent ? newBooking.student?.name : newBooking.Instructor?.User?.name;
        const otherPartyName = isForStudent ? newBooking.Instructor?.User?.name : newBooking.student?.name;
        const otherPartyRole = isForStudent ? 'instructor' : 'student';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #fff3cd; padding: 20px; text-align: center; border-radius: 8px; border-left: 4px solid #ffc107; }
                .content { padding: 20px 0; }
                .booking-comparison { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; }
                .old-booking { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #dc3545; }
                .new-booking { background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #28a745; }
                .detail-row { margin: 8px 0; }
                .detail-label { font-weight: bold; color: #555; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .lesson-time { font-size: 16px; font-weight: bold; }
                .old-time { color: #dc3545; }
                .new-time { color: #28a745; }
                .change-icon { font-size: 24px; margin: 0 15px; color: #ffc107; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📅 Lesson Rescheduled</h1>
                    <p>${isForStudent ? 'Your lesson has been moved to a new time' : `${otherPartyName} has rescheduled their lesson`}</p>
                </div>
                
                <div class="content">
                    <p>Hello ${recipientName},</p>
                    
                    <p>${isForStudent ? 'Your lesson has been successfully rescheduled.' : `Your ${otherPartyRole} ${otherPartyName} has rescheduled their lesson.`} Here are the updated details:</p>
                    
                    <div class="booking-comparison">
                        <h3>📋 Booking Changes</h3>
                        
                        <div class="old-booking">
                            <h4>❌ Previous Time</h4>
                            <div class="detail-row">
                                <span class="detail-label">Date:</span> ${oldDate}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time:</span> 
                                <span class="lesson-time old-time">${oldStartTime} - ${oldEndTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Duration:</span> ${oldBooking.duration * 15} minutes
                            </div>
                        </div>

                        <div style="text-align: center;">
                            <span class="change-icon">⬇️</span>
                        </div>

                        <div class="new-booking">
                            <h4>✅ New Time</h4>
                            <div class="detail-row">
                                <span class="detail-label">Date:</span> ${newDate}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time:</span> 
                                <span class="lesson-time new-time">${newStartTime} - ${newEndTime}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Duration:</span> ${newBooking.duration * 15} minutes
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">${isForStudent ? 'Instructor' : 'Student'}:</span> ${otherPartyName}
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Booking ID:</span> #${newBooking.id}
                            </div>
                        </div>
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>📅 <strong>Update Your Calendar:</strong> Click the attached calendar file (.ics) to update this lesson in your calendar</li>
                        <li>📝 Review any materials you've prepared for the lesson</li>
                        <li>💬 Contact your ${otherPartyRole} if you have any questions about the change</li>
                        ${isForStudent ? '<li>⏰ Make sure you\'re available at the new time</li>' : '<li>📋 Prepare for the lesson at the new scheduled time</li>'}
                    </ul>
                    
                    <p>Thank you for your flexibility!</p>
                    
                    <p>Best regards,<br>The Lesson Booking Team</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated rescheduling notification for booking ID #${newBooking.id}</p>
                    <p>If you need to make further changes, please log into your account.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Generate calendar attachment for booking
    generateCalendarAttachment(booking) {
        try {
            // Convert slot to actual datetime (UTC slots where 0 = 00:00 UTC)
            const startHour = Math.floor(booking.start_slot / 4);
            const startMinute = (booking.start_slot % 4) * 15;
            
            // Create start and end dates (specify as UTC)
            const startDate = new Date(`${booking.date}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00Z`);
            const endDate = new Date(startDate.getTime() + booking.duration * 15 * 60000); // duration in 15-min slots
            
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
                location: 'Online Lesson', // You can customize this based on your setup
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
