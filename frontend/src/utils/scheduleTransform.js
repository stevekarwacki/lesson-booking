/**
 * Schedule Data Transformation Utilities
 * 
 * Converts between row-based schedule data and block-based format
 * for DailyScheduleColumn component (continuous time blocks)
 */

import { fromTimestamp } from './dateHelpers.js'
import { consolidateScheduleToBlocks } from './timeBlocks.js'

/**
 * Transform weekly schedule from row-based to column-based format with blocks
 * @param {Object} weeklySchedule - Current format: weeklySchedule[timeSlot][dayIndex]
 * @param {Date} weekStartDate - Start date of the week
 * @param {number} minSlot - Minimum slot to include (for business hours alignment)
 * @param {number} maxSlot - Maximum slot to include (for business hours alignment)
 * @returns {Array} Array of day objects with consolidated blocks
 */
export function transformWeeklySchedule(weeklySchedule, weekStartDate, minSlot = null, maxSlot = null) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekColumns = []
  
  // Initialize 7 days
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayHelper = fromTimestamp(weekStartDate.getTime()).addDays(dayIndex).startOfDay()
    const date = dayHelper.toDate()
    
    // Build schedule data for this day
    const daySchedule = {}
    Object.keys(weeklySchedule).forEach(timeSlot => {
      const slotNum = parseInt(timeSlot)
      if (!isNaN(slotNum)) {
        const slotData = weeklySchedule[timeSlot]?.[dayIndex]
        if (slotData) {
          daySchedule[slotNum] = slotData
        }
      }
    })
    
    // Use block consolidation
    const blocks = consolidateScheduleToBlocks(daySchedule, minSlot, maxSlot)
    
    weekColumns.push({
      dayIndex,
      date,
      dayName: dayNames[dayIndex],
      slots: blocks // Now contains consolidated blocks instead of individual slots
    })
  }
  
  return weekColumns
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
 * Transform daily schedule data to blocks for DailyScheduleColumn
 * @param {Object} dailySchedule - Current format: dailySchedule[timeSlot]
 * @param {Date} date - The date for this daily schedule
 * @param {number} minSlot - Minimum slot to include (for business hours alignment)
 * @param {number} maxSlot - Maximum slot to include (for business hours alignment)
 * @returns {Array} Array of consolidated time blocks
 */
export function transformDailySchedule(dailySchedule, date, minSlot = null, maxSlot = null) {
  const existingTimeSlots = Object.keys(dailySchedule)
    .map(slot => parseInt(slot))
    .filter(slot => !isNaN(slot))
  
  // If no explicit range provided, use schedule data range
  if (minSlot === null || maxSlot === null) {
    if (existingTimeSlots.length === 0) {
      return []
    }
    minSlot = Math.min(...existingTimeSlots)
    maxSlot = Math.max(...existingTimeSlots)
  }
  
  // Use block consolidation
  return consolidateScheduleToBlocks(dailySchedule, minSlot, maxSlot)
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
  
  for (let slot = startSlot; slot < maxSlot; slot += interval) {
    labels.push(slot)
  }
  
  return labels
}