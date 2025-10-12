/**
 * FRONTEND DATE UTILITIES
 * 
 * Provides standardized date creation, parsing, and comparison utilities for the frontend.
 * All comparisons use timestamps for consistency across timezones.
 * Builds on existing timeFormatting.js infrastructure.
 */

import { getUserTimezone } from './timeFormatting.js';

// ============================================================================
// CORE DATE CREATION FUNCTIONS
// ============================================================================

/**
 * Create a date helper object with timestamp and timezone
 * @param {Date|string|number|null} date - Date input
 * @param {string|null} timezone - Timezone identifier
 * @returns {Object} Date helper object
 */
function createDateHelper(date = null, timezone = null) {
    const tz = timezone || getUserTimezone();
    const timestamp = parseToTimestamp(date);
    
    return {
        timestamp,
        timezone: tz,
        
        // Comparison methods
        isSameDay: (other) => isSameDay({ timestamp, timezone: tz }, other),
        isToday: () => isToday({ timestamp, timezone: tz }),
        isYesterday: () => isYesterday({ timestamp, timezone: tz }),
        isTomorrow: () => isTomorrow({ timestamp, timezone: tz }),
        isPast: () => isPast({ timestamp, timezone: tz }),
        isFuture: () => isFuture({ timestamp, timezone: tz }),
        isValid: () => !isNaN(timestamp),
        
        // Manipulation methods
        addDays: (days) => createDateHelper(new Date(timestamp + (days * 24 * 60 * 60 * 1000)), tz),
        addHours: (hours) => createDateHelper(new Date(timestamp + (hours * 60 * 60 * 1000)), tz),
        addMinutes: (minutes) => createDateHelper(new Date(timestamp + (minutes * 60 * 1000)), tz),
        addWeeks: (weeks) => createDateHelper(new Date(timestamp + (weeks * 7 * 24 * 60 * 60 * 1000)), tz),
        addMonths: (months) => {
            const date = new Date(timestamp);
            date.setMonth(date.getMonth() + months);
            return createDateHelper(date, tz);
        },
        
        // Business Logic Helpers
        isWithinCancellationWindow: (hours = 24) => {
            const now = Date.now();
            return (timestamp - now) < (hours * 60 * 60 * 1000);
        },
        
        isSubscriptionActive: (periodEndHelper) => {
            return timestamp < periodEndHelper.toTimestamp();
        },
        
        formatForEmail: (locale = 'en-US') => {
            return new Date(timestamp).toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            });
        },
        
        // Advanced Comparison Functions
        diffInHours: (other) => {
            const otherTimestamp = typeof other === 'object' && other.toTimestamp ? other.toTimestamp() : other;
            return Math.floor((otherTimestamp - timestamp) / (60 * 60 * 1000));
        },
        
        isBetween: (start, end) => {
            const startTimestamp = typeof start === 'object' && start.toTimestamp ? start.toTimestamp() : start;
            const endTimestamp = typeof end === 'object' && end.toTimestamp ? end.toTimestamp() : end;
            return timestamp >= startTimestamp && timestamp <= endTimestamp;
        },
        addMilliseconds: (ms) => createDateHelper(new Date(timestamp + ms), tz),
        startOfDay: () => startOfDay({ timestamp, timezone: tz }),
        endOfDay: () => endOfDay({ timestamp, timezone: tz }),
        
        // Output methods
        toTimestamp: () => timestamp,
        toDateString: () => toDateString({ timestamp, timezone: tz }),
        toTimeString: () => toTimeString({ timestamp, timezone: tz }),
        toDateTime: () => toDateTime({ timestamp, timezone: tz }),
        toDate: () => new Date(timestamp)
    };
}

/**
 * Create date helper for today
 * @param {string|null} timezone - Timezone identifier
 * @returns {Object} Date helper for today
 */
function today(timezone = null) {
    return createDateHelper(new Date(), timezone);
}

/**
 * Create date helper from string
 * @param {string} dateString - Date string
 * @param {string|null} timezone - Timezone identifier
 * @returns {Object} Date helper object
 */
