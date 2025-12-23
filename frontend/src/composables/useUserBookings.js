/**
 * User Bookings Management Composable with Vue Query
 * 
 * Handles booking-related queries for user management.
 * 
 * @example
 * import { useUserBookings } from '@/composables/useUserBookings'
 * 
 * const { 
 *   bookings, 
 *   isLoadingBookings,
 *   refetchBookings
 * } = useUserBookings(userId)
 */

import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch user bookings
 */
async function fetchUserBookings(userId, token) {
  const response = await fetch(`/api/calendar/student/${userId}?includeAll=true`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch bookings')
  }
  
  return response.json()
}

/**
 * Hook for user bookings
 */
export function useUserBookings(userId) {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)
  
  // Normalize userId to handle both ref and raw values
  // If userId is a ref/computed, use .value; otherwise use the value directly
  const normalizedUserId = computed(() => {
    const value = typeof userId === 'object' && userId !== null && 'value' in userId 
      ? userId.value 
      : userId
    return value
  })
  
  const { 
    data: bookings, 
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ['users', normalizedUserId, 'bookings'],
    queryFn: () => fetchUserBookings(normalizedUserId.value, token.value),
    enabled: computed(() => !!token.value && !!normalizedUserId.value),
  })
  
  return {
    bookings,
    isLoadingBookings,
    bookingsError,
    refetchBookings,
  }
}

