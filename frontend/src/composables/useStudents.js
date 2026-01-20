import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch all students from API
 * @param {string} token - Auth token
 * @returns {Promise<Array>} List of students
 */
async function fetchStudents(token) {
    const response = await fetch('/api/users/students', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch students')
    }
    
    const data = await response.json()
    return data.users || []
}

/**
 * Fetch current user's payment options
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Payment options
 */
async function fetchPaymentOptions(token) {
    const response = await fetch('/api/users/me/payment-options', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch payment options')
    }
    
    return await response.json()
}

/**
 * Composable for managing student data using Vue Query
 * @returns {Object} Student state and methods
 */
export function useStudents() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch all students
    const {
        data: students,
        isLoading: isLoadingStudents,
        error: studentsError,
        refetch: refetchStudents
    } = useQuery({
        queryKey: ['students'],
        queryFn: () => fetchStudents(token.value),
        enabled: computed(() => !!token.value),
        staleTime: 5 * 60 * 1000, // 5 minutes (student list changes rarely)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Query: Fetch payment options for current user
    const {
        data: paymentOptions,
        isLoading: isLoadingPaymentOptions,
        error: paymentOptionsError,
        refetch: refetchPaymentOptions
    } = useQuery({
        queryKey: ['users', 'me', 'paymentOptions'],
        queryFn: () => fetchPaymentOptions(token.value),
        enabled: computed(() => !!token.value),
        staleTime: 2 * 60 * 1000, // 2 minutes (payment eligibility can change)
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
    
    // Computed: Extract specific payment option flags
    const canUseInPersonPayment = computed(() => 
        paymentOptions.value?.canUseInPersonPayment || false
    )
    
    const cardPaymentOnBehalfEnabled = computed(() =>
        paymentOptions.value?.cardPaymentOnBehalfEnabled || false
    )
    
    // Loading and error states
    const loading = computed(() => 
        isLoadingStudents.value || 
        isLoadingPaymentOptions.value
    )
    
    const error = computed(() => 
        studentsError.value || 
        paymentOptionsError.value
    )
    
    // Methods
    const invalidateStudents = () => {
        queryClient.invalidateQueries({ queryKey: ['students'] })
    }
    
    const invalidatePaymentOptions = () => {
        queryClient.invalidateQueries({ queryKey: ['users', 'me', 'paymentOptions'] })
    }
    
    // Return reactive state and methods
    return {
        // State
        students,
        paymentOptions,
        canUseInPersonPayment,
        cardPaymentOnBehalfEnabled,
        loading,
        error,
        isLoadingStudents,
        isLoadingPaymentOptions,
        studentsError,
        paymentOptionsError,
        
        // Methods
        refetchStudents,
        refetchPaymentOptions,
        invalidateStudents,
        invalidatePaymentOptions
    }
}
