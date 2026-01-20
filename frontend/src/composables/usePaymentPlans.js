import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch payment plans from API
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Payment plans
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
    
    return await response.json()
}

/**
 * Fetch user subscriptions from API
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} User subscriptions
 */
async function fetchUserSubscriptions(userId, token) {
    const response = await fetch(`/api/subscriptions/user/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
    }
    
    return await response.json()
}

/**
 * Fetch user recurring bookings from API
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} User recurring bookings
 */
async function fetchUserRecurringBookings(userId, token) {
    const response = await fetch(`/api/recurring-bookings/user/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch recurring bookings')
    }
    
    return await response.json()
}

/**
 * Fetch subscription cancellation preview from API
 * @param {string} subscriptionId - Subscription ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Cancellation preview data
 */
async function fetchCancellationPreview(subscriptionId, token) {
    const response = await fetch(`/api/subscriptions/preview-cancellation/${subscriptionId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch cancellation preview')
    }
    
    return await response.json()
}

/**
 * Composable for managing payment plans and subscriptions using Vue Query
 * @param {Ref<string>|string} userId - Optional user ID (defaults to current user)
 * @returns {Object} Payment plans and subscription state
 */
export function usePaymentPlans(userId = null) {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    
    // Normalize userId parameter to support both refs and raw values
    const normalizedUserId = computed(() => {
        if (!userId) return userStore.user?.id
        return typeof userId === 'object' && 'value' in userId ? userId.value : userId
    })
    
    const token = computed(() => userStore.token)
    
    // Query: Fetch payment plans
    const {
        data: paymentPlans,
        isLoading: isLoadingPlans,
        error: plansError,
        refetch: refetchPlans
    } = useQuery({
        queryKey: ['paymentPlans'],
        queryFn: () => fetchPaymentPlans(token.value),
        enabled: computed(() => !!token.value),
        staleTime: 10 * 60 * 1000, // 10 minutes (rarely change)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Query: Fetch user subscriptions
    const {
        data: subscriptions,
        isLoading: isLoadingSubscriptions,
        error: subscriptionsError,
        refetch: refetchSubscriptions
    } = useQuery({
        queryKey: ['subscriptions', normalizedUserId],
        queryFn: () => fetchUserSubscriptions(normalizedUserId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedUserId.value),
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
    
    // Query: Fetch recurring bookings
    const {
        data: recurringBookings,
        isLoading: isLoadingRecurringBookings,
        error: recurringBookingsError,
        refetch: refetchRecurringBookings
    } = useQuery({
        queryKey: ['recurringBookings', normalizedUserId],
        queryFn: () => fetchUserRecurringBookings(normalizedUserId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedUserId.value),
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
    
    // Computed: Filter plans by type
    const lessonPlans = computed(() => 
        paymentPlans.value?.filter(plan => plan.type === 'one-time') || []
    )
    
    const membershipPlans = computed(() => 
        paymentPlans.value?.filter(plan => plan.type === 'membership') || []
    )
    
    // Computed: Filter active subscriptions
    const activeSubscriptions = computed(() => 
        subscriptions.value?.filter(sub => 
            sub.status === 'active' && 
            sub.PaymentPlan?.type === 'membership'
        ) || []
    )
    
    // Helper: Get recurring booking for a subscription
    const getRecurringBooking = (subscriptionId) => {
        return recurringBookings.value?.find(
            booking => booking.subscription_id === subscriptionId
        ) || null
    }
    
    // Helper: Fetch cancellation preview (not cached, as it's transient data)
    const fetchCancellationPreviewData = async (subscriptionId) => {
        return await fetchCancellationPreview(subscriptionId, token.value)
    }
    
    // Loading and error states
    const loading = computed(() => 
        isLoadingPlans.value || 
        isLoadingSubscriptions.value || 
        isLoadingRecurringBookings.value
    )
    
    const error = computed(() => 
        plansError.value || 
        subscriptionsError.value || 
        recurringBookingsError.value
    )
    
    // Methods
    const invalidateSubscriptions = () => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions', normalizedUserId.value] })
    }
    
    const invalidateRecurringBookings = () => {
        queryClient.invalidateQueries({ queryKey: ['recurringBookings', normalizedUserId.value] })
    }
    
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['paymentPlans'] })
        invalidateSubscriptions()
        invalidateRecurringBookings()
    }
    
    // Return reactive state and methods
    return {
        // State
        paymentPlans,
        subscriptions,
        recurringBookings,
        lessonPlans,
        membershipPlans,
        activeSubscriptions,
        loading,
        error,
        isLoadingPlans,
        isLoadingSubscriptions,
        isLoadingRecurringBookings,
        plansError,
        subscriptionsError,
        recurringBookingsError,
        
        // Helpers
        getRecurringBooking,
        fetchCancellationPreviewData,
        
        // Methods
        refetchPlans,
        refetchSubscriptions,
        refetchRecurringBookings,
        invalidateSubscriptions,
        invalidateRecurringBookings,
        invalidateAll
    }
}
