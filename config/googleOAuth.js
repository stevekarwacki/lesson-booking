const { google } = require('googleapis');
const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');

class GoogleOAuthService {
    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        // Fixed fallback URI - should match frontend callback route
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`;
        this.scopes = process.env.GOOGLE_OAUTH_SCOPES?.split(' ') || [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ];
    }

    /**
     * Check if OAuth is configured
     */
    isConfigured() {
        return !!(this.clientId && this.clientSecret);
    }

    /**
     * Create OAuth2 client
     */
    createOAuth2Client() {
        if (!this.isConfigured()) {
            throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        }

        return new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            this.redirectUri
        );
    }

    /**
     * Generate authorization URL for OAuth consent screen
     * @param {number} instructorId - Instructor ID to encode in state
     * @returns {string} Authorization URL
     */
    generateAuthUrl(instructorId) {
        const oauth2Client = this.createOAuth2Client();
        
        // Encode instructor ID in state parameter for CSRF protection
        const state = Buffer.from(JSON.stringify({ instructorId })).toString('base64');
        
        return oauth2Client.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            prompt: 'consent',      // Force consent screen to get refresh token
            scope: this.scopes,
            state: state
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from Google
     * @returns {Promise<Object>} Token data
     */
    async exchangeCodeForTokens(code) {
        const oauth2Client = this.createOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Get OAuth2 client with instructor's tokens (includes automatic refresh)
     * @param {number} instructorId - Instructor ID
     * @returns {Promise<OAuth2Client|null>} OAuth2 client or null if not connected
     */
    async getAuthenticatedClient(instructorId) {
        const tokenRecord = await InstructorGoogleToken.findByInstructorId(instructorId);
        
        if (!tokenRecord) {
            return null; // Not connected
        }

        const oauth2Client = this.createOAuth2Client();
        
        oauth2Client.setCredentials({
            access_token: tokenRecord.access_token,
            refresh_token: tokenRecord.refresh_token,
            expiry_date: tokenRecord.token_expiry ? new Date(tokenRecord.token_expiry).getTime() : null,
            scope: tokenRecord.scope
        });

        // Automatic token refresh on expiry
        oauth2Client.on('tokens', async (newTokens) => {
            // Token refresh logged via logger in production
            await tokenRecord.updateTokens({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token || tokenRecord.refresh_token,
                expiry_date: newTokens.expiry_date
            });
        });

        return oauth2Client;
    }

    /**
     * Revoke OAuth tokens
     * @param {number} instructorId - Instructor ID
     */
    async revokeTokens(instructorId) {
        const oauth2Client = await this.getAuthenticatedClient(instructorId);
        
        if (oauth2Client) {
            try {
                await oauth2Client.revokeCredentials();
            } catch (error) {
                // Failed to revoke tokens with Google, continue anyway to delete local tokens
                // Error logged via logger in production
            }
        }

        await InstructorGoogleToken.removeByInstructorId(instructorId);
    }
}

// Export singleton instance
const googleOAuthService = new GoogleOAuthService();
module.exports = googleOAuthService;
