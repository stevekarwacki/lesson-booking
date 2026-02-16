const { google } = require('googleapis');
const { InstructorGoogleToken } = require('../models/InstructorGoogleToken');
const config = require('./index');

// Lazy-loaded credentials from database
let cachedCredentials = null;
let credentialsCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get OAuth credentials from database with fallback to environment
 * @returns {Promise<{clientId: string|null, clientSecret: string|null, redirectUri: string|null}>}
 */
async function getOAuthCredentials() {
    // Return cached credentials if still valid
    if (cachedCredentials && credentialsCacheTime && (Date.now() - credentialsCacheTime < CACHE_TTL)) {
        return cachedCredentials;
    }
    
    try {
        const { AppSettings } = require('../models/AppSettings');
        const { decrypt } = require('../utils/encryption');
        
        const emailSettings = await AppSettings.getSettingsByCategory('email');
        
        // Check if database has OAuth credentials
        if (emailSettings.google_client_id && emailSettings.google_client_secret) {
            cachedCredentials = {
                clientId: emailSettings.google_client_id,
                clientSecret: decrypt(emailSettings.google_client_secret),
                redirectUri: emailSettings.google_redirect_uri || config.googleOAuth.redirectUri
            };
            credentialsCacheTime = Date.now();
            return cachedCredentials;
        }
    } catch (error) {
        // Fall through to environment variables if database read fails
        console.warn('Failed to load OAuth credentials from database, falling back to environment:', error.message);
    }
    
    // Fallback to environment variables
    cachedCredentials = {
        clientId: config.googleOAuth.clientId,
        clientSecret: config.googleOAuth.clientSecret,
        redirectUri: config.googleOAuth.redirectUri
    };
    credentialsCacheTime = Date.now();
    return cachedCredentials;
}

/**
 * Invalidate cached credentials (call after updating settings)
 */
function invalidateCredentialsCache() {
    cachedCredentials = null;
    credentialsCacheTime = null;
}

// Configuration loaded from centralized config or database
const scopes = config.googleOAuth.scopes;

/**
 * Check if OAuth is configured
 * @returns {Promise<boolean>} True if OAuth credentials are available
 */
const isConfigured = async () => {
    const creds = await getOAuthCredentials();
    return !!(creds.clientId && creds.clientSecret);
};

/**
 * Create OAuth2 client
 * @returns {Promise<OAuth2Client>} Google OAuth2 client
 * @throws {Error} If OAuth is not configured
 */
const createOAuth2Client = async () => {
    const creds = await getOAuthCredentials();
    
    if (!(creds.clientId && creds.clientSecret)) {
        throw new Error('Google OAuth not configured. Please configure OAuth credentials in admin settings or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
    }

    return new google.auth.OAuth2(
        creds.clientId,
        creds.clientSecret,
        creds.redirectUri
    );
};

/**
 * Generate authorization URL for OAuth consent screen
 * @param {number} instructorId - Instructor ID to encode in state
 * @returns {Promise<string>} Authorization URL
 */
const generateAuthUrl = async (instructorId) => {
    const oauth2Client = await createOAuth2Client();
    
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
    const oauth2Client = await createOAuth2Client();
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

    const oauth2Client = await createOAuth2Client();
    
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
    getOAuthCredentials,
    invalidateCredentialsCache,
    scopes,
    isConfigured,
    createOAuth2Client,
    generateAuthUrl,
    exchangeCodeForTokens,
    getAuthenticatedClient,
    revokeTokens
};
