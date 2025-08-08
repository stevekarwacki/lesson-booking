/**
 * Centralized UTC Time Utilities for Lesson Booking Application
 * 
 * This module provides consistent UTC-based time handling for:
 * - Time slot calculations (15-minute increments, 0-95 range)
 * - Date formatting and parsing
 * - Timezone-aware operations
 * 
 * All functions work in UTC to ensure consistency across timezones.
 */

/**
 * Convert UTC time to slot number (15-minute increments)
 * @param {Date|string} dateTime - Date object or ISO string
 * @returns {number} Slot number (0-95, where 0 = 00:00 UTC, 95 = 23:45 UTC)
 */
function timeToSlotUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to timeToSlotUTC');
    }
    
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    
    return Math.floor(hours * 4 + minutes / 15);
}

/**
 * Convert slot number to UTC time string
 * @param {number} slot - Slot number (0-95)
 * @returns {string} Time in HH:MM format (UTC)
 */
function slotToTimeUTC(slot) {
    if (slot < 0 || slot > 95) {
        throw new Error(`Invalid slot number: ${slot}. Must be between 0 and 95.`);
    }
    
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Create a UTC date from date string and time slot
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} slot - Time slot (0-95)
 * @returns {Date} UTC Date object
 */
function createUTCDateFromSlot(dateString, slot) {
    const timeString = slotToTimeUTC(slot);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Parse the date string and create UTC date
    const [year, month, day] = dateString.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    
    return utcDate;
}

/**
 * Get current UTC slot number
 * @returns {number} Current slot number based on UTC time
 */
function getCurrentSlotUTC() {
    return timeToSlotUTC(new Date());
}

/**
 * Get current UTC date string in YYYY-MM-DD format
 * @returns {string} Current date in UTC
 */
function getCurrentDateUTC() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Get day of week for a date in UTC (0 = Sunday, 6 = Saturday)
 * @param {Date|string} dateTime - Date object or ISO string
 * @returns {number} Day of week (0-6)
 */
function getDayOfWeekUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to getDayOfWeekUTC');
    }
    
    return date.getUTCDay();
}

/**
 * Calculate duration between two times in slots
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time
 * @returns {number} Duration in 15-minute slots
 */
function calculateDurationInSlots(startTime, endTime) {
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid dates provided to calculateDurationInSlots');
    }
    
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (15 * 60 * 1000)); // 15-minute slots
}

/**
 * Check if a date/time is in the past (UTC)
 * @param {Date|string} dateTime - Date to check
 * @returns {boolean} True if date is in the past
 */
function isPastUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    const now = new Date();
    
    return date.getTime() < now.getTime();
}

/**
 * Check if a specific time slot on a date is in the past (UTC)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} slot - Time slot (0-95)
 * @returns {boolean} True if slot time is in the past
 */
function isSlotPastUTC(dateString, slot) {
    const slotDateTime = createUTCDateFromSlot(dateString, slot);
    return isPastUTC(slotDateTime);
}

/**
 * Check if two dates are the same UTC day
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same UTC day
 */
function isSameDayUTC(date1, date2) {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
}

/**
 * Check if a date is today in UTC
 * @param {Date|string} dateTime - Date to check
 * @returns {boolean} True if date is today in UTC
 */
function isTodayUTC(dateTime) {
    return isSameDayUTC(dateTime, new Date());
}

/**
 * Format date to YYYY-MM-DD in UTC
 * @param {Date|string} dateTime - Date to format
 * @returns {string} Formatted date string
 */
function formatDateUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to formatDateUTC');
    }
    
    return date.toISOString().split('T')[0];
}

/**
 * Validate time slot range
 * @param {number} slot - Slot to validate
 * @returns {boolean} True if valid slot
 */
function isValidSlot(slot) {
    return Number.isInteger(slot) && slot >= 0 && slot <= 95;
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid format
 */
function isValidDateString(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Add/subtract days from a date in UTC
 * @param {Date|string} dateTime - Starting date
 * @param {number} days - Number of days to add (negative to subtract)
 * @returns {Date} New UTC date
 */
function addDaysUTC(dateTime, days) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : new Date(dateTime);
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to addDaysUTC');
    }
    
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/**
 * Get start of week (Sunday) for a given date in UTC
 * @param {Date|string} dateTime - Date to get week start for
 * @returns {Date} Start of week in UTC
 */
function getWeekStartUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : new Date(dateTime);
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to getWeekStartUTC');
    }
    
    const dayOfWeek = date.getUTCDay();
    const diff = date.getUTCDate() - dayOfWeek;
    
    const weekStart = new Date(date);
    weekStart.setUTCDate(diff);
    weekStart.setUTCHours(0, 0, 0, 0);
    
    return weekStart;
}

