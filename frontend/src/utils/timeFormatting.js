/**
 * UTC-Based Time Utilities for Frontend
 * 
 * All time functions now work consistently in UTC to avoid timezone issues.
 * For user display, times will be shown in UTC but can be converted to local time zones in the future.
 */

/**
 * Formats time slot for display in user's timezone
 * @param {string} time - Time in HH:MM format (UTC)
 * @param {string} [timezone] - User's timezone (auto-detected if not provided)
 * @returns {string} - Formatted time (e.g., "9:30 AM EST")
 */
export const formatTime = (time, timezone = null) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    const [hours, minutes] = time.split(':').map(Number)
    
    // If timezone is UTC, format as before
    if (timezone === 'UTC') {
        let displayHour = hours % 12
        if (displayHour === 0) displayHour = 12
        const period = hours >= 12 ? 'PM' : 'AM'
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period} UTC`
    }
    
    // For non-UTC timezones, we need to convert the time
    try {
        // Create a date for today with this time in UTC
        const today = getCurrentDateUTC()
        const utcDateTime = new Date(`${today}T${time}:00.000Z`)
        
        // Format in the user's timezone
        const localTime = utcDateTime.toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
        
        // Get timezone abbreviation
        const timezoneName = utcDateTime.toLocaleDateString('en-US', {
            timeZone: timezone,
            timeZoneName: 'short'
        }).split(', ')[1] || timezone
        
        return `${localTime} ${timezoneName}`
    } catch (error) {
        console.error('Error formatting time with timezone:', error)
        // Fallback to UTC display
        let displayHour = hours % 12
        if (displayHour === 0) displayHour = 12
        const period = hours >= 12 ? 'PM' : 'AM'
        return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period} UTC`
    }
}

/**
 * Checks if two dates are the same UTC calendar day
 * @param {Date|string} date1 - First date to compare
 * @param {Date|string} date2 - Second date to compare
 * @returns {boolean} - Whether dates are the same UTC calendar day
 */
export const isSameDayUTC = (date1, date2) => {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2
    return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0]
}

/**
 * Gets start of day (midnight) for a given date in UTC
 * @param {Date|string} date - Date to get start of day for
 * @returns {Date} - New date set to start of day in UTC
 */
export const getStartOfDayUTC = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date)
    const year = dateObj.getUTCFullYear()
    const month = dateObj.getUTCMonth()
    const day = dateObj.getUTCDate()
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
}

/**
 * Check if a date is today in UTC
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is today in UTC
 */
export const isCurrentDayUTC = (date) => {
    return isSameDayUTC(date, new Date())
}

/**
 * Check if a date is in the past in UTC
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export const isPastDayUTC = (date) => {
    const checkDate = getStartOfDayUTC(date)
    const today = getStartOfDayUTC(new Date())
    return checkDate < today
}

/**
 * Check if a specific time slot on a date is in the past (UTC)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number|string} timeSlot - Time slot number or string
 * @returns {boolean} - True if slot time is in the past
 */
export const isPastTimeSlotUTC = (dateString, timeSlot) => {
    const slotNum = typeof timeSlot === 'string' ? parseInt(timeSlot) : timeSlot
    
    // If the entire day is past, then the slot is past
    if (isPastDayUTC(dateString)) return true
    
    // If it's today, check the specific time slot
    if (isCurrentDayUTC(dateString)) {
        const now = new Date()
        const currentSlot = timeToSlotUTC(now)
        return currentSlot >= slotNum
    }
    
    return false
}

/**
 * Convert UTC time to slot number (15-minute increments)
 * @param {Date|string} dateTime - Date object or ISO string
 * @returns {number} Slot number (0-95, where 0 = 00:00 UTC, 95 = 23:45 UTC)
 */
export const timeToSlotUTC = (dateTime) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to timeToSlotUTC')
    }
    
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    
    return Math.floor(hours * 4 + minutes / 15)
}

/**
 * Convert slot number to UTC time string
 * @param {number} slot - Slot number (0-95)
 * @returns {string} Time in HH:MM format (UTC)
 */
export const slotToTimeUTC = (slot) => {
    if (slot < 0 || slot > 95) {
        throw new Error(`Invalid slot number: ${slot}. Must be between 0 and 95.`)
    }
    
    const hours = Math.floor(slot / 4)
    const minutes = (slot % 4) * 15
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Create a UTC date from date string and time slot
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} slot - Time slot (0-95)
 * @returns {Date} UTC Date object
 */
