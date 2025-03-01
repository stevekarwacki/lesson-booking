/**
 * Converts a time string (HH:MM) or number to decimal hours
 * @param {string|number} time - Time in HH:MM format or decimal hours
 * @returns {number|null} - Decimal hours or null if invalid
 */
export const parseTime = (time) => {
    if (time === null || time === undefined) return null
    
    // If already a number, return it
    if (typeof time === 'number') return time
    
    // Otherwise parse the time string
    const [hours, minutes] = time.split(':').map(Number)
    return hours + (minutes / 60)
}

/**
 * Converts decimal hours to time string (HH:MM)
 * @param {number|string} timeValue - Decimal hours or HH:MM string
 * @returns {string} - Time in HH:MM format
 */
export const formatTime = (timeValue) => {
    // If it's already in HH:MM format, return as is
    if (typeof timeValue === 'string' && timeValue.includes(':')) {
        return timeValue
    }
    
    // Convert to number if it's a string number
    const value = typeof timeValue === 'string' ? parseFloat(timeValue) : timeValue
    
    const hours = Math.floor(value)
    const minutes = Math.round((value - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Formats hour to 12-hour format with AM/PM
 * @param {number} hour - Hour in 24-hour format
 * @returns {string} - Formatted time (e.g., "9:00 AM")
 */
export const formatHour = (hour) => {
    let displayHour = hour % 12
    if (displayHour === 0) displayHour = 12
    const period = hour >= 12 ? 'PM' : 'AM'
    return `${displayHour}:00 ${period}`
}

/**
 * Formats time slot for display
 * @param {string} time - Time in HH:MM format
 * @returns {string} - Formatted time (e.g., "9:30 AM")
 */
export const formatSlotTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    let displayHour = hours % 12
    if (displayHour === 0) displayHour = 12
    const period = hours >= 12 ? 'PM' : 'AM'
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Generates array of time slots
 * @param {number} startHour - Starting hour (24-hour format)
 * @param {number} endHour - Ending hour (24-hour format)
 * @param {number} interval - Interval in minutes
 * @returns {Array} - Array of time slot objects
 */
export const generateTimeSlots = (startHour = 7, endHour = 19, interval = 30) => {
    const slots = []
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            if (hour === endHour && minute > 0) continue
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            slots.push({ time })
        }
    }
    return slots
} 