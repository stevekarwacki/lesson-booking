/**
 * Availability Composable with Vue Query
 * 
 * Provides reactive queries and mutations for instructor availability.
 * 
 * @example
 * import { useAvailability } from '@/composables/useAvailability'
 * 
 * const { 
 *   weeklyAvailability, 
 *   isLoadingWeeklyAvailability,
 *   dailyAvailability,
 *   saveWeeklyAvailability,
 *   isSavingWeeklyAvailability
 * } = useAvailability(instructorId, selectedDate)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch weekly availability for an instructor
 * @param {number} instructorId - The instructor's ID
 * @param {string} token - Authorization token
 * @returns {Promise<Array>} Array of availability slots
 */
async function fetchWeeklyAvailability(instructorId, token) {
  const response = await fetch(`/api/availability/${instructorId}/weekly`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch weekly availability')
  }
  
  return response.json()
}

/**
 * Fetch daily availability for an instructor
 * @param {number} instructorId - The instructor's ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} token - Authorization token
 * @returns {Promise<Array>} Array of availability slots for the day
 */
async function fetchDailyAvailability(instructorId, date, token) {
  const response = await fetch(`/api/availability/${instructorId}/daily/${date}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch daily availability')
  }
  
  return response.json()
}

/**
 * Save weekly availability for an instructor
 * @param {number} instructorId - The instructor's ID
 * @param {Array} availabilityData - Availability slots to save
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Saved availability data
 */
async function saveWeeklyAvailabilityApi(instructorId, availabilityData, token) {
  const response = await fetch(`/api/availability/${instructorId}/weekly`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ availability: availabilityData })
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to save availability')
  }
  
  return response.json()
}

/**
 * Create a blocked time slot
 * @param {number} instructorId - The instructor's ID
 * @param {Object} blockData - Block data (date, startSlot, duration, reason)
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Created block
 */
async function createBlockedSlotApi(instructorId, blockData, token) {
  const response = await fetch(`/api/availability/${instructorId}/blocked`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(blockData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create blocked slot')
  }
  
  return response.json()
}

/**
 * Delete a blocked time slot
 * @param {number} blockId - The block ID to delete
 * @param {string} token - Authorization token
 * @returns {Promise<Object>} Deletion result
 */
async function deleteBlockedSlotApi(blockId, token) {
  const response = await fetch(`/api/availability/blocked/${blockId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete blocked slot')
  }
  
  return response.json()
}

/**
 * Main composable for availability
 * 
 * @param {Ref<number>|number} instructorId - Instructor ID (can be ref or raw value)
 * @param {Ref<string>|string|null} selectedDate - Selected date for daily view (YYYY-MM-DD)
 * @returns {Object} Availability queries, mutations, and state
 */
export function useAvailability(instructorId, selectedDate = null) {
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
  
  const normalizedSelectedDate = computed(() => {
    const value = typeof selectedDate === 'object' && selectedDate !== null && 'value' in selectedDate
      ? selectedDate.value
      : selectedDate
    return value
  })
  
  // Query: Fetch weekly availability
  const {
    data: weeklyAvailability,
    isLoading: isLoadingWeeklyAvailability,
    error: weeklyAvailabilityError,
    refetch: refetchWeeklyAvailability
  } = useQuery({
    queryKey: ['availability', normalizedInstructorId, 'weekly'],
    queryFn: () => fetchWeeklyAvailability(
      normalizedInstructorId.value,
      token.value
    ),
    enabled: computed(() => 
      !!token.value && 
      !!normalizedInstructorId.value
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
  
  // Query: Fetch daily availability
  const {
    data: dailyAvailability,
    isLoading: isLoadingDailyAvailability,
    error: dailyAvailabilityError,
    refetch: refetchDailyAvailability
  } = useQuery({
    queryKey: ['availability', normalizedInstructorId, 'daily', normalizedSelectedDate],
    queryFn: () => fetchDailyAvailability(
      normalizedInstructorId.value,
      normalizedSelectedDate.value,
      token.value
    ),
    enabled: computed(() => 
      !!token.value && 
      !!normalizedInstructorId.value && 
      !!normalizedSelectedDate.value
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
  
  // Mutation: Save weekly availability
  const saveWeeklyAvailabilityMutation = useMutation({
    mutationFn: (availabilityData) => saveWeeklyAvailabilityApi(
      normalizedInstructorId.value,
      availabilityData,
      token.value
    ),
    onSuccess: () => {
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        queryKey: ['availability', normalizedInstructorId.value] 
      })
      // Invalidate calendar events (availability affects what slots show)
      queryClient.invalidateQueries({ 
        queryKey: ['calendar', 'events', normalizedInstructorId.value] 
      })
    },
  })
  
  // Mutation: Create blocked slot
  const createBlockedSlotMutation = useMutation({
    mutationFn: (blockData) => createBlockedSlotApi(
      normalizedInstructorId.value,
      blockData,
      token.value
    ),
    onSuccess: () => {
      // Invalidate availability queries
      queryClient.invalidateQueries({ 
        queryKey: ['availability', normalizedInstructorId.value] 
      })
      // Invalidate calendar events
      queryClient.invalidateQueries({ 
        queryKey: ['calendar', 'events', normalizedInstructorId.value] 
      })
    },
  })
  
  // Mutation: Delete blocked slot
  const deleteBlockedSlotMutation = useMutation({
    mutationFn: (blockId) => deleteBlockedSlotApi(blockId, token.value),
    onSuccess: (data, blockId) => {
      // Invalidate availability queries for the instructor
      // Note: We don't have instructorId in the delete response, so invalidate all availability
      queryClient.invalidateQueries({ 
        queryKey: ['availability'] 
      })
      // Invalidate all calendar events
      queryClient.invalidateQueries({ 
        queryKey: ['calendar', 'events'] 
      })
    },
  })
  
  return {
    // Weekly availability
    weeklyAvailability,
    isLoadingWeeklyAvailability,
    weeklyAvailabilityError,
    refetchWeeklyAvailability,
    
    // Daily availability
    dailyAvailability,
    isLoadingDailyAvailability,
    dailyAvailabilityError,
    refetchDailyAvailability,
    
    // Mutations
    saveWeeklyAvailability: saveWeeklyAvailabilityMutation.mutateAsync,
    isSavingWeeklyAvailability: saveWeeklyAvailabilityMutation.isPending,
    createBlockedSlot: createBlockedSlotMutation.mutateAsync,
    isCreatingBlockedSlot: createBlockedSlotMutation.isPending,
    deleteBlockedSlot: deleteBlockedSlotMutation.mutateAsync,
    isDeletingBlockedSlot: deleteBlockedSlotMutation.isPending,
  }
}
