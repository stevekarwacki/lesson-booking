
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

/**
 * Checks if two dates are the same calendar day
 * @param {Date} date1 - First date to compare
 * @param {Date} date2 - Second date to compare
 * @returns {boolean} - Whether dates are the same calendar day
 */
export const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString()
}

/**
 * Gets start of day (midnight) for a given date
 * @param {Date} date - Date to get start of day for
 * @returns {Date} - New date set to start of day
 */
export const getStartOfDay = (date) => {
    const newDate = new Date(date)
    newDate.setHours(0, 0, 0, 0)
    return newDate
}