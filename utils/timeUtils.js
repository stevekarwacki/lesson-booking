// Time slot constants
const MAX_SLOT_INDEX = 95; // 0-95 slots per day (24 hours * 4 slots per hour - 1)

/**
 * Convert UTC time to slot number
 * @param {Date|string} dateTime - Date object or ISO string
 * @returns {number} Slot number (0-MAX_SLOT_INDEX, where 0 = 00:00 UTC, MAX_SLOT_INDEX = 23:45 UTC)
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
 * @param {number} slot - Slot number (0-MAX_SLOT_INDEX)
 * @returns {string} Time in HH:MM format (UTC)
 */
function slotToTimeUTC(slot) {
    if (typeof slot !== 'number' || slot < 0 || slot > MAX_SLOT_INDEX) {
        throw new Error(`Invalid slot number: ${slot}. Must be between 0 and ${MAX_SLOT_INDEX}.`);
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

/**
 * Get current date in UTC as YYYY-MM-DD
 * @returns {string} Current UTC date
 */
function getCurrentDateUTC() {
    return formatDateUTC(new Date());
}

/**
 * Get day of week for a date in UTC (0 = Sunday, 6 = Saturday)
 * @param {Date|string} dateTime - Date object or date string
 * @returns {number} Day of week (0-6)
 */
function getDayOfWeekUTC(dateTime) {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.getUTCDay();
}

/**
 * Calculate duration between two dates in 15-minute slots
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Duration in slots
 */
function calculateDurationInSlots(startDate, endDate) {
    const durationMs = endDate.getTime() - startDate.getTime();
    return Math.floor(durationMs / (15 * 60 * 1000));
}

/**
 * Check if slot number is valid
 * @param {number} slot - Slot number to validate
 * @returns {boolean} Whether slot is valid
 */
function isValidSlot(slot) {
    return typeof slot === 'number' && slot >= 0 && slot <= MAX_SLOT_INDEX;
}

/**
 * Check if date string is valid YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Whether date string is valid
 */
function isValidDateString(dateString) {
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString + 'T00:00:00.000Z');
    return !isNaN(date.getTime()) && dateString === formatDateUTC(date);
}

// ============================================================================
// TIMEZONE CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert local time to UTC slot for user input
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

// ============================================================================
// INSTRUCTOR AVAILABILITY FUNCTIONS
// ============================================================================

/**
 * Convert local time to slot within same day (no timezone conversion)
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Slot number (0-95)
 */
function timeToLocalSlot(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return Math.floor(hours * 4 + minutes / 15);
}

/**
 * Convert slot to local time
 * @param {number} slot - Slot number (0-95)
 * @returns {string} Time in HH:MM format
 */
function localSlotToTime(slot) {
    if (slot < 0 || slot > 95) {
        throw new Error(`Invalid slot number: ${slot}. Must be between 0 and 95.`);
    }
    
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Create availability record in instructor's local timezone
 * @param {string} startTime - Start time in HH:MM (instructor local)
 * @param {string} endTime - End time in HH:MM (instructor local) 
 * @param {number} dayOfWeek - Day of week (0=Sunday)
 * @param {string} instructorTimezone - Instructor's timezone
 * @returns {Object} Availability record for database storage
 */
function createLocalAvailabilityRecord(startTime, endTime, dayOfWeek, instructorTimezone) {
    // Calculate slots in LOCAL timezone (no cross-day issues!)
    const startSlot = timeToLocalSlot(startTime);
    const endSlot = timeToLocalSlot(endTime);
    const duration = endSlot - startSlot;
    
    if (duration <= 0) {
        throw new Error(`Invalid time range: ${startTime} to ${endTime}`);
    }
    
    return {
        day_of_week: dayOfWeek,
        start_slot: startSlot,
        duration: duration,
        instructor_timezone: instructorTimezone || 'UTC',
        local_start_time: startTime,
        local_end_time: endTime
    };
}

/**
 * Check if a booking is within instructor availability
 * @param {string} bookingTime - Booking time (student timezone)
 * @param {string} bookingDate - Booking date YYYY-MM-DD
 * @param {string} studentTimezone - Student's timezone
 * @param {Object} availabilityRecord - Instructor availability record
 * @returns {boolean} Whether booking is available
 */
function isBookingAvailable(bookingTime, bookingDate, studentTimezone, availabilityRecord) {
    try {
        // Convert booking to UTC
        const bookingUtcSlot = localTimeToUTCSlot(bookingTime, bookingDate, studentTimezone);
        
        // Convert instructor availability to UTC for the same date
        const instructorStartUtcSlot = localTimeToUTCSlot(
            availabilityRecord.local_start_time,
            bookingDate, 
            availabilityRecord.instructor_timezone
        );
        const instructorEndUtcSlot = localTimeToUTCSlot(
            availabilityRecord.local_end_time,
            bookingDate,
            availabilityRecord.instructor_timezone
        );
        
        // Handle cross-day scenario in UTC
        if (instructorEndUtcSlot < instructorStartUtcSlot) {
            // Availability crosses midnight UTC
            return bookingUtcSlot >= instructorStartUtcSlot || bookingUtcSlot <= instructorEndUtcSlot;
        } else {
            // Normal case: availability within same UTC day
            return bookingUtcSlot >= instructorStartUtcSlot && bookingUtcSlot <= instructorEndUtcSlot;
        }
        
    } catch (error) {
        console.error('Error checking booking availability:', error);
        return false;
    }
}

// ============================================================================
// FRONTEND COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Legacy compatibility: Convert time to slot (assumes local time)
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Slot number
 * @deprecated Use timeToLocalSlot or localTimeToUTCSlot instead
 */
function timeToSlot(timeString) {
    console.warn('timeToSlot is deprecated. Use timeToLocalSlot or localTimeToUTCSlot instead.');
    return timeToLocalSlot(timeString);
}

/**
 * Legacy compatibility: Convert slot to time
 * @param {number} slot - Slot number
 * @returns {string} Time in HH:MM format
 * @deprecated Use localSlotToTime or utcSlotToLocalTime instead
 */
function slotToTime(slot) {
    console.warn('slotToTime is deprecated. Use localSlotToTime or utcSlotToLocalTime instead.');
    return localSlotToTime(slot);
}

/**
 * Format time for display with timezone support
 * @param {Date|string} time - Time to format
 * @param {string} timezone - Optional timezone
 * @returns {string} Formatted time
 */
function formatTime(time, timezone) {
    const date = typeof time === 'string' ? new Date(time) : time;
    
    if (!timezone || timezone === 'UTC') {
        return date.toISOString().substring(11, 16);
    }
    
    try {
        return date.toLocaleTimeString(undefined, {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
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
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} Whether date is past
 */
function isPastDay(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
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

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Core UTC functions
    timeToSlotUTC,
    slotToTimeUTC,
    createUTCDateFromSlot,
    formatDateUTC,
    getCurrentDateUTC,
    getDayOfWeekUTC,
    calculateDurationInSlots,
    isValidSlot,
    isValidDateString,
    
    // Timezone conversion
    localTimeToUTCSlot,
    utcSlotToLocalTime,
    getUserTimezone,
    
    // Instructor availability
    timeToLocalSlot,
    localSlotToTime,
    createLocalAvailabilityRecord,
    isBookingAvailable,
    
    // Frontend compatibility (with deprecation warnings)
    timeToSlot,
    slotToTime,
    formatTime,
    formatDate,
    isCurrentDay,
    isPastDay,
    isPastTimeSlot,
    getStartOfDay
};