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

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
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
 * Update a booking
 * @param {number} bookingId - The booking ID
 * @param {Object} updateData - Update data
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Updated booking
 */
async function updateBookingApi(bookingId, updateData, token) {
  const response = await fetch(`/api/calendar/student/${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update booking')
  }
  
  return response.json()
}

/**
 * Cancel a booking
 * @param {number} bookingId - The booking ID
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelBookingApi(bookingId, token) {
  const response = await fetch(`/api/calendar/student/${bookingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to cancel booking')
  }
  
  return response.json()
}

/**
 * Update payment status of a booking
 * @param {number} bookingId - The booking ID
 * @param {string} status - New payment status
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Updated booking
 */
async function updatePaymentStatusApi(bookingId, status, token) {
  const response = await fetch(`/api/calendar/bookings/${bookingId}/payment-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update payment status')
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
  const queryClient = useQueryClient()
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
  
  // Mutation: Update booking
  const updateBookingMutation = useMutation({
    mutationFn: ({ bookingId, updateData }) => updateBookingApi(bookingId, updateData, token.value),
    onSuccess: (data) => {
      // Invalidate calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      // Invalidate user bookings
      queryClient.invalidateQueries({ queryKey: ['users', userStore.user?.id, 'bookings'] })
      // Invalidate credits
      if (userStore.user?.id) {
        queryClient.invalidateQueries({ queryKey: ['credits', userStore.user.id] })
      }
    }
  })
  
  // Mutation: Cancel booking
  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId) => cancelBookingApi(bookingId, token.value),
    onSuccess: () => {
      // Invalidate calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      // Invalidate user bookings
      queryClient.invalidateQueries({ queryKey: ['users', userStore.user?.id, 'bookings'] })
      // Invalidate credits
      if (userStore.user?.id) {
        queryClient.invalidateQueries({ queryKey: ['credits', userStore.user.id] })
      }
    }
  })
  
  // Mutation: Update payment status
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ bookingId, status }) => updatePaymentStatusApi(bookingId, status, token.value),
    onSuccess: () => {
      // Invalidate calendar queries
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      // Invalidate user bookings
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
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
    
    // Mutations
    updateBooking: updateBookingMutation.mutateAsync,
    isUpdatingBooking: updateBookingMutation.isPending,
    cancelBooking: cancelBookingMutation.mutateAsync,
    isCancellingBooking: cancelBookingMutation.isPending,
    updatePaymentStatus: updatePaymentStatusMutation.mutateAsync,
    isUpdatingPaymentStatus: updatePaymentStatusMutation.isPending,
  }
}
