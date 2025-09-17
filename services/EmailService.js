const nodemailer = require('nodemailer');
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

            return await this.sendEmail(bookingData.student.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send booking confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    generateBookingConfirmationHTML(booking, paymentMethod) {
        // Convert slot to readable time (assuming 15-minute slots starting from 6:00 AM)
        const startHour = Math.floor(booking.start_slot / 4) + 6;
        const startMinute = (booking.start_slot % 4) * 15;
        const endSlot = booking.start_slot + booking.duration;
        const endHour = Math.floor(endSlot / 4) + 6;
        const endMinute = (endSlot % 4) * 15;

        const formatTime = (hour, minute) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        };

        const startTime = formatTime(startHour, startMinute);
        const endTime = formatTime(endHour, endMinute);
        const lessonDate = new Date(booking.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
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
                        <li>📅 Add this lesson to your calendar</li>
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
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
