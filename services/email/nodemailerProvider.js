const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');
const config = require('../../config');

let transporter = null;
let isConfigured = false;

const initializeTransporter = () => {
    try {
        // Check if email configuration is available
        if (!config.email.user || !config.email.password) {
            return;
        }

        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });

        isConfigured = true;
    } catch (error) {
        isConfigured = false;
    }
};

// Convert HTML to basic text (simple fallback)
const htmlToText = (html) => {
    return html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
};

const send = async (to, subject, htmlContent, options = {}) => {
    if (!isConfigured) {
        return { 
            success: false, 
            error: 'Nodemailer provider not configured',
            provider: 'nodemailer'
        };
    }

    try {
        const { textContent } = options;
        
        const mailOptions = {
            from: config.email.from || `"Lesson Booking" <${config.email.user}>`,
            to: to,
            subject: subject,
            html: htmlContent,
            text: textContent || htmlToText(htmlContent)
        };

        const info = await transporter.sendMail(mailOptions);
        logger.email('Email sent via nodemailer', { messageId: info.messageId });
        
        return { 
            success: true, 
            messageId: info.messageId,
            response: info.response,
            provider: 'nodemailer'
        };
    } catch (error) {
        console.error('Failed to send email via nodemailer:', error);
        return { 
            success: false, 
            error: error.message,
            provider: 'nodemailer'
        };
    }
};

const sendWithAttachment = async (to, subject, htmlContent, attachment, options = {}) => {
    if (!isConfigured) {
        return { 
            success: false, 
            error: 'Nodemailer provider not configured',
            provider: 'nodemailer'
        };
    }

    try {
        const { textContent } = options;
        
        const mailOptions = {
            from: config.email.from || `"Lesson Booking" <${config.email.user}>`,
            to: to,
            subject: subject,
            html: htmlContent,
            text: textContent || htmlToText(htmlContent)
        };

        // Add attachment if provided
        if (attachment) {
            mailOptions.attachments = [attachment];
        }

        const info = await transporter.sendMail(mailOptions);
        logger.email('Email with attachment sent via nodemailer', { messageId: info.messageId });
        
        return { 
            success: true, 
            messageId: info.messageId,
            response: info.response,
            provider: 'nodemailer'
        };
    } catch (error) {
        console.error('Failed to send email with attachment via nodemailer:', error);
        return { 
            success: false, 
            error: error.message,
            provider: 'nodemailer'
        };
    }
};

const isAvailable = () => {
    return isConfigured;
};

const getConfigurationStatus = () => {
    if (isConfigured) {
        return { configured: true, message: 'Nodemailer configured successfully' };
    }
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        return { 
            configured: false, 
            message: 'EMAIL_USER and EMAIL_APP_PASSWORD environment variables are required' 
        };
    }
    
    return { configured: false, message: 'Failed to initialize nodemailer transporter' };
};

// Initialize on module load
initializeTransporter();

module.exports = {
    send,
    sendWithAttachment,
    isAvailable,
    getConfigurationStatus,
    name: 'nodemailer'
};
