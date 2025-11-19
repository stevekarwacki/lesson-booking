const { google } = require('googleapis');
const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
const config = require('./index');

// Configuration loaded from centralized config
const clientId = config.googleOAuth.clientId;
const clientSecret = config.googleOAuth.clientSecret;
// Fixed fallback URI - should match frontend callback route
const redirectUri = config.googleOAuth.redirectUri || `${config.server.frontendUrl}/auth/google/callback`;
const scopes = config.googleOAuth.scopes;

/**
 * Check if OAuth is configured
 * @returns {boolean} True if OAuth credentials are available
 */
const isConfigured = () => {
    return !!(clientId && clientSecret);
};

/**
 * Create OAuth2 client
 * @returns {OAuth2Client} Google OAuth2 client
 * @throws {Error} If OAuth is not configured
 */
const createOAuth2Client = () => {
    if (!isConfigured()) {
        throw new Error('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
};

/**
 * Generate authorization URL for OAuth consent screen
 * @param {number} instructorId - Instructor ID to encode in state
 * @returns {string} Authorization URL
 */
const generateAuthUrl = (instructorId) => {
    const oauth2Client = createOAuth2Client();
    
    // Encode instructor ID in state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({ instructorId })).toString('base64');
    
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        prompt: 'consent',      // Force consent screen to get refresh token
        scope: scopes,
        state: state
    });
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} Token data
 */
const exchangeCodeForTokens = async (code) => {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};

/**
 * Get OAuth2 client with instructor's tokens (includes automatic refresh)
 * @param {number} instructorId - Instructor ID
 * @returns {Promise<OAuth2Client|null>} OAuth2 client or null if not connected
 */
const getAuthenticatedClient = async (instructorId) => {
    const tokenRecord = await InstructorGoogleToken.findByInstructorId(instructorId);
    
    if (!tokenRecord) {
        return null; // Not connected
    }

    const oauth2Client = createOAuth2Client();
    
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
};

/**
 * Revoke OAuth tokens
 * @param {number} instructorId - Instructor ID
 * @returns {Promise<void>}
 */
const revokeTokens = async (instructorId) => {
    const oauth2Client = await getAuthenticatedClient(instructorId);
    
    if (oauth2Client) {
        try {
            await oauth2Client.revokeCredentials();
        } catch (error) {
            // Failed to revoke tokens with Google, continue anyway to delete local tokens
            // Error logged via logger in production
        }
    }

    await InstructorGoogleToken.removeByInstructorId(instructorId);
};

// Export public API
module.exports = {
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    isConfigured,
    createOAuth2Client,
    generateAuthUrl,
    exchangeCodeForTokens,
    getAuthenticatedClient,
    revokeTokens
};