function fromString(dateString, timezone = null) {
    return createDateHelper(dateString, timezone);
}

/**
 * Create date helper from timestamp
 * @param {number} timestamp - Unix timestamp
 * @param {string|null} timezone - Timezone identifier
 * @returns {Object} Date helper object
 */
function fromTimestamp(timestamp, timezone = null) {
    return createDateHelper(new Date(timestamp), timezone);
}

// ============================================================================
// DATE PARSING FUNCTIONS
// ============================================================================

/**
 * Parse various date inputs to timestamp
 * @param {Date|string|number|null} input - Date input
 * @returns {number} Unix timestamp
 */
function parseToTimestamp(input) {
    if (!input) return Date.now();
    if (typeof input === 'number') return input;
    if (input instanceof Date) return input.getTime();
    
    if (typeof input === 'string') {
        // YYYY-MM-DD format - parse as local date to avoid timezone issues
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            const [year, month, day] = input.split('-').map(Number);
            return new Date(year, month - 1, day).getTime();
        }
        // Other formats - use standard parsing
        return new Date(input).getTime();
    }
    
    throw new Error(`Invalid date input: ${input}`);
}

/**
 * Extract date string from various inputs
 * @param {Date|string|Object} dateInput - Date input
 * @param {string|null} timezone - Timezone identifier
 * @returns {string|null} YYYY-MM-DD string
 */
function extractDateString(dateInput, timezone = null) {
    if (!dateInput) return null;
    
    if (typeof dateInput === 'string') {
        // If it's already YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
        }
        // If it's a full datetime string, extract date part
        return dateInput.split('T')[0];
    }
    
    // If it's a Date object or timestamp
    const timestamp = parseToTimestamp(dateInput);
    return toDateString({ timestamp, timezone: timezone || getUserTimezone() });
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Check if two dates are the same day
 * @param {Object} dateHelper1 - First date helper
 * @param {Object} dateHelper2 - Second date helper
 * @returns {boolean} Whether dates are same day
 */
function isSameDay(dateHelper1, dateHelper2) {
    const date1Str = toDateString(dateHelper1);
    const date2Str = toDateString(dateHelper2);
    return date1Str === date2Str;
}

/**
 * Check if date is today
 * @param {Object} dateHelper - Date helper object
 * @returns {boolean} Whether date is today
 */
function isToday(dateHelper) {
    const todayHelper = today(dateHelper.timezone);
    return isSameDay(dateHelper, todayHelper);
}

/**
 * Check if date is yesterday
 * @param {Object} dateHelper - Date helper object
 * @returns {boolean} Whether date is yesterday
 */
function isYesterday(dateHelper) {
    const yesterdayHelper = today(dateHelper.timezone).addDays(-1);
    return isSameDay(dateHelper, yesterdayHelper);
}

/**
 * Check if date is tomorrow
 * @param {Object} dateHelper - Date helper object
 * @returns {boolean} Whether date is tomorrow
 */
function isTomorrow(dateHelper) {
    const tomorrowHelper = today(dateHelper.timezone).addDays(1);
    return isSameDay(dateHelper, tomorrowHelper);
}

/**
 * Check if date is in the past
 * @param {Object} dateHelper - Date helper object
 * @returns {boolean} Whether date is past
 */
function isPast(dateHelper) {
    return dateHelper.timestamp < Date.now();
}

/**
 * Check if date is in the future
 * @param {Object} dateHelper - Date helper object
 * @returns {boolean} Whether date is future
 */
function isFuture(dateHelper) {
    return dateHelper.timestamp > Date.now();
}

// ============================================================================
// MANIPULATION FUNCTIONS
// ============================================================================

/**
 * Get start of day for a date
 * @param {Object} dateHelper - Date helper object
 * @returns {Object} Date helper for start of day
 */
