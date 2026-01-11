/**
 * Profile Update Composable with Vue Query
 * 
 * Provides reactive mutations for user profile data submission.
 * Handles phone number, address, minor status, and parent approval updates.
 * 
 * @example
 * import { useProfileUpdate } from '@/composables/useProfileUpdate'
 * 
 * const { updateProfile, isUpdating } = useProfileUpdate()
 * 
 * await updateProfile.mutateAsync(profileData)
 */

import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Submit profile data to the API
 */
async function updateProfileApi(profileData, token) {
  const response = await fetch('/api/users/me/verification', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to update profile data')
  }
  
  return response.json()
}

/**
 * Main composable for profile updates
 */
export function useProfileUpdate() {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  
  // Mutation: Update profile data
  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => updateProfileApi(profileData, token.value),
    onSuccess: async () => {
      // Refresh user data to get updated profile
      await userStore.fetchUser()
      
      // Invalidate any user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  return {
    // Mutation methods
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    
    // Status flags
    isUpdating: updateProfileMutation.isPending,
    isSuccess: updateProfileMutation.isSuccess,
    isError: updateProfileMutation.isError,
    error: updateProfileMutation.error,
    
    // Reset mutation state
    reset: updateProfileMutation.reset
  }
}

