const { google } = require('googleapis');
const googleOAuthService = require('../../config/googleOAuth');
const logger = require('../../utils/logger');
const config = require('../../config');

let isConfigured = false;

const checkConfiguration = async () => {
    try {
        // Check if Gmail OAuth is enabled
        if (!config.features.oauthEmail) {
            return false;
        }
        
        // Check if OAuth service is properly configured
        if (!googleOAuthService.isConfigured()) {
            return false;
        }
        
        // Verify Gmail API is accessible (this will fail if API not enabled)
        const testClient = googleOAuthService.createOAuth2Client();
        if (!testClient) {
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
};

const isInstructorAvailable = async (instructorId) => {
    if (!isConfigured) {
        return false;
    }
    
    if (!instructorId) {
        return false;
    }
    
    const oauth2Client = await googleOAuthService.getAuthenticatedClient(instructorId);
    return !!oauth2Client;
};

const isAvailable = () => {
    return isConfigured;
};

const getConfigurationStatus = () => {
    if (isConfigured) {
        return { configured: true, message: 'Gmail provider configured successfully' };
    }
    
    if (!config.features.oauthEmail) {
        return { 
            configured: false, 
            message: 'USE_OAUTH_EMAIL must be set to true to enable Gmail provider' 
        };
    }
    
    if (!googleOAuthService.isConfigured()) {
        return { 
            configured: false, 
            message: 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are required' 
        };
    }
    
    return { configured: false, message: 'Failed to verify Gmail provider configuration' };
};

const send = async (to, subject, htmlContent, options = {}) => {
    const { instructorId } = options;
    
    if (!instructorId) {
        return { 
            success: false, 
            error: 'Instructor ID required for Gmail provider', 
            provider: 'gmail' 
        };
    }
    
    try {
        const oauth2Client = await googleOAuthService.getAuthenticatedClient(instructorId);
        
        if (!oauth2Client) {
            return {
                success: false,
                error: `OAuth not connected for instructor ${instructorId}`,
                provider: 'gmail'
            };
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Create RFC 2822 formatted email
        const emailLines = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${subject}`,
            '',
            htmlContent
        ];

        const email = emailLines.join('\r\n');
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });

        logger.email('Email sent via Gmail API', { 
            instructorId, 
            to, 
            messageId: response.data.id 
        });

        return {
            success: true,
            messageId: response.data.id,
            provider: 'gmail'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            provider: 'gmail'
        };
    }
};

const sendWithAttachment = async (to, subject, htmlContent, attachment, options = {}) => {
    const { instructorId } = options;
    
    if (!instructorId) {
        return { 
            success: false, 
            error: 'Instructor ID required for Gmail provider', 
            provider: 'gmail' 
        };
    }
    
    try {
        const oauth2Client = await googleOAuthService.getAuthenticatedClient(instructorId);
        
        if (!oauth2Client) {
            return {
                success: false,
                error: `OAuth not connected for instructor ${instructorId}`,
                provider: 'gmail'
            };
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Create multipart email with attachment
        const boundary = '----=_Part_' + Date.now();
        
        const emailLines = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            htmlContent,
            '',
            `--${boundary}`,
            `Content-Type: ${attachment.contentType}`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            '',
            Buffer.from(attachment.content).toString('base64'),
            '',
            `--${boundary}--`
        ];

        const email = emailLines.join('\r\n');
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });

        logger.email('Email with attachment sent via Gmail API', { 
            instructorId, 
            to, 
            messageId: response.data.id 
        });

        return {
            success: true,
            messageId: response.data.id,
            provider: 'gmail'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            provider: 'gmail'
        };
    }
};

// Initialize configuration check on module load and export promise
const initializationPromise = (async () => {
    isConfigured = await checkConfiguration();
})();

module.exports = {
    send,
    sendWithAttachment,
    isAvailable,
    isInstructorAvailable,
    getConfigurationStatus,
    initializationPromise,
    name: 'gmail'
};
