const config = require('./index');

// Cached calendar configuration
let cachedMethod = null;
let methodCacheTime = null;
let cachedServiceAccount = null;
let serviceAccountCacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the calendar connection method from database with env fallback
 * @returns {Promise<string>} 'oauth', 'service_account', or 'disabled'
 */
async function getCalendarMethod() {
    if (cachedMethod && methodCacheTime && (Date.now() - methodCacheTime < CACHE_TTL)) {
        return cachedMethod;
    }

    try {
        const { AppSettings } = require('../models/AppSettings');
        const calendarSettings = await AppSettings.getSettingsByCategory('calendar');

        if (calendarSettings.method) {
            cachedMethod = calendarSettings.method;
            methodCacheTime = Date.now();
            return cachedMethod;
        }
    } catch (error) {
        console.warn('Failed to load calendar method from database, falling back to environment:', error.message);
    }

    // Fallback: derive from USE_OAUTH_CALENDAR env var
    // true = oauth, false/unset = service_account (preferred default)
    cachedMethod = config.features.oauthCalendar ? 'oauth' : 'service_account';
    methodCacheTime = Date.now();
    return cachedMethod;
}

/**
 * Get service account credentials from database with env fallback
 * @returns {Promise<{email: string|null, privateKey: string|null}>}
 */
async function getServiceAccountCredentials() {
    if (cachedServiceAccount && serviceAccountCacheTime && (Date.now() - serviceAccountCacheTime < CACHE_TTL)) {
        return cachedServiceAccount;
    }

    try {
        const { AppSettings } = require('../models/AppSettings');
        const { decrypt } = require('../utils/encryption');
        const calendarSettings = await AppSettings.getSettingsByCategory('calendar');

        if (calendarSettings.service_account_email && calendarSettings.service_account_private_key) {
            cachedServiceAccount = {
                email: calendarSettings.service_account_email,
                privateKey: decrypt(calendarSettings.service_account_private_key)
            };
            serviceAccountCacheTime = Date.now();
            return cachedServiceAccount;
        }
    } catch (error) {
        console.warn('Failed to load service account credentials from database, falling back to environment:', error.message);
    }

    // Fallback to environment variables
    cachedServiceAccount = {
        email: config.googleServiceAccount.email || null,
        privateKey: config.googleServiceAccount.privateKey || null
    };
    serviceAccountCacheTime = Date.now();
    return cachedServiceAccount;
}

/**
 * Invalidate all cached calendar configuration
 * Call after admin updates calendar settings
 */
function invalidateCalendarConfigCache() {
    cachedMethod = null;
    methodCacheTime = null;
    cachedServiceAccount = null;
    serviceAccountCacheTime = null;
}

module.exports = {
    getCalendarMethod,
    getServiceAccountCredentials,
    invalidateCalendarConfigCache
};
