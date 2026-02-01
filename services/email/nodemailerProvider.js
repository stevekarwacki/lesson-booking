const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');
const config = require('../../config');

let transporter = null;
let isConfigured = false;
let currentConfig = null; // Track current SMTP config

/**
 * Get SMTP configuration from database
 * @returns {Promise<Object|null>} SMTP config or null if not configured
 */
async function getSMTPConfigFromDatabase() {
    try {
        const { AppSettings } = require('../../models/AppSettings');
        const { decrypt } = require('../../utils/encryption');
        
        const smtpSettings = await AppSettings.getSettingsByCategory('email');
        
        // Check if SMTP is configured in database
        if (!smtpSettings.email_host || !smtpSettings.email_user || !smtpSettings.email_password) {
            return null;
        }
        
        // Decrypt password
        const decryptedPassword = decrypt(smtpSettings.email_password);
        
        return {
            host: smtpSettings.email_host,
            port: parseInt(smtpSettings.email_port) || 465,
            secure: smtpSettings.email_secure === 'true',
            auth: {
                user: smtpSettings.email_user,
                pass: decryptedPassword
            },
            from_name: smtpSettings.email_from_name || null,
            from_address: smtpSettings.email_from_address || smtpSettings.email_user
        };
    } catch (error) {
        console.error('Error loading SMTP config from database:', error);
        return null;
    }
}

/**
 * Initialize transporter with environment variables (legacy fallback)
 */
const initializeFromEnv = () => {
    try {
        // Check if email configuration is available in environment
        if (!config.email.user || !config.email.password) {
            return false;
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

        currentConfig = {
            source: 'environment',
            user: config.email.user,
            from: config.email.from
        };

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Initialize or reinitialize transporter with database config
 */
async function initializeTransporter() {
    try {
        // Try database config first
        const dbConfig = await getSMTPConfigFromDatabase();
        
        if (dbConfig) {
            transporter = nodemailer.createTransport({
                host: dbConfig.host,
                port: dbConfig.port,
                secure: dbConfig.secure,
                auth: dbConfig.auth
            });
            
            currentConfig = {
                source: 'database',
                user: dbConfig.auth.user,
                from_name: dbConfig.from_name,
                from_address: dbConfig.from_address
            };
            
            isConfigured = true;
            return true;
        }
        
        // Fallback to environment variables
        const envConfigured = initializeFromEnv();
        if (envConfigured) {
            isConfigured = true;
            return true;
        }
        
        // Neither source available
        isConfigured = false;
        transporter = null;
        currentConfig = null;
        return false;
        
    } catch (error) {
        console.error('Error initializing nodemailer transporter:', error);
        isConfigured = false;
        transporter = null;
        currentConfig = null;
        return false;
    }
}

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
    // Ensure transporter is initialized/refreshed
    await initializeTransporter();
    
    if (!isConfigured) {
        return { 
            success: false, 
            error: 'Nodemailer provider not configured',
            provider: 'nodemailer'
        };
    }

    try {
        const { textContent } = options;
        
        // Determine from address based on source
        let fromAddress;
        if (currentConfig.source === 'database') {
            fromAddress = currentConfig.from_name 
                ? `"${currentConfig.from_name}" <${currentConfig.from_address}>`
                : currentConfig.from_address;
        } else {
            // Environment variable source
            fromAddress = config.email.from || `"Lesson Booking" <${currentConfig.user}>`;
        }
        
        const mailOptions = {
            from: fromAddress,
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
    // Ensure transporter is initialized/refreshed
    await initializeTransporter();
    
    if (!isConfigured) {
        return { 
            success: false, 
            error: 'Nodemailer provider not configured',
            provider: 'nodemailer'
        };
    }

    try {
        const { textContent } = options;
        
        // Determine from address based on source
        let fromAddress;
        if (currentConfig.source === 'database') {
            fromAddress = currentConfig.from_name 
                ? `"${currentConfig.from_name}" <${currentConfig.from_address}>`
                : currentConfig.from_address;
        } else {
            // Environment variable source
            fromAddress = config.email.from || `"Lesson Booking" <${currentConfig.user}>`;
        }
        
        const mailOptions = {
            from: fromAddress,
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
        const source = currentConfig?.source || 'unknown';
        const user = currentConfig?.user || 'unknown';
        return { 
            configured: true, 
            message: `Nodemailer configured via ${source} (${user})`
        };
    }
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        return { 
            configured: false, 
            message: 'SMTP not configured. Configure via Admin Settings or use EMAIL_USER and EMAIL_APP_PASSWORD environment variables' 
        };
    }
    
    return { configured: false, message: 'Failed to initialize nodemailer transporter' };
};

// Initialize on module load (try both sources)
initializeTransporter();

module.exports = {
    send,
    sendWithAttachment,
    isAvailable,
    getConfigurationStatus,
    initializeTransporter, // Export for refreshing config
    name: 'nodemailer'
};
