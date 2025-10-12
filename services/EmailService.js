const nodemailer = require('nodemailer');
const { default: ical } = require('ical-generator');
const { User } = require('../models/User');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const { fromString, createDateHelper } = require('../utils/dateHelpers');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.templateCache = new Map();
        this.handlebarsInitialized = false;
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

    async initializeHandlebars() {
        if (this.handlebarsInitialized) {
            return;
        }

        try {
            // Register partials
            const partialsDir = path.join(__dirname, '..', 'email-templates', 'partials');
            const partialFiles = await fs.readdir(partialsDir);
            
            for (const file of partialFiles) {
                if (file.endsWith('.html')) {
                    const partialName = file.replace('.html', '');
                    const partialPath = path.join(partialsDir, file);
                    const partialContent = await fs.readFile(partialPath, 'utf8');
                    handlebars.registerPartial(partialName, partialContent);
                }
            }

            // Register helpers
            handlebars.registerHelper('currentYear', () => createDateHelper().toDate().getFullYear());
            handlebars.registerHelper('formatDate', (date) => {
                return fromString(date).toDate().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            });
            handlebars.registerHelper('formatTime', (time) => {
                return time; // Already formatted in the service
            });
            handlebars.registerHelper('object', (...args) => {
                // Remove the handlebars options object from the end
                const options = args.pop();
                const obj = {};
                
                // Parse key=value pairs
                for (let i = 0; i < args.length; i += 2) {
                    if (i + 1 < args.length) {
                        obj[args[i]] = args[i + 1];
                    }
                }
                return obj;
            });

            this.handlebarsInitialized = true;
            logger.email('Handlebars initialized with partials and helpers');
        } catch (error) {
            console.error('Failed to initialize Handlebars:', error);
            throw error;
        }
    }

    async loadTemplate(templateName, templateFile = 'template.html') {
        // Ensure Handlebars is initialized
        await this.initializeHandlebars();

        const cacheKey = `${templateName}:${templateFile}`;
        
        // Return cached template if available
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey);
        }

        try {
            const templatePath = path.join(__dirname, '..', 'email-templates', templateName, templateFile);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateContent);
            
            // Cache the compiled template
            this.templateCache.set(cacheKey, compiledTemplate);
            return compiledTemplate;
        } catch (error) {
            console.error(`Failed to load email template ${templateName}/${templateFile}:`, error);
            throw new Error(`Template loading failed: ${templateName}/${templateFile}`);
        }
    }

    async loadContentTemplate(templateName) {
        // Ensure Handlebars is initialized
        await this.initializeHandlebars();

        const cacheKey = `content:${templateName}`;
        
        // Return cached template if available
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey);
        }

        try {
            const templatePath = path.join(__dirname, '..', 'email-templates', 'contents', `${templateName}.html`);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateContent);
            
            // Cache the compiled template
            this.templateCache.set(cacheKey, compiledTemplate);
            return compiledTemplate;
        } catch (error) {
            console.error(`Failed to load content template ${templateName}:`, error);
            throw new Error(`Content template loading failed: ${templateName}`);
        }
    }

    async loadBaseTemplate(contentTemplate, templateData) {
        // Ensure Handlebars is initialized
        await this.initializeHandlebars();

        const cacheKey = 'base:email-layout';
        
        let baseTemplate;
        if (this.templateCache.has(cacheKey)) {
            baseTemplate = this.templateCache.get(cacheKey);
        } else {
            const basePath = path.join(__dirname, '..', 'email-templates', 'base', 'email-layout.html');
            const baseContent = await fs.readFile(basePath, 'utf8');
            baseTemplate = handlebars.compile(baseContent);
            this.templateCache.set(cacheKey, baseTemplate);
        }

        // Render the content template first
        const contentHtml = contentTemplate(templateData);

        // Get social media links from database
        const { AppSettings } = require('../models/AppSettings');
        const businessSettings = await AppSettings.getSettingsByCategory('business');
        
        // Then render the base template with the content
        const baseData = {
            ...templateData,
            content: contentHtml,
            companyName: process.env.COMPANY_NAME || 'Lesson Booking',
            recipientEmail: templateData.recipientEmail || templateData.studentEmail || templateData.userEmail,
            currentYear: createDateHelper().toDate().getFullYear(),
            supportUrl: process.env.SUPPORT_URL || '#',
            unsubscribeUrl: templateData.unsubscribeUrl || '#',
            preferencesUrl: templateData.preferencesUrl || '#',
            socialLinks: {
                website: process.env.WEBSITE_URL || businessSettings.base_url,
                twitter: businessSettings.social_media_twitter || process.env.TWITTER_URL,
                facebook: businessSettings.social_media_facebook || process.env.FACEBOOK_URL,
                instagram: businessSettings.social_media_instagram || process.env.INSTAGRAM_URL,
                youtube: businessSettings.social_media_youtube || process.env.YOUTUBE_URL
            }
        };

        return baseTemplate(baseData);
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

            const subject = 'Purchase Confirmation - Lesson Credits';
            const htmlContent = await this.generatePurchaseConfirmationHTML(user, planDetails, transactionDetails);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send purchase confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    async generatePurchaseConfirmationHTML(user, planDetails, transactionDetails) {
        // Load the content template
        const contentTemplate = await this.loadContentTemplate('purchase-confirmation');
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Purchase Confirmation - Lesson Credits',
            headerTitle: '🎉 Purchase Successful!',
            headerSubtitle: 'Your lesson credits have been added',
            
            // Recipient info
            userName: user.name,
            userEmail: user.email,
            
            // Purchase details
            planName: planDetails.name,
            planCredits: planDetails.credits,
            transactionAmount: transactionDetails.amount,
            paymentMethod: transactionDetails.payment_method,
            transactionDate: createDateHelper().toDate().toLocaleDateString(),
            transactionId: transactionDetails.payment_intent_id,
            
            // Next steps
            nextSteps: [
                {
                    icon: '🎯',
                    title: 'Browse Instructors',
                    description: 'Find the perfect instructor for your learning goals and schedule'
                },
                {
                    icon: '📅',
                    title: 'Book Your First Lesson',
                    description: 'Use your new credits to schedule a lesson at your convenience'
                },
                {
                    icon: '🚀',
                    title: 'Start Learning',
                    description: 'Join your lesson and begin your educational journey'
                }
            ],
            
            // CTA buttons
            dashboardButton: {
                url: process.env.FRONTEND_URL || '#',
                text: 'View Dashboard',
                style: 'primary'
            },
            bookingButton: {
                url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/instructors` : '#',
                text: 'Book a Lesson',
                style: 'success'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
    }

    // Low balance warning email (for future use with cron jobs)
    async sendLowBalanceWarning(userId, creditsRemaining) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const subject = 'Lesson Credits Running Low';
            const htmlContent = await this.generateLowBalanceHTML(user, creditsRemaining);

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
            const htmlContent = await this.generateReschedulingHTML(oldBooking, newBooking, recipientType);
            
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

    async generateLowBalanceHTML(user, creditsRemaining) {
        // Load the content template
        const contentTemplate = await this.loadContentTemplate('low-balance-warning');
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Low Credit Balance Warning',
            headerTitle: '⚠️ Credits Running Low',
            headerSubtitle: 'Time to restock your lesson credits',
            
            // Recipient info
            userName: user.name,
            userEmail: user.email,
            creditsRemaining: creditsRemaining,
            
            // Next steps
            nextSteps: [
                {
                    icon: '💳',
                    title: 'Choose Your Package',
                    description: 'Select from our flexible lesson packages to suit your learning needs'
                },
                {
                    icon: '⚡',
                    title: 'Instant Credit Add',
                    description: 'Credits are added immediately after purchase - no waiting time'
                },
                {
                    icon: '📚',
                    title: 'Continue Learning',
                    description: 'Keep your learning momentum going without interruption'
                }
            ],
            
            // CTA buttons
            purchaseButton: {
                url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/plans` : '#',
                text: 'Purchase Credits',
                style: 'warning'
            },
            dashboardButton: {
                url: process.env.FRONTEND_URL || '#',
                text: 'View Dashboard',
                style: 'secondary'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
    }

    // Credits exhausted email
    async sendCreditsExhausted(userId, totalLessonsCompleted = 0) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const subject = 'All Lesson Credits Used - Time to Restock!';
            const htmlContent = await this.generateCreditsExhaustedHTML(user, totalLessonsCompleted);

            return await this.sendEmail(user.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send credits exhausted email:', error);
            return { success: false, error: error.message };
        }
    }

    async generateCreditsExhaustedHTML(user, totalLessonsCompleted) {
        // Load the content template
        const contentTemplate = await this.loadContentTemplate('credits-exhausted');
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Credits Exhausted - Get More Lessons',
            headerTitle: '🎯 All Credits Used!',
            headerSubtitle: 'Great progress - time to get more lessons',
            
            // Recipient info
            studentName: user.name,
            studentEmail: user.email,
            totalLessonsCompleted: totalLessonsCompleted,
            
            // Next steps
            steps: [
                {
                    icon: '💳',
                    title: 'Choose Your Package',
                    description: 'Browse our flexible lesson packages to find the perfect fit for your learning goals'
                },
                {
                    icon: '⚡',
                    title: 'Instant Access',
                    description: 'Credits are added immediately after purchase - start booking right away'
                },
                {
                    icon: '📅',
                    title: 'Book Your Next Lesson',
                    description: 'Continue your learning momentum with your favorite instructors'
                }
            ],
            
            // CTA buttons
            purchaseButton: {
                url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/plans` : '#',
                text: 'Purchase Credits',
                style: 'primary'
            },
            supportButton: {
                url: process.env.SUPPORT_URL || '#',
                text: 'Contact Support',
                style: 'secondary'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
    }

    // Lesson booking confirmation email
    async sendBookingConfirmation(bookingData, paymentMethod = 'credits') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            const subject = 'Lesson Booking Confirmed';
            const htmlContent = await this.generateBookingConfirmationHTML(bookingData, paymentMethod);
            
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

    async generateBookingConfirmationHTML(booking, paymentMethod) {
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
        const lessonDate = fromString(booking.date).toDate().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const paymentDisplay = paymentMethod === 'credits' ? 'Lesson Credits' : 'Credit Card';
        const instructorName = booking.Instructor?.User?.name || 'Your Instructor';

        // Load the content template
        const contentTemplate = await this.loadContentTemplate('booking-confirmation');
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Lesson Booking Confirmed',
            headerTitle: '✅ Lesson Booked Successfully!',
            headerSubtitle: 'Your lesson has been confirmed',
            
            // Recipient info
            studentName: booking.student.name,
            studentEmail: booking.student.email,
            
            // Lesson details
            lessonDate: lessonDate,
            startTime: startTime,
            endTime: endTime,
            instructorName: instructorName,
            duration: booking.duration * 15,
            paymentDisplay: paymentDisplay,
            bookingId: booking.id,
            
            // Next steps
            nextSteps: [
                {
                    icon: '📅',
                    title: 'Add to Calendar',
                    description: 'Click the attached calendar file (.ics) to automatically add this lesson to your calendar'
                },
                {
                    icon: '📝',
                    title: 'Prepare Materials',
                    description: 'Gather any materials you\'d like to work on during your lesson'
                },
                {
                    icon: '💬',
                    title: 'Contact Instructor',
                    description: 'Reach out if you have any questions or special requests'
                }
            ],
            
            // CTA buttons
            primaryButton: {
                url: process.env.FRONTEND_URL || '#',
                text: 'View Dashboard',
                style: 'primary'
            },
            secondaryButton: {
                url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/bookings` : '#',
                text: 'Manage Bookings',
                style: 'secondary'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
    }

    async generateReschedulingHTML(oldBooking, newBooking, recipientType) {
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
            return fromString(dateString).toDate().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
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

        // Load appropriate template based on recipient type
        const templateName = isForStudent ? 'rescheduling-student' : 'rescheduling-instructor';
        const contentTemplate = await this.loadContentTemplate(templateName);
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Lesson Rescheduled',
            headerTitle: '📅 Lesson Rescheduled',
            headerSubtitle: isForStudent ? 'Your lesson has been moved to a new time' : `${newBooking.student?.name} has rescheduled their lesson`,
            
            // Recipient info
            studentName: newBooking.student?.name,
            studentEmail: newBooking.student?.email,
            instructorName: newBooking.Instructor?.User?.name,
            instructorEmail: newBooking.Instructor?.User?.email,
            
            // Lesson details
            oldDate: oldDate,
            oldStartTime: oldStartTime,
            oldEndTime: oldEndTime,
            oldDuration: oldBooking.duration * 15,
            newDate: newDate,
            newStartTime: newStartTime,
            newEndTime: newEndTime,
            newDuration: newBooking.duration * 15,
            bookingId: newBooking.id,
            
            // Next steps
            nextSteps: [
                {
                    icon: '📅',
                    title: 'Update Your Calendar',
                    description: 'Click the attached calendar file (.ics) to update this lesson in your calendar'
                },
                {
                    icon: '📝',
                    title: 'Review Materials',
                    description: 'Review any materials you\'ve prepared for the lesson'
                },
                {
                    icon: '💬',
                    title: `Contact Your ${isForStudent ? 'Instructor' : 'Student'}`,
                    description: `Reach out if you have any questions about the change`
                }
            ],
            
            // CTA buttons
            dashboardButton: {
                url: process.env.FRONTEND_URL || '#',
                text: 'View Dashboard',
                style: 'primary'
            },
            contactButton: {
                url: process.env.SUPPORT_URL || '#',
                text: 'Contact Support',
                style: 'secondary'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
    }

    // Absence notification email
    async sendAbsenceNotification(bookingData, attendanceNotes = '') {
        try {
            if (!bookingData.student || !bookingData.student.email) {
                throw new Error('Student email not found in booking data');
            }

            const subject = 'Lesson Update - Book Your Next Session';
            const htmlContent = await this.generateAbsenceNotificationHTML(bookingData, attendanceNotes);

            return await this.sendEmail(bookingData.student.email, subject, htmlContent);
        } catch (error) {
            console.error('Failed to send absence notification:', error);
            return { success: false, error: error.message };
        }
    }

    async generateAbsenceNotificationHTML(booking, attendanceNotes) {
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
        const lessonDate = fromString(booking.date).toDate().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const instructorName = booking.Instructor?.User?.name || 'Your Instructor';

        // Load the content template
        const contentTemplate = await this.loadContentTemplate('absence-notification');
        
        // Prepare template data
        const templateData = {
            // Email meta data
            emailTitle: 'Lesson Update - Book Your Next Session',
            headerTitle: '📅 Lesson Update',
            headerSubtitle: 'Your lesson status and next steps',
            
            // Recipient info
            studentName: booking.student.name,
            studentEmail: booking.student.email,
            
            // Lesson details
            lessonDate: lessonDate,
            startTime: startTime,
            endTime: endTime,
            instructorName: instructorName,
            duration: booking.duration * 15,
            bookingId: booking.id,
            attendanceNotes: attendanceNotes,
            
            // CTA buttons
            primaryButton: {
                url: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/book-lesson` : '#',
                text: 'Book New Lesson',
                style: 'primary'
            },
            secondaryButton: {
                url: process.env.SUPPORT_URL || '#',
                text: 'Contact Support',
                style: 'secondary'
            }
        };

        // Use base template with content
        return await this.loadBaseTemplate(contentTemplate, templateData);
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