/**
 * Get end of week (Saturday) for a given date in UTC
 * @param {Date|string} dateTime - Date to get week end for
 * @returns {Date} End of week in UTC
 */
function getWeekEndUTC(dateTime) {
    const weekStart = getWeekStartUTC(dateTime);
    return addDaysUTC(weekStart, 6);
}

/**
 * Convert local time to UTC slot for user input
 * Simplified and reliable implementation
 * @param {string} timeString - Time in HH:MM format (local)
 * @param {string} dateString - Date in YYYY-MM-DD format  
 * @param {string} timezone - Timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @returns {number} UTC slot number
 */
function localTimeToUTCSlot(timeString, dateString, timezone) {
    if (!timezone || timezone === 'UTC') {
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`);
        return timeToSlotUTC(utcDateTime);
    }
    
    try {
        // Create a date object representing the time in the target timezone
        const [year, month, day] = dateString.split('-').map(Number);
        const [hours, minutes] = timeString.split(':').map(Number);
        
        // Create the local date as if it were in the system timezone
        const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        // Format this date to see what it looks like in the target timezone
        const targetTimeString = localDate.toLocaleString('sv-SE', { timeZone: timezone });
        const systemTimeString = localDate.toLocaleString('sv-SE');
        
        // Parse both strings to calculate the offset
        const targetTime = new Date(targetTimeString).getTime();
        const systemTime = new Date(systemTimeString).getTime();
        const offset = systemTime - targetTime;
        
        // Create the actual UTC time by adjusting the local time
        const utcTime = new Date(localDate.getTime() + offset);
        
        return timeToSlotUTC(utcTime);
        
    } catch (error) {
        console.error('Error in timezone conversion:', error);
        // Fallback to UTC
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`);
        return timeToSlotUTC(utcDateTime);
    }
}

/**
 * Convert UTC slot to local time display format
 * Simplified and reliable implementation
 * @param {number} slot - UTC slot number
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - Timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @returns {string} Time in HH:MM format (local timezone)
 */
function utcSlotToLocalTime(slot, dateString, timezone) {
    if (!timezone || timezone === 'UTC') {
        return slotToTimeUTC(slot);
    }
    
    try {
        // Create UTC date from slot
        const utcDate = createUTCDateFromSlot(dateString, slot);
        
        // Use toLocaleTimeString to convert to target timezone
        const localTimeString = utcDate.toLocaleTimeString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        return localTimeString;
        
    } catch (error) {
        console.error('Error converting UTC slot to local time:', error);
        return slotToTimeUTC(slot);
    }
}



/**
 * Get user's detected timezone
 * @returns {string} Timezone identifier
 */
function getUserTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        console.error('Error detecting user timezone:', error);
        return 'UTC';
    }
}

/**
 * Format time for display in user's timezone
 * @param {number} slot - UTC slot number
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - User's timezone
 * @param {boolean} use12Hour - Whether to format in 12-hour format
 * @returns {string} Formatted time string
 */
function formatSlotForDisplay(slot, dateString, timezone, use12Hour = true) {
    const localTime = utcSlotToLocalTime(slot, dateString, timezone);
    
    if (!use12Hour) {
        return localTime;
    }
    
    // Convert to 12-hour format
    const [hours, minutes] = localTime.split(':').map(Number);
    let displayHour = hours % 12;
    if (displayHour === 0) displayHour = 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

module.exports = {
    // Core slot conversion functions
    timeToSlotUTC,
    slotToTimeUTC,
    createUTCDateFromSlot,
    
    // Current time functions
    getCurrentSlotUTC,
    getCurrentDateUTC,
    
    // Date utility functions
    getDayOfWeekUTC,
    calculateDurationInSlots,
    formatDateUTC,
    addDaysUTC,
    getWeekStartUTC,
    getWeekEndUTC,
    
    // Validation functions
    isPastUTC,
    isSlotPastUTC,
    isSameDayUTC,
    isTodayUTC,
    isValidSlot,
    isValidDateString,
    
    // Timezone conversion functions
    localTimeToUTCSlot,
    utcSlotToLocalTime,
    getUserTimezone,
    formatSlotForDisplay
};