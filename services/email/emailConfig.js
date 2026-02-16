const nodemailerProvider = require('./nodemailerProvider');
const gmailProvider = require('./gmailProvider');
const config = require('../../config');

// Cache for provider selection
let cachedProvider = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 1 minute cache

// Legacy rules for fallback when no DB setting exists
const LEGACY_PROVIDER_RULES = [
    {
        name: 'gmail_for_instructors',
        test: (ctx) => ctx.instructorId && config.features.oauthEmail,
        provider: gmailProvider
    },
    {
        name: 'nodemailer_default',
        test: () => true, // Always matches as fallback
        provider: nodemailerProvider
    }
];

/**
 * Get configured email provider from database setting
 * Falls back to legacy auto-detection if setting doesn't exist
 * @returns {Promise<string|null>} Provider name ('smtp', 'gmail_oauth', 'disabled', or null for auto-detect)
 */
const getProviderSetting = async () => {
    try {
        const { AppSettings } = require('../../models/AppSettings');
        const settings = await AppSettings.getSettingsByCategory('email');
        
        // Return provider setting if it exists
        if (settings.provider) {
            return settings.provider;
        }
        
        // No setting exists - use legacy auto-detection
        return null;
    } catch (error) {
        // Database not ready or error - use legacy auto-detection
        return null;
    }
};

/**
 * Select provider based on database configuration or legacy rules
 * @param {Object} context - Context including instructorId, etc.
 * @returns {Promise<Object>} Provider object with send/sendWithAttachment methods
 */
const selectProvider = async (context = {}) => {
    // Check cache first
    const now = Date.now();
    if (cachedProvider && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
        // For cached provider, still apply context-specific logic if it's legacy mode
        if (cachedProvider === 'legacy') {
            const rule = LEGACY_PROVIDER_RULES.find(rule => rule.test(context));
            return rule.provider;
        }
        
        // Return cached provider
        if (cachedProvider === 'smtp') return nodemailerProvider;
        if (cachedProvider === 'gmail_oauth') return gmailProvider;
        if (cachedProvider === 'disabled') return createDisabledProvider();
    }
    
    // Get provider setting from database
    const providerSetting = await getProviderSetting();
    
    // If no setting exists, use legacy auto-detection
    if (providerSetting === null) {
        cachedProvider = 'legacy';
        cacheTimestamp = now;
        
        const rule = LEGACY_PROVIDER_RULES.find(rule => rule.test(context));
        return rule.provider;
    }
    
    // Cache the setting
    cachedProvider = providerSetting;
    cacheTimestamp = now;
    
    // Return provider based on setting
    if (providerSetting === 'smtp') {
        return nodemailerProvider;
    } else if (providerSetting === 'gmail_oauth') {
        return gmailProvider;
    } else if (providerSetting === 'disabled') {
        return createDisabledProvider();
    }
    
    // Fallback to nodemailer if invalid setting
    return nodemailerProvider;
};

/**
 * Create a disabled provider that logs but doesn't send
 */
const createDisabledProvider = () => {
    const logger = require('../../utils/logger');
    
    const disabledSend = async (to, subject) => {
        logger.email(`Email sending is disabled. Would have sent: "${subject}" to ${to}`);
        return {
            success: false,
            error: 'Email sending is disabled',
            provider: 'disabled'
        };
    };
    
    return {
        send: disabledSend,
        sendWithAttachment: disabledSend,
        isAvailable: () => false,
        getConfigurationStatus: () => ({
            configured: false,
            message: 'Email sending is disabled by administrator'
        }),
        name: 'disabled'
    };
};

/**
 * Invalidate provider cache (call when settings change)
 */
const invalidateProviderCache = () => {
    cachedProvider = null;
    cacheTimestamp = null;
};

module.exports = {
    selectProvider,
    invalidateProviderCache,
    LEGACY_PROVIDER_RULES // Export for testing
};
