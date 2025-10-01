/**
 * FRONTEND TIME UTILITIES
 * 
 * This file provides all time formatting and timezone utilities for the frontend.
 * Consolidates all time-related functionality in a single, maintainable file.
 */

// Time slot constants
const MAX_SLOT_INDEX = 95; // 0-95 slots per day (24 hours * 4 slots per hour - 1)

// ============================================================================
// CORE UTC TIME AND SLOT FUNCTIONS
// ============================================================================

/**
 * Convert UTC time to slot number
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
 * Format date in UTC as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateUTC(date) {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ============================================================================
// TIMEZONE FUNCTIONS
// ============================================================================

/**
 * Convert local time to UTC slot for user input
 * @param {string} timeString - Time in HH:MM format (local)
 * @param {string} dateString - Date in YYYY-MM-DD format  
 * @param {string} timezone - Timezone identifier
 * @returns {number} UTC slot number
 */
function localTimeToUTCSlot(timeString, dateString, timezone) {
    if (!timezone || timezone === 'UTC') {
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`);
        return timeToSlotUTC(utcDateTime);
    }
    
    try {
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
 * @param {number} slot - UTC slot number
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - Timezone identifier
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
        const localTimeString = utcDate.toLocaleTimeString(undefined, {
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
        console.error('Error detecting timezone:', error);
        return 'UTC';
    }
}

/**
 * Get timezone display name
 * @param {string} timezone - Timezone identifier
 * @returns {string} Display name like "Pacific Standard Time"
 */
function getTimezoneDisplayName(timezone) {
    if (!timezone || timezone === 'UTC') {
        return 'UTC';
    }
    
    try {
        const formatter = new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            timeZoneName: 'long'
        });
        
        const parts = formatter.formatToParts(new Date());
        const timeZonePart = parts.find(part => part.type === 'timeZoneName');
        return timeZonePart ? timeZonePart.value : timezone;
    } catch (error) {
        console.error('Error getting timezone display name:', error);
        return timezone;
    }
}

/**
 * Get timezone abbreviation
 * @param {string} timezone - Timezone identifier
 * @returns {string} Abbreviation like "PST" or "EST"
 */
function getTimezoneAbbreviation(timezone) {
    if (!timezone || timezone === 'UTC') {
        return 'UTC';
    }
    
    try {
        const formatter = new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            timeZoneName: 'short'
        });
        
        const parts = formatter.formatToParts(new Date());
        const timeZonePart = parts.find(part => part.type === 'timeZoneName');
        return timeZonePart ? timeZonePart.value : timezone;
    } catch (error) {
        console.error('Error getting timezone abbreviation:', error);
        return timezone;
    }
}

/**
 * Format slot for display with timezone and format preferences
 * @param {number} slot - Time slot number
 * @param {string} dateString - Date string
 * @param {string} timezone - Timezone identifier
 * @param {boolean} use12Hour - Whether to use 12-hour format
 * @returns {string} Formatted time display
 */
function formatSlotForDisplay(slot, dateString, timezone, use12Hour = false) {
    try {
        const localTime = utcSlotToLocalTime(slot, dateString, timezone);
        
        if (!use12Hour) {
            return localTime; // Already in 24-hour format
        }
        
        // Convert to 12-hour format
        const [hours, minutes] = localTime.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
        console.error('Error formatting slot for display:', error);
        return slotToTime(slot);
    }
}

// ============================================================================
// LOCAL SLOT FUNCTIONS (for UI)
// ============================================================================

/**
 * Convert local time to slot within same day
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Slot number (0-95)
 */
function timeToSlot(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return Math.floor(hours * 4 + minutes / 15);
}

/**
 * Convert slot to local time
 * @param {number} slot - Slot number (0-MAX_SLOT_INDEX)
 * @returns {string} Time in HH:MM format
 */
function slotToTime(slot) {
    // Handle invalid slot numbers gracefully
    if (typeof slot !== 'number' || isNaN(slot)) {
        console.warn(`Invalid slot number: ${slot}. Expected a number.`);
        return '00:00';
    }
    
    // Clamp slot to valid range
    let clampedSlot = slot;
    if (slot < 0) {
        console.warn(`Slot number ${slot} is below minimum (0). Using 0.`);
        clampedSlot = 0;
    } else if (slot > MAX_SLOT_INDEX) {
        console.warn(`Slot number ${slot} exceeds maximum (${MAX_SLOT_INDEX}). Using ${MAX_SLOT_INDEX}.`);
        clampedSlot = MAX_SLOT_INDEX;
    }
    
    const hours = Math.floor(clampedSlot / 4);
    const minutes = (clampedSlot % 4) * 15;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// ============================================================================
// DISPLAY FORMATTING FUNCTIONS
// ============================================================================

/**
 * Format time for display with timezone support
 * @param {Date|string} time - Time to format (Date object, ISO string, or HH:MM format)
 * @param {string} timezone - Optional timezone
 * @returns {string} Formatted time
 */
function formatTime(time, timezone) {
    // Handle different input types
    let date;
    
    if (typeof time === 'string') {
        // If it's a time-only string like "09:30", convert to 12-hour format
        if (/^\d{2}:\d{2}$/.test(time)) {
            const [hours, minutes] = time.split(':').map(Number);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        } else {
            // It's an ISO string or other date string
            date = new Date(time);
        }
    } else {
        date = time;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.error('Invalid date passed to formatTime:', time);
        return typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
    }
    
    if (!timezone || timezone === 'UTC') {
        // For UTC/no timezone, convert to 12-hour format
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    try {
        return date.toLocaleTimeString(undefined, {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return date.toISOString().substring(11, 16);
    }
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Check if date is current day
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is today
 */
function isCurrentDay(date) {
    if (!date) {
        return false;
    }
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(d.getTime())) {
        return false;
    }
    
    const today = new Date();
    return d.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is past
 */
function isPastDay(date) {
    if (!date) {
        return false;
    }
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Check if the date is valid
    if (isNaN(d.getTime())) {
        return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

/**
 * Check if time slot is in the past
 * @param {number} slot - Time slot
 * @param {string} dateString - Date string
 * @returns {boolean} Whether slot is past
 */
function isPastTimeSlot(slot, dateString) {
    const date = new Date(dateString);
    const slotTime = slotToTimeUTC(slot);
    const [hours, minutes] = slotTime.split(':').map(Number);
    date.setUTCHours(hours, minutes, 0, 0);
    
    return date < new Date();
}

/**
 * Get start of day
 * @param {Date|string} date - Date
 * @returns {Date} Start of day
 */
function getStartOfDay(date) {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} Whether dates are same day
 */
function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Core UTC functions
    timeToSlotUTC,
    slotToTimeUTC,
    createUTCDateFromSlot,
    formatDateUTC,
    
    // Timezone functions
    localTimeToUTCSlot,
    utcSlotToLocalTime,
    getUserTimezone,
    getTimezoneDisplayName,
    getTimezoneAbbreviation,
    formatSlotForDisplay,
    
    // Local slot functions (for UI)
    timeToSlot,
    slotToTime,
    
    // Display formatting
    formatTime,
    formatDate,
    isCurrentDay,
    isPastDay,
    isPastTimeSlot,
    getStartOfDay,
    isSameDay
};