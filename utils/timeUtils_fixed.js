const { 
    timeToSlotUTC,
    slotToTimeUTC,
    createUTCDateFromSlot,
    formatDateUTC,
    getCurrentDateUTC,
    getDayOfWeekUTC,
    calculateDurationInSlots,
    isValidSlot,
    isValidDateString
} = require('./timeUtils');

/**
 * FIXED: Convert local time to UTC slot using proper timezone handling
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
        const [hours, minutes] = timeString.split(':').map(Number);
        
        // Create a date in the target timezone using a more reliable method
        // We'll create two dates: one assuming UTC, one in local system time
        // Then compare their timezone representations to find the offset
        
        const baseDate = `${dateString}T${timeString}:00`;
        
        // Method: Create date as if it's in the target timezone
        // We'll use Date.UTC to create a baseline, then adjust for timezone
        const [year, month, day] = dateString.split('-').map(Number);
        
        // Start with a UTC baseline
        const utcBaseline = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
        
        // See what this UTC time looks like in the target timezone
        const formatter = new Intl.DateTimeFormat('sv-SE', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const formattedInTargetTZ = formatter.format(utcBaseline);
        const [datePart, timePart] = formattedInTargetTZ.split(' ');
        const [tzHours, tzMinutes] = timePart.split(':').map(Number);
        
        // Calculate the difference between what we want and what we got
        const wantedMinutes = hours * 60 + minutes;
        const gotMinutes = tzHours * 60 + tzMinutes;
        const offsetMinutes = wantedMinutes - gotMinutes;
        
        // Adjust the UTC baseline by this offset
        const correctedUTC = new Date(utcBaseline.getTime() + (offsetMinutes * 60 * 1000));
        
        return timeToSlotUTC(correctedUTC);
        
    } catch (error) {
        console.error('Error in fixed timezone conversion:', error);
        // Fallback to UTC interpretation
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`);
        return timeToSlotUTC(utcDateTime);
    }
}

/**
 * FIXED: Convert UTC slot to local time display format
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

module.exports = {
    localTimeToUTCSlot,
    utcSlotToLocalTime
};