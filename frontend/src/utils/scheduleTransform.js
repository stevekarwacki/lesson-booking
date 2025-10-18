/**
 * Schedule Data Transformation Utilities
 * 
 * Converts between row-based schedule data (current format) and column-based 
 * data (for DailyScheduleColumn component)
 */

import { fromTimestamp } from './dateHelpers.js'

/**
 * Transform weekly schedule from row-based to column-based format
 * @param {Object} weeklySchedule - Current format: weeklySchedule[timeSlot][dayIndex]
 * @param {Date} weekStartDate - Start date of the week
 * @returns {Array} Array of day objects for DailyScheduleColumn components
 */
export function transformWeeklySchedule(weeklySchedule, weekStartDate) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekColumns = []
  
  // Initialize 7 days
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayHelper = fromTimestamp(weekStartDate.getTime()).addDays(dayIndex).startOfDay()
    
    weekColumns.push({
      dayIndex,
      date: dayHelper.toDate(),
      dayName: dayNames[dayIndex],
      slots: []
    })
  }
  
  // Extract all time slots and sort them
  const timeSlots = Object.keys(weeklySchedule)
    .map(slot => parseInt(slot))
    .filter(slot => !isNaN(slot))
    .sort((a, b) => a - b)
  
  // For each time slot, distribute the day data to the appropriate columns
  timeSlots.forEach(timeSlot => {
    const timeSlotData = weeklySchedule[timeSlot]
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const slotData = timeSlotData[dayIndex]
      
      if (slotData && typeof slotData === 'object') {
        // Transform existing slot data
        const transformedSlot = transformSlotData(slotData, timeSlot)
        weekColumns[dayIndex].slots.push(transformedSlot)
      } else {
        // Create unavailable slot for missing data to maintain alignment
        const transformedSlot = transformSlotData({
          type: 'unavailable',
          date: weekColumns[dayIndex].date,
          duration: 2
        }, timeSlot)
        weekColumns[dayIndex].slots.push(transformedSlot)
      }
    }
  })
  
  return weekColumns
}

/**
 * Transform individual slot data to match DailyScheduleColumn format
 * @param {Object} slotData - Original slot data
 * @param {number} timeSlot - Time slot number
 * @returns {Object} Transformed slot data
 */
function transformSlotData(slotData, timeSlot) {
  return {
    // Preserve the original booking/event ID
    id: slotData.id,
    
    // Normalize property names
    startSlot: timeSlot,
    duration: slotData.duration || 2,
    type: slotData.type || 'unavailable',
    date: slotData.date,
    
    // Student information
    student: slotData.student || null,
    isOwnBooking: slotData.isOwnBooking || false,
    
    // Google Calendar properties
    is_google_calendar: slotData.is_google_calendar || false,
    source: slotData.source,
    
    // Multi-slot booking properties
    isMultiSlot: slotData.isMultiSlot || false,
    slotPosition: slotData.slotPosition || 0,
    totalSlots: slotData.totalSlots || 1,
    bookingId: slotData.bookingId,
    originalStartSlot: slotData.originalStartSlot,
    originalDuration: slotData.originalDuration,
    
    // Time display properties (for tooltip)
    startTime: slotData.startTime,
    endTime: slotData.endTime
  }
}

/**
 * Get the time range (min and max slots) from weekly schedule data
 * @param {Object} weeklySchedule - Weekly schedule data
 * @returns {Object} { minSlot, maxSlot } or null if no data
 */
export function getScheduleTimeRange(weeklySchedule) {
  const timeSlots = Object.keys(weeklySchedule)
    .map(slot => parseInt(slot))
    .filter(slot => !isNaN(slot))
  
  if (timeSlots.length === 0) {
    return null
  }
  
  return {
    minSlot: Math.min(...timeSlots),
    maxSlot: Math.max(...timeSlots)
  }
}

/**
 * Transform daily schedule data to array format for DailyScheduleColumn
 * @param {Object} dailySchedule - Current format: dailySchedule[timeSlot]
 * @param {Date} date - The date for this daily schedule
 * @returns {Array} Array of slot objects
 */
export function transformDailySchedule(dailySchedule, date) {
  const existingTimeSlots = Object.keys(dailySchedule)
    .map(slot => parseInt(slot))
    .filter(slot => !isNaN(slot))
  
  if (existingTimeSlots.length === 0) {
    return []
  }
  
  const minSlot = Math.min(...existingTimeSlots)
  const maxSlot = Math.max(...existingTimeSlots)
  
  // Generate all time slots in the range (30-minute intervals)
  const allSlots = []
  for (let slot = minSlot; slot <= maxSlot; slot += 2) {
    const slotData = dailySchedule[slot]
    
    if (slotData) {
      // Existing slot data
      allSlots.push(transformSlotData(slotData, slot))
    } else {
      // Missing slot - create unavailable slot
      allSlots.push(transformSlotData({
        type: 'unavailable',
        date: date,
        duration: 2
      }, slot))
    }
  }
  
  return allSlots
}

/**
 * Generate time labels for a given time range
 * @param {number} minSlot - Starting slot number
 * @param {number} maxSlot - Ending slot number
 * @param {number} interval - Slot interval (default 2 for 30-min intervals)
 * @returns {Array} Array of slot numbers for time labels
 */
export function generateTimeLabels(minSlot, maxSlot, interval = 2) {
  const labels = []
  
  // Ensure we start on an interval boundary
  const startSlot = Math.floor(minSlot / interval) * interval
  
  for (let slot = startSlot; slot <= maxSlot; slot += interval) {
    labels.push(slot)
  }
  
  return labels
}