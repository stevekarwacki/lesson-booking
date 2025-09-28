import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

/**
 * Composable for managing user credit data and operations
 * @returns {Object} Credit state and methods
 */
export function useCredits() {
    const userStore = useUserStore()
    
    // Reactive state
    const userCredits = ref(0)
    const creditBreakdown = ref({
        30: { credits: 0, next_expiry: null },
        60: { credits: 0, next_expiry: null }
    })
    const loading = ref(false)
    const error = ref(null)
    const nextExpiry = ref(null)
    
    // Computed properties
    const getAvailableCredits = computed(() => {
        return (duration) => {
            const durationInt = parseInt(duration)
            return creditBreakdown.value[durationInt]?.credits || 0
        }
    })
    
    // Methods
    const fetchCredits = async () => {
        try {
            loading.value = true
            error.value = null
            
            const response = await fetch('/api/payments/credits', {
                headers: {
                    'Authorization': `Bearer ${userStore.token}`
                }
            })
            
            if (!response.ok) {
                throw new Error('Failed to fetch credits')
            }
            
            const data = await response.json()
            
            // Update reactive state
            userCredits.value = data.total_credits || 0
            nextExpiry.value = data.next_expiry || null
            creditBreakdown.value = data.breakdown || {
                30: { credits: 0, next_expiry: null },
                60: { credits: 0, next_expiry: null }
            }
            
            return data
        } catch (err) {
            error.value = err.message
            console.error('Error fetching credits:', err)
            throw err
        } finally {
            loading.value = false
        }
    }
    
    // Refresh credits (alias for fetchCredits for clarity)
    const refreshCredits = fetchCredits
    
    // Optimistically update credits (for immediate UI feedback)
    const updateCreditsOptimistically = (duration, creditChange) => {
        const durationInt = parseInt(duration)
        if (creditBreakdown.value[durationInt]) {
            creditBreakdown.value[durationInt].credits += creditChange
            // Also update total credits
            userCredits.value += creditChange
        }
    }
    
    // Return reactive state and methods
    return {
        // State
        userCredits,
        creditBreakdown,
        loading,
        error,
        nextExpiry,
        
        // Computed
        getAvailableCredits,
        
        // Methods
        fetchCredits,
        refreshCredits,
        updateCreditsOptimistically
    }
}