export const createUTCDateFromSlot = (dateString, slot) => {
    const timeString = slotToTimeUTC(slot)
    const [hours, minutes] = timeString.split(':').map(Number)
    
    // Parse the date string and create UTC date
    const [year, month, day] = dateString.split('-').map(Number)
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
    
    return utcDate
}

/**
 * Get current UTC slot number
 * @returns {number} Current slot number based on UTC time
 */
export const getCurrentSlotUTC = () => {
    return timeToSlotUTC(new Date())
}

/**
 * Get current UTC date string in YYYY-MM-DD format
 * @returns {string} Current date in UTC
 */
export const getCurrentDateUTC = () => {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

/**
 * Get day of week for a date in UTC (0 = Sunday, 6 = Saturday)
 * @param {Date|string} dateTime - Date object or ISO string
 * @returns {number} Day of week (0-6)
 */
export const getDayOfWeekUTC = (dateTime) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to getDayOfWeekUTC')
    }
    
    return date.getUTCDay()
}

/**
 * Calculate duration between two times in slots
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time
 * @returns {number} Duration in 15-minute slots
 */
export const calculateDurationInSlotsUTC = (startTime, endTime) => {
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid dates provided to calculateDurationInSlotsUTC')
    }
    
    const diffMs = end.getTime() - start.getTime()
    return Math.ceil(diffMs / (15 * 60 * 1000)) // 15-minute slots
}

/**
 * Format date to YYYY-MM-DD in UTC
 * @param {Date|string} dateTime - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateUTC = (dateTime) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to formatDateUTC')
    }
    
    return date.toISOString().split('T')[0]
}

/**
 * Add/subtract days from a date in UTC
 * @param {Date|string} dateTime - Starting date
 * @param {number} days - Number of days to add (negative to subtract)
 * @returns {Date} New UTC date
 */
export const addDaysUTC = (dateTime, days) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : new Date(dateTime)
    
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date provided to addDaysUTC')
    }
    
    const result = new Date(date)
    result.setUTCDate(result.getUTCDate() + days)
    return result
}