function startOfDay(dateHelper) {
    const date = new Date(dateHelper.timestamp);
    const startOfDayLocal = new Date(
        date.getFullYear(),
        date.getMonth(), 
        date.getDate(),
        0, 0, 0, 0
    );
    return createDateHelper(startOfDayLocal, dateHelper.timezone);
}

/**
 * Get end of day for a date
 * @param {Object} dateHelper - Date helper object
 * @returns {Object} Date helper for end of day
 */
function endOfDay(dateHelper) {
    return startOfDay(dateHelper).addDays(1).addMilliseconds(-1);
}

// ============================================================================
// OUTPUT FUNCTIONS
// ============================================================================

/**
 * Convert to date string (YYYY-MM-DD)
 * @param {Object} dateHelper - Date helper object
 * @returns {string} Date string in YYYY-MM-DD format
 */
function toDateString(dateHelper) {
    const date = new Date(dateHelper.timestamp);
    return date.toLocaleDateString('en-CA', { timeZone: dateHelper.timezone });
}

/**
 * Convert to time string (HH:MM)
 * @param {Object} dateHelper - Date helper object
 * @returns {string} Time string in HH:MM format
 */
function toTimeString(dateHelper) {
    const date = new Date(dateHelper.timestamp);
    return date.toLocaleTimeString('en-GB', { 
        timeZone: dateHelper.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Convert to datetime string (YYYY-MM-DDTHH:MM)
 * @param {Object} dateHelper - Date helper object
 * @returns {string} DateTime string
 */
function toDateTime(dateHelper) {
    return `${toDateString(dateHelper)}T${toTimeString(dateHelper)}`;
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Filter items for today
 * @param {Array} items - Items to filter
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterToday(items, dateField = 'date', timezone = null) {
    const todayHelper = today(timezone);
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.isToday();
    });
}

/**
 * Filter items for yesterday
 * @param {Array} items - Items to filter
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterYesterday(items, dateField = 'date', timezone = null) {
    const yesterdayHelper = today(timezone).addDays(-1);
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.isSameDay(yesterdayHelper);
    });
}

/**
 * Filter items for this week
 * @param {Array} items - Items to filter
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterThisWeek(items, dateField = 'date', timezone = null) {
    const now = today(timezone);
    const startOfWeek = now.addDays(-now.toDate().getDay());
    const endOfWeek = startOfWeek.addDays(7);
    
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.toTimestamp() >= startOfWeek.toTimestamp() && 
               itemHelper.toTimestamp() < endOfWeek.toTimestamp();
    });
}

/**
 * Filter items for date range
 * @param {Array} items - Items to filter
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterDateRange(items, startDate, endDate, dateField = 'date', timezone = null) {
    const start = fromString(startDate, timezone).startOfDay();
    const end = fromString(endDate, timezone).endOfDay();
    
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.toTimestamp() >= start.toTimestamp() && 
               itemHelper.toTimestamp() <= end.toTimestamp();
    });
}

/**
 * Filter items for past dates
 * @param {Array} items - Items to filter
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterPast(items, dateField = 'date', timezone = null) {
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.isPast();
    });
}

/**
 * Filter items for future dates
 * @param {Array} items - Items to filter
 * @param {string} dateField - Field name containing date
 * @param {string|null} timezone - Timezone identifier
 * @returns {Array} Filtered items
 */
function filterFuture(items, dateField = 'date', timezone = null) {
    return items.filter(item => {
        const itemHelper = fromString(item[dateField], timezone);
        return itemHelper.isFuture();
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Core creation functions
    createDateHelper,
    today,
    fromString,
    fromTimestamp,
    
    // Parsing functions
    parseToTimestamp,
    extractDateString,
    
    // Comparison functions
    isSameDay,
    isToday,
    isYesterday,
    isTomorrow,
    isPast,
    isFuture,
    
    // Manipulation functions
    startOfDay,
    endOfDay,
    
    // Output functions
    toDateString,
    toTimeString,
    toDateTime,
    
    // Filtering functions
    filterToday,
    filterYesterday,
    filterThisWeek,
    filterDateRange,
    filterPast,
    filterFuture
};
