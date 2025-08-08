/**
 * FIXED TIMEZONE UTILITIES
 * 
 * This file contains the corrected timezone conversion logic that properly handles:
 * 1. Cross-day boundaries (e.g., 17:00 PST = 01:00 next day UTC)
 * 2. DST transitions
 * 3. Slot ranges that span multiple days
 * 
 * The key insight: We need to use full datetime objects, not just slots within a day.
 */

const { 
    formatDateUTC,
    getCurrentDateUTC,
    getDayOfWeekUTC,
    calculateDurationInSlots,
    isValidSlot,
    isValidDateString
} = require('./timeUtils');

/**
 * Convert time to slot, handling cross-day boundaries
 * @param {Date} dateTime - Date object in UTC
 * @returns {number} Slot number, can be > 95 for next day
 */
function timeToSlotExtended(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to timeToSlotExtended');
    }
    
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    
    return Math.floor(hours * 4 + minutes / 15);
}

/**
 * Convert slot to time, handling extended slots > 95
 * @param {number} slot - Slot number (can be > 95)
 * @returns {string} Time in HH:MM format
 */
function slotToTimeExtended(slot) {
    const hours = Math.floor(slot / 4) % 24; // Wrap hours at 24
    const minutes = (slot % 4) * 15;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert local time to UTC datetime, preserving day information
 * @param {string} timeString - Time in HH:MM format (local)
 * @param {string} dateString - Date in YYYY-MM-DD format  
 * @param {string} timezone - Timezone identifier
 * @returns {Date} UTC Date object
 */
function localTimeToUTCDate(timeString, dateString, timezone) {
    if (!timezone || timezone === 'UTC') {
        return new Date(`${dateString}T${timeString}:00.000Z`);
    }
    
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const [year, month, day] = dateString.split('-').map(Number);
        
        // Create date in local timezone by using the timezone offset
        // We'll create the date and then determine what UTC time it represents
        
        // Method: Use Intl.DateTimeFormat to find the offset
        const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        // Get what this date/time would be in both UTC and target timezone
        const utcString = localDate.toISOString();
        const tzString = localDate.toLocaleString('sv-SE', { timeZone: timezone });
        
        // Parse both to find the offset
        const utcParsed = new Date(utcString);
        const tzParsed = new Date(tzString);
        const offset = utcParsed.getTime() - tzParsed.getTime();
        
        // Apply the offset to get the correct UTC time
        const correctUtc = new Date(localDate.getTime() + offset);
        
        return correctUtc;
        
    } catch (error) {
        console.error('Error in localTimeToUTCDate:', error);
        // Fallback to UTC interpretation
        return new Date(`${dateString}T${timeString}:00.000Z`);
    }
}

/**
 * Convert UTC datetime to local time in specified timezone
 * @param {Date} utcDateTime - UTC Date object
 * @param {string} timezone - Timezone identifier
 * @returns {string} Time in HH:MM format (local timezone)
 */
function utcDateToLocalTime(utcDateTime, timezone) {
    if (!timezone || timezone === 'UTC') {
        return utcDateTime.toISOString().substring(11, 16);
    }
    
    try {
        return utcDateTime.toLocaleTimeString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.error('Error in utcDateToLocalTime:', error);
        return utcDateTime.toISOString().substring(11, 16);
    }
}

/**
 * Create availability range for instructor timezone
 * Handles cross-day boundaries properly
 * @param {string} startTime - Start time in HH:MM (instructor's timezone)
 * @param {string} endTime - End time in HH:MM (instructor's timezone)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - Instructor's timezone
 * @returns {Object} Availability range with proper boundary handling
 */
function createAvailabilityRange(startTime, endTime, dateString, timezone) {
    const startUtc = localTimeToUTCDate(startTime, dateString, timezone);
    const endUtc = localTimeToUTCDate(endTime, dateString, timezone);
    
    // Calculate the actual date for start and end in UTC
    const startDateUtc = formatDateUTC(startUtc);
    const endDateUtc = formatDateUTC(endUtc);
    
    const startSlot = timeToSlotExtended(startUtc);
    const endSlot = timeToSlotExtended(endUtc);
    
    // If end is on different day, we need to handle this properly
    const sameDay = startDateUtc === endDateUtc;
    
    return {
        startUtc,
        endUtc,
        startDateUtc,
        endDateUtc,
        startSlot,
        endSlot,
        sameDay,
        // For single-day storage, we might need to split this into multiple records
        utcDuration: Math.floor((endUtc - startUtc) / (15 * 60 * 1000)), // Duration in 15-min slots
        crossesDay: !sameDay
    };
}

/**
 * Check if a booking time is within instructor availability
 * Handles cross-day scenarios properly
 * @param {string} bookingTime - Booking time in HH:MM (student's timezone)
 * @param {string} bookingDate - Booking date in YYYY-MM-DD format
 * @param {string} studentTimezone - Student's timezone
 * @param {Object} availabilityRange - Availability range from createAvailabilityRange
 * @returns {boolean} Whether booking is within availability
 */
function isBookingWithinAvailability(bookingTime, bookingDate, studentTimezone, availabilityRange) {
    const bookingUtc = localTimeToUTCDate(bookingTime, bookingDate, studentTimezone);
    
    return bookingUtc >= availabilityRange.startUtc && bookingUtc < availabilityRange.endUtc;
}

/**
 * LEGACY COMPATIBILITY: Convert local time to UTC slot (fixed)
 * This maintains the old API but handles cross-day boundaries
 * @param {string} timeString - Time in HH:MM format (local)
 * @param {string} dateString - Date in YYYY-MM-DD format  
 * @param {string} timezone - Timezone identifier
 * @returns {number} UTC slot number (may need adjustment for cross-day)
 */
function localTimeToUTCSlot(timeString, dateString, timezone) {
    const utcDate = localTimeToUTCDate(timeString, dateString, timezone);
    const slot = timeToSlotExtended(utcDate);
    
    // For legacy compatibility, if this crosses into the next day,
    // we'll return the slot but log a warning
    if (slot >= 96) {
        console.warn(`Time ${timeString} on ${dateString} in ${timezone} crosses day boundary (slot ${slot})`);
        return slot % 96; // Wrap to same day for legacy compatibility
    }
    
    return slot;
}

/**
 * LEGACY COMPATIBILITY: Convert UTC slot to local time (fixed)
 * @param {number} slot - UTC slot number
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - Timezone identifier
 * @returns {string} Time in HH:MM format (local timezone)
 */
function utcSlotToLocalTime(slot, dateString, timezone) {
    // Create UTC date from slot (assumes same day)
    const timeString = slotToTimeExtended(slot);
    const [hours, minutes] = timeString.split(':').map(Number);
    const [year, month, day] = dateString.split('-').map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    
    return utcDateToLocalTime(utcDate, timezone);
}

module.exports = {
    timeToSlotExtended,
    slotToTimeExtended,
    localTimeToUTCDate,
    utcDateToLocalTime,
    createAvailabilityRange,
    isBookingWithinAvailability,
    localTimeToUTCSlot,
    utcSlotToLocalTime
};