// Legacy function compatibility (deprecated - use UTC versions)
export const timeToSlot = (timeStr) => {
    console.warn('timeToSlot is deprecated, use timeToSlotUTC with full date instead')
    const [hours, minutes] = timeStr.split(':').map(Number)
    return (hours * 4) + Math.floor(minutes / 15)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const slotToTime = (slot) => {
    console.warn('slotToTime is deprecated, use slotToTimeUTC instead')
    return slotToTimeUTC(slot)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const isPastTimeSlot = (date, timeSlot) => {
    console.warn('isPastTimeSlot is deprecated, use isPastTimeSlotUTC instead')
    return isPastTimeSlotUTC(formatDateUTC(date), timeSlot)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const isCurrentDay = (date) => {
    console.warn('isCurrentDay is deprecated, use isCurrentDayUTC instead')
    return isCurrentDayUTC(date)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const isPastDay = (date) => {
    console.warn('isPastDay is deprecated, use isPastDayUTC instead')
    return isPastDayUTC(date)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const isSameDay = (date1, date2) => {
    console.warn('isSameDay is deprecated, use isSameDayUTC instead')
    return isSameDayUTC(date1, date2)
}

// Legacy function compatibility (deprecated - use UTC versions)
export const getStartOfDay = (date) => {
    console.warn('getStartOfDay is deprecated, use getStartOfDayUTC instead')
    return getStartOfDayUTC(date)
}

/**
 * TIMEZONE CONVERSION FUNCTIONS
 */

/**
 * Get the user's current timezone
 * @returns {string} IANA timezone identifier
 */
export const getUserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
        console.warn('Could not detect user timezone, defaulting to UTC')
        return 'UTC'
    }
}

/**
 * Convert UTC slot to local time in user's timezone
 * @param {number} slot - UTC slot number (0-95)  
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} [timezone] - User's timezone (auto-detected if not provided)
 * @returns {string} Time in HH:MM format (local timezone)
 */
export const utcSlotToLocalTime = (slot, dateString, timezone = null) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    if (timezone === 'UTC') {
        return slotToTimeUTC(slot)
    }
    
    try {
        // Create UTC date from slot
        const utcDate = createUTCDateFromSlot(dateString, slot)
        
        // Use toLocaleTimeString to convert to target timezone
        const localTimeString = utcDate.toLocaleTimeString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
        
        return localTimeString
        
    } catch (error) {
        console.error('Error converting UTC slot to local time:', error)
        return slotToTimeUTC(slot)
    }
}

/**
 * Convert local time to UTC slot  
 * @param {string} timeString - Time in HH:MM format (local timezone)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} [timezone] - User's timezone (auto-detected if not provided)
 * @returns {number} UTC slot number
 */
export const localTimeToUTCSlot = (timeString, dateString, timezone = null) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    if (timezone === 'UTC') {
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`)
        return timeToSlotUTC(utcDateTime)
    }
    
    try {
        // Create a date object representing the time in the target timezone
        const [year, month, day] = dateString.split('-').map(Number)
        const [hours, minutes] = timeString.split(':').map(Number)
        
        // Create the local date as if it were in the system timezone
        const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
        
        // Format this date to see what it looks like in the target timezone
        const targetTimeString = localDate.toLocaleString('sv-SE', { timeZone: timezone })
        const systemTimeString = localDate.toLocaleString('sv-SE')
        
        // Parse both strings to calculate the offset
        const targetTime = new Date(targetTimeString).getTime()
        const systemTime = new Date(systemTimeString).getTime()
        const offset = systemTime - targetTime
        
        // Create the actual UTC time by adjusting the local time
        const utcTime = new Date(localDate.getTime() + offset)
        
        return timeToSlotUTC(utcTime)
        
    } catch (error) {
        console.error('Error in timezone conversion:', error)
        // Fallback to UTC
        const utcDateTime = new Date(`${dateString}T${timeString}:00.000Z`)
        return timeToSlotUTC(utcDateTime)
    }
}

/**
 * Format slot for display in user's timezone
 * @param {number} slot - UTC slot number
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} [timezone] - User's timezone (auto-detected if not provided)
 * @param {boolean} [use12Hour=true] - Whether to use 12-hour format
 * @returns {string} Formatted time string
 */
export const formatSlotForDisplay = (slot, dateString, timezone = null, use12Hour = true) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    const localTime = utcSlotToLocalTime(slot, dateString, timezone)
    
    if (!use12Hour) {
        return localTime
    }
    
    // Convert to 12-hour format
    const [hours, minutes] = localTime.split(':').map(Number)
    let displayHour = hours % 12
    if (displayHour === 0) displayHour = 12
    const period = hours >= 12 ? 'PM' : 'AM'
    
    // Add timezone indicator for non-UTC zones
    const timezoneDisplay = timezone === 'UTC' ? ' UTC' : ''
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}${timezoneDisplay}`
}

/**
 * Get timezone display name
 * @param {string} [timezone] - IANA timezone identifier (auto-detected if not provided)
 * @returns {string} Human-readable timezone name
 */
export const getTimezoneDisplayName = (timezone = null) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    try {
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: timezone,
            timeZoneName: 'long'
        })
        
        const parts = formatter.formatToParts(new Date())
        const timeZonePart = parts.find(part => part.type === 'timeZoneName')
        return timeZonePart ? timeZonePart.value : timezone
    } catch (error) {
        return timezone
    }
}

/**
 * Get timezone abbreviation (EST, PST, etc.)
 * @param {string} [timezone] - IANA timezone identifier (auto-detected if not provided)
 * @returns {string} Timezone abbreviation
 */
export const getTimezoneAbbreviation = (timezone = null) => {
    if (!timezone) {
        timezone = getUserTimezone()
    }
    
    try {
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: timezone,
            timeZoneName: 'short'
        })
        
        const parts = formatter.formatToParts(new Date())
        const timeZonePart = parts.find(part => part.type === 'timeZoneName')
        return timeZonePart ? timeZonePart.value : timezone
    } catch (error) {
        return timezone
    }
}

/**
 * Formats a date string into the specified format
 * @param {string|Date} date - The date to format (can be a Date object or ISO string)
 * @param {string} [format='MM-DD-YYYY'] - The desired output format ('MM-DD-YYYY' or 'Day Mon XX')
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, format = 'nm') => {
    const dateObj = new Date(date);
    
    if (format === 'nm') { //numeric
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${month}-${day}-${year}`;
    } else if (format === 'anm-abbr') { //alphanumeric-short
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const dayName = days[dateObj.getDay()];
        const monthName = months[dateObj.getMonth()];
        const day = dateObj.getDate();
        
        return `${dayName} ${monthName} ${day}`;
    }
    
    throw new Error('Unsupported date format');
}