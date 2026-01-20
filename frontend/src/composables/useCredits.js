import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch user credits from API
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Credits data
 */
async function fetchUserCredits(userId, token) {
    const response = await fetch('/api/payments/credits', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch credits')
    }
    
    return await response.json()
}

/**
 * Fetch credit transaction history
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Transaction history
 */
async function fetchTransactionHistory(token) {
    const response = await fetch('/api/payments/transactions', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch transaction history')
    }
    
    return await response.json()
}

/**
 * Composable for managing user credit data and operations using Vue Query
 * @param {Ref<string>|string} userId - Optional user ID (defaults to current user)
 * @returns {Object} Credit state and methods
 */
export function useCredits(userId = null) {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    
    // Normalize userId parameter to support both refs and raw values
    const normalizedUserId = computed(() => {
        if (!userId) return userStore.user?.id
        return typeof userId === 'object' && 'value' in userId ? userId.value : userId
    })
    
    const token = computed(() => userStore.token)
    
    // Query: Fetch user credits
    const {
        data: creditsData,
        isLoading: isLoadingCredits,
        error: creditsError,
        refetch: refetchCredits
    } = useQuery({
        queryKey: ['credits', normalizedUserId],
        queryFn: () => fetchUserCredits(normalizedUserId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedUserId.value),
        staleTime: 1 * 60 * 1000, // 1 minute (financial data)
        cacheTime: 5 * 60 * 1000, // 5 minutes
    })
    
    // Query: Fetch transaction history
    const {
        data: transactions,
        isLoading: isLoadingTransactions,
        error: transactionsError,
        refetch: refetchTransactions
    } = useQuery({
        queryKey: ['credits', normalizedUserId, 'history'],
        queryFn: () => fetchTransactionHistory(token.value),
        enabled: computed(() => !!token.value),
        staleTime: 1 * 60 * 1000, // 1 minute
        cacheTime: 5 * 60 * 1000, // 5 minutes
    })
    
    // Computed properties for easy access to credit data
    const userCredits = computed(() => creditsData.value?.total_credits || 0)
    
    const creditBreakdown = computed(() => creditsData.value?.breakdown || {
        30: { credits: 0, next_expiry: null },
        60: { credits: 0, next_expiry: null }
    })
    
    const nextExpiry = computed(() => creditsData.value?.next_expiry || null)
    
    const getAvailableCredits = computed(() => {
        return (duration) => {
            const durationInt = parseInt(duration)
            return creditBreakdown.value[durationInt]?.credits || 0
        }
    })
    
    // Loading and error states
    const loading = computed(() => isLoadingCredits.value || isLoadingTransactions.value)
    const error = computed(() => creditsError.value || transactionsError.value)
    
    // Methods
    const fetchCredits = refetchCredits // Alias for backward compatibility
    const refreshCredits = refetchCredits // Alias for clarity
    
    // Invalidate credits cache (useful after purchases/bookings)
    const invalidateCredits = () => {
        queryClient.invalidateQueries({ queryKey: ['credits', normalizedUserId.value] })
        queryClient.invalidateQueries({ queryKey: ['credits', normalizedUserId.value, 'history'] })
    }
    
    // Return reactive state and methods
    return {
        // State
        userCredits,
        creditBreakdown,
        loading,
        error,
        nextExpiry,
        transactions,
        isLoadingCredits,
        isLoadingTransactions,
        creditsError,
        transactionsError,
        
        // Computed
        getAvailableCredits,
        
        // Methods
        fetchCredits,
        refreshCredits,
        refetchTransactions,
        invalidateCredits
    }
}
