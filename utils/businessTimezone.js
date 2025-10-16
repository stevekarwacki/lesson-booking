/**
 * Business Timezone Service
 * 
 * Provides centralized business timezone management with caching.
 * This ensures all timezone operations use the business operating timezone
 * instead of the server timezone, fixing Google Calendar and other timezone issues.
 */

class BusinessTimezoneService {
    static _cachedTimezone = null;
    static _cacheExpiry = 0;
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    static DEFAULT_TIMEZONE = 'UTC';

    /**
     * Get business timezone with caching
     * @returns {Promise<string>} Business timezone identifier (e.g., 'America/New_York')
     */
    static async getTimezone() {
        const now = Date.now();
        
        // Return cached value if still valid
        if (this._cachedTimezone && now < this._cacheExpiry) {
            return this._cachedTimezone;
        }

        try {
            const { AppSettings } = require('../models/AppSettings');
            const businessTz = await AppSettings.getSetting('business', 'timezone');
            
            // Cache the result
            this._cachedTimezone = businessTz || this.DEFAULT_TIMEZONE;
            this._cacheExpiry = now + this.CACHE_DURATION;
            
            return this._cachedTimezone;
        } catch (error) {
            console.error('Error getting business timezone:', error);
            return this.DEFAULT_TIMEZONE; // Safe fallback
        }
    }

    /**
     * Convert date to business timezone string
     * @param {Date} date - Date object to convert
     * @param {Object} options - Intl.DateTimeFormat options
     * @returns {Promise<string>} Formatted time string in business timezone
     */
    static async toBusinessTimeString(date, options = {}) {
        const timezone = await this.getTimezone();
        
        const defaultOptions = {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Intl.DateTimeFormat('en-US', {
            ...defaultOptions,
            ...options
        }).format(date);
    }

    /**
     * Get business date string (YYYY-MM-DD) in business timezone
     * @param {Date} date - Date object to convert
     * @returns {Promise<string>} Date string in YYYY-MM-DD format
     */
    static async toBusinessDateString(date) {
        const timezone = await this.getTimezone();
        
        const dateString = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone
        }).format(date);
        
        return dateString; // Already in YYYY-MM-DD format
    }

    /**
     * Check if a timezone identifier is valid
     * @param {string} timezone - Timezone identifier to validate
     * @returns {boolean} True if valid timezone
     */
    static isValidTimezone(timezone) {
        try {
            // Try to create a DateTimeFormat with the timezone
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get list of common timezone options for UI
     * @returns {Array<Object>} Array of timezone options with value and label
     */
    static getTimezoneOptions() {
        const commonTimezones = [
            'UTC',
            'America/New_York',    // Eastern Time
            'America/Chicago',     // Central Time
            'America/Denver',      // Mountain Time
            'America/Los_Angeles', // Pacific Time
            'America/Toronto',     // Eastern Time (Canada)
            'America/Vancouver',   // Pacific Time (Canada)
            'Europe/London',       // GMT/BST
            'Europe/Paris',        // CET/CEST
            'Europe/Berlin',       // CET/CEST
            'Europe/Rome',         // CET/CEST
            'Europe/Madrid',       // CET/CEST
            'Asia/Tokyo',          // JST
            'Asia/Shanghai',       // CST
            'Asia/Kolkata',        // IST
            'Australia/Sydney',    // AEST/AEDT
            'Australia/Melbourne', // AEST/AEDT
            'Pacific/Auckland',    // NZST/NZDT
        ];

        return commonTimezones.map(tz => ({
            value: tz,
            label: this.getTimezoneDisplayName(tz)
        }));
    }

    /**
     * Get display name for timezone
     * @param {string} timezone - Timezone identifier
     * @returns {string} Human-readable timezone name
     */
    static getTimezoneDisplayName(timezone) {
        if (!timezone || timezone === 'UTC') {
            return 'UTC (Coordinated Universal Time)';
        }
        
        try {
            const formatter = new Intl.DateTimeFormat(undefined, {
                timeZone: timezone,
                timeZoneName: 'long'
            });
            
            const parts = formatter.formatToParts(new Date());
            const timeZonePart = parts.find(part => part.type === 'timeZoneName');
            const timezoneName = timeZonePart ? timeZonePart.value : timezone;
            
            // Format as "America/New_York (Eastern Standard Time)"
            return `${timezone} (${timezoneName})`;
        } catch (error) {
            console.error('Error getting timezone display name:', error);
            return timezone;
        }
    }

    /**
     * Clear timezone cache (call when business settings change)
     */
    static clearCache() {
        this._cachedTimezone = null;
        this._cacheExpiry = 0;
    }

    /**
     * Convert time from one timezone to another
     * @param {Date} date - Date to convert
     * @param {string} fromTimezone - Source timezone
     * @param {string} toTimezone - Target timezone (defaults to business timezone)
     * @returns {Promise<Date>} Converted date
     */
    static async convertTimezone(date, fromTimezone, toTimezone = null) {
        const targetTimezone = toTimezone || await this.getTimezone();
        
        // Get the date/time components in the source timezone
        const sourceTime = new Intl.DateTimeFormat('en-CA', {
            timeZone: fromTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(date);
        
        // Create a new date in the target timezone
        const year = parseInt(sourceTime.find(p => p.type === 'year').value);
        const month = parseInt(sourceTime.find(p => p.type === 'month').value) - 1;
        const day = parseInt(sourceTime.find(p => p.type === 'day').value);
        const hour = parseInt(sourceTime.find(p => p.type === 'hour').value);
        const minute = parseInt(sourceTime.find(p => p.type === 'minute').value);
        const second = parseInt(sourceTime.find(p => p.type === 'second').value);
        
        return new Date(year, month, day, hour, minute, second);
    }
}

module.exports = BusinessTimezoneService;