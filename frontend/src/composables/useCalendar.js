/**
 * Calendar Events Composable with Vue Query
 * 
 * Provides reactive queries for calendar events and bookings.
 * 
 * @example
 * import { useCalendar } from '@/composables/useCalendar'
 * 
 * const { 
 *   weeklyEvents, 
 *   isLoadingWeeklyEvents,
 *   dailyEvents,
 *   isLoadingDailyEvents
 * } = useCalendar(instructorId, startDate, endDate, selectedDate)
 */

import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch weekly calendar events for an instructor
 * @param {number} instructorId - The instructor's ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} token - Authorization token
 * @returns {Promise<Array>} Array of calendar events
 */
async function fetchWeeklyEvents(instructorId, startDate, endDate, token) {
  const response = await fetch(`/api/calendar/events/${instructorId}/${startDate}/${endDate}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch weekly events')
  }
  
  return response.json()
}

/**
 * Fetch daily calendar events for an instructor
 * @param {number} instructorId - The instructor's ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} token - Authorization token
 * @returns {Promise<Array>} Array of calendar events for the day
 */
async function fetchDailyEvents(instructorId, date, token) {
  const response = await fetch(`/api/calendar/dailyEvents/${instructorId}/${date}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch daily events')
  }
  
  return response.json()
}

/**
 * Main composable for calendar events
 * 
 * @param {Ref<number>|number} instructorId - Instructor ID (can be ref or raw value)
 * @param {Ref<string>|string|null} startDate - Start date for weekly view (YYYY-MM-DD)
 * @param {Ref<string>|string|null} endDate - End date for weekly view (YYYY-MM-DD)
 * @param {Ref<string>|string|null} selectedDate - Selected date for daily view (YYYY-MM-DD)
 * @returns {Object} Calendar event queries and state
 */
export function useCalendar(instructorId, startDate = null, endDate = null, selectedDate = null) {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)
  
  // Normalize parameters to handle both refs and raw values
  const normalizedInstructorId = computed(() => {
    const value = typeof instructorId === 'object' && instructorId !== null && 'value' in instructorId
      ? instructorId.value
      : instructorId
    return value
  })
  
  const normalizedStartDate = computed(() => {
    const value = typeof startDate === 'object' && startDate !== null && 'value' in startDate
      ? startDate.value
      : startDate
    return value
  })
  
  const normalizedEndDate = computed(() => {
    const value = typeof endDate === 'object' && endDate !== null && 'value' in endDate
      ? endDate.value
      : endDate
    return value
  })
  
  const normalizedSelectedDate = computed(() => {
    const value = typeof selectedDate === 'object' && selectedDate !== null && 'value' in selectedDate
      ? selectedDate.value
      : selectedDate
    return value
  })
  
  // Query: Fetch weekly calendar events
  const {
    data: weeklyEvents,
    isLoading: isLoadingWeeklyEvents,
    error: weeklyEventsError,
    refetch: refetchWeeklyEvents
  } = useQuery({
    queryKey: ['calendar', 'events', normalizedInstructorId, 'weekly', normalizedStartDate, normalizedEndDate],
    queryFn: () => fetchWeeklyEvents(
      normalizedInstructorId.value,
      normalizedStartDate.value,
      normalizedEndDate.value,
      token.value
    ),
    enabled: computed(() => 
      !!token.value && 
      !!normalizedInstructorId.value && 
      !!normalizedStartDate.value && 
      !!normalizedEndDate.value
    ),
    staleTime: 30 * 1000, // 30 seconds - bookings change frequently
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // Query: Fetch daily calendar events
  const {
    data: dailyEvents,
    isLoading: isLoadingDailyEvents,
    error: dailyEventsError,
    refetch: refetchDailyEvents
  } = useQuery({
    queryKey: ['calendar', 'events', normalizedInstructorId, 'daily', normalizedSelectedDate],
    queryFn: () => fetchDailyEvents(
      normalizedInstructorId.value,
      normalizedSelectedDate.value,
      token.value
    ),
    enabled: computed(() => 
      !!token.value && 
      !!normalizedInstructorId.value && 
      !!normalizedSelectedDate.value
    ),
    staleTime: 30 * 1000, // 30 seconds - bookings change frequently
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return {
    // Weekly events
    weeklyEvents,
    isLoadingWeeklyEvents,
    weeklyEventsError,
    refetchWeeklyEvents,
    
    // Daily events
    dailyEvents,
    isLoadingDailyEvents,
    dailyEventsError,
    refetchDailyEvents,
  }
}
