/**
 * Verification Composable with Vue Query
 * 
 * Provides reactive mutations for user verification data submission.
 * 
 * @example
 * import { useVerification } from '@/composables/useVerification'
 * 
 * const { submitVerification, isSubmitting } = useVerification()
 * 
 * await submitVerification.mutateAsync(verificationData)
 */

import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Submit verification data to the API
 */
async function submitVerificationApi(verificationData, token) {
  const response = await fetch('/api/users/me/verification', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(verificationData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to submit verification data')
  }
  
  return response.json()
}

/**
 * Main composable for verification
 */
export function useVerification() {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  
  // Mutation: Submit verification data
  const submitVerificationMutation = useMutation({
    mutationFn: (verificationData) => submitVerificationApi(verificationData, token.value),
    onSuccess: async () => {
      // Refresh user data to get updated verification status
      await userStore.fetchUser()
      
      // Invalidate any user-related queries
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  
  return {
    // Mutation object with mutate/mutateAsync methods
    submitVerification: submitVerificationMutation.mutate,
    submitVerificationAsync: submitVerificationMutation.mutateAsync,
    
    // Status flags
    isSubmitting: submitVerificationMutation.isPending,
    isSuccess: submitVerificationMutation.isSuccess,
    isError: submitVerificationMutation.isError,
    error: submitVerificationMutation.error,
    
    // Reset mutation state
    reset: submitVerificationMutation.reset
  }
}

