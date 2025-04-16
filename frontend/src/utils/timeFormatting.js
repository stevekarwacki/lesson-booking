/**
 * Formats time slot for display
 * @param {string} time - Time in HH:MM format
 * @returns {string} - Formatted time (e.g., "9:30 AM")
 */
export const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    let displayHour = hours % 12
    if (displayHour === 0) displayHour = 12
    const period = hours >= 12 ? 'PM' : 'AM'
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
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

export const isCurrentDay = (date) => {
    return isSameDay(new Date(), new Date(date))
}

export const isPastDay = (date) => {
    const today = getStartOfDay(new Date())
    const checkDate = getStartOfDay(new Date(date))
    return checkDate < today
}

export const isPastTimeSlot = (date, timeSlot) => {
    if (isPastDay(date)) return true
    
    if (isCurrentDay(date)) {
        const now = new Date()
        const currentSlot = timeToSlot(`${now.getHours()}:${now.getMinutes()}`)

        return timeSlot < currentSlot
    }
    
    return false
}

// Convert HH:MM to slot number (15-minute increments)
export const timeToSlot = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 4) + Math.floor(minutes / 15);
}

// Convert slot number to HH:MM
export const slotToTime = (slot) => {
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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