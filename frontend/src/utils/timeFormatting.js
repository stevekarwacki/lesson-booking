
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

export const isCurrentDay = (date) => {
    return isSameDay(new Date(), date)
}

export const isPastDay = (date) => {
    const today = getStartOfDay(new Date())
    const checkDate = getStartOfDay(new Date(date))
    return checkDate < today
}

export const isPastTimeSlot = (date, timeStr) => {
    if (isPastDay(date)) return true
    
    if (isCurrentDay(date)) {
        const now = new Date()
        const slotDate = new Date(date)
        const [ slotHours, slotMinutes ] = timeStr.split(':')

        slotDate.setHours(slotHours)
        slotDate.setMinutes(slotMinutes)

        const timeSlot = timeToSlot(`${slotDate.getHours()}:${slotDate.getMinutes()}`)
        const currentSlot = timeToSlot(`${now.getHours()}:${now.getMinutes()}`)

        return timeSlot < currentSlot
    }
    
    return false
}

// Convert HH:MM to slot number (15-minute increments)
export const timeToSlot = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 4) + Math.floor(minutes / 15);
};

// Convert slot number to HH:MM
export const slotToTime = (slot) => {
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Calculate duration in slots
export const calculateDuration = (startSlot, endSlot) => {
    return endSlot - startSlot;
};

// Add this function to existing slotHelpers.js
export const isSlotAvailable = (timeStr, slots) => {
    if (!slots?.length) return false
    
    const timeSlot = timeToSlot(timeStr)
    return slots.some(slot => 
        timeSlot >= slot.start_slot && 
        timeSlot < (slot.start_slot + slot.duration)
    )
} 