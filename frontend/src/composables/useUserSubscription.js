/**
 * User Subscription Management Composable with Vue Query
 * 
 * Handles subscription-related queries and mutations for user management.
 * 
 * @example
 * import { useUserSubscription, usePaymentPlans } from '@/composables/useUserSubscription'
 * 
 * const { 
 *   subscription, 
 *   isLoadingSubscription,
 *   cancelSubscription,
 *   reactivateSubscription 
 * } = useUserSubscription(userId)
 * 
 * const { plans, isLoadingPlans } = usePaymentPlans()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '../stores/userStore'
import { computed } from 'vue'

/**
 * Fetch user subscription
 */
async function fetchUserSubscription(userId, token) {
  const response = await fetch(`/api/admin/users/${userId}/subscription`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return null // No subscription found (legacy behavior)
    }
    throw new Error('Failed to fetch subscription')
  }
  
  const data = await response.json()
  return data // Can be null if user has no subscription
}

/**
 * Fetch all payment plans
 */
async function fetchPaymentPlans(token) {
  const response = await fetch('/api/payments/plans', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch payment plans')
  }
  
  return response.json()
}

/**
 * Cancel a subscription
 */
async function cancelSubscriptionApi(subscriptionId, token) {
  const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || data.message || 'Failed to cancel subscription')
  }
  
  return response.json()
}

/**
 * Reactivate a subscription
 */
async function reactivateSubscriptionApi(subscriptionId, token) {
  const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/reactivate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || data.message || 'Failed to reactivate subscription')
  }
  
  return response.json()
}

/**
 * Create a new subscription for a user
 */
async function createSubscriptionApi(userId, subscriptionData, token) {
  const response = await fetch(`/api/admin/users/${userId}/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(subscriptionData)
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to create subscription')
  }
  
  return response.json()
}

/**
 * Hook for user subscription management
 */
export function useUserSubscription(userId) {
  const userStore = useUserStore()
  const queryClient = useQueryClient()
  const token = computed(() => userStore.token)
  
  // Normalize userId to handle both ref and raw values
  // If userId is a ref/computed, use .value; otherwise use the value directly
  const normalizedUserId = computed(() => {
    const value = typeof userId === 'object' && userId !== null && 'value' in userId 
      ? userId.value 
      : userId
    return value
  })
  
  // Query: Fetch user subscription
  const { 
    data: subscription, 
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    refetch: refetchSubscription
  } = useQuery({
    queryKey: ['users', normalizedUserId, 'subscription'],
    queryFn: () => fetchUserSubscription(normalizedUserId.value, token.value),
    enabled: computed(() => !!token.value && !!normalizedUserId.value),
    retry: false, // Don't retry 404s - user simply doesn't have a subscription
  })
  
  // Mutation: Cancel subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId) => cancelSubscriptionApi(subscriptionId, token.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', normalizedUserId, 'subscription'] })
    },
  })
  
  // Mutation: Reactivate subscription
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId) => reactivateSubscriptionApi(subscriptionId, token.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', normalizedUserId, 'subscription'] })
    },
  })
  
  // Mutation: Create subscription
  const createSubscriptionMutation = useMutation({
    mutationFn: (subscriptionData) => createSubscriptionApi(normalizedUserId.value, subscriptionData, token.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', normalizedUserId, 'subscription'] })
    },
  })
  
  return {
    subscription,
    isLoadingSubscription,
    subscriptionError,
    refetchSubscription,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
    reactivateSubscription: reactivateSubscriptionMutation.mutateAsync,
    createSubscription: createSubscriptionMutation.mutateAsync,
    isCancellingSubscription: cancelSubscriptionMutation.isPending,
    isReactivatingSubscription: reactivateSubscriptionMutation.isPending,
    isCreatingSubscription: createSubscriptionMutation.isPending,
  }
}

/**
 * Hook for payment plans (global, not user-specific)
 */
export function usePaymentPlans() {
  const userStore = useUserStore()
  const token = computed(() => userStore.token)
  
  const { 
    data: plans, 
    isLoading: isLoadingPlans,
    error: plansError,
    refetch: refetchPlans
  } = useQuery({
    queryKey: ['paymentPlans'],
    queryFn: () => fetchPaymentPlans(token.value),
    enabled: computed(() => !!token.value),
    staleTime: 1000 * 60 * 10, // 10 minutes - plans don't change often
  })
  
  return {
    plans,
    isLoadingPlans,
    plansError,
    refetchPlans,
  }
}

