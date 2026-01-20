import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'
import { useScheduleStore } from '@/stores/scheduleStore'
import axios from 'axios'

/**
 * Fetch refund info for a booking
 * @param {number} bookingId - Booking ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Refund information
 */
async function fetchRefundInfo(bookingId, token) {
    const response = await axios.get(`/api/admin/refunds/${bookingId}/info`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    return response.data
}

/**
 * Process refund for a booking
 * @param {Object} refundData - Refund data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Refund result
 */
async function processRefundApi(refundData, token) {
    const response = await axios.post('/api/admin/refunds', refundData, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to process refund')
    }
    
    return response.data
}

/**
 * Composable for managing refunds using Vue Query
 * @param {Ref<number>|number} bookingId - Booking ID (reactive or raw)
 * @returns {Object} Refunds state and methods
 */
export function useRefunds(bookingId) {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const scheduleStore = useScheduleStore()
    
    // Normalize bookingId parameter
    const normalizedBookingId = computed(() => {
        if (!bookingId) return null
        return typeof bookingId === 'object' && 'value' in bookingId 
            ? bookingId.value 
            : bookingId
    })
    
    const token = computed(() => userStore.token)
    
    // Query: Fetch refund info
    const {
        data: refundInfo,
        isLoading: isLoadingRefundInfo,
        error: refundInfoError,
        refetch: refetchRefundInfo
    } = useQuery({
        queryKey: ['refunds', normalizedBookingId, 'info'],
        queryFn: () => fetchRefundInfo(normalizedBookingId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedBookingId.value),
        staleTime: 1 * 60 * 1000, // 1 minute (financial data)
        cacheTime: 5 * 60 * 1000, // 5 minutes
    })
    
    // Mutation: Process refund
    const processRefundMutation = useMutation({
        mutationFn: (refundData) => processRefundApi(refundData, token.value),
        onSuccess: (data, variables) => {
            // Invalidate bookings for the student
            queryClient.invalidateQueries({ queryKey: ['users', variables.studentId, 'bookings'] })
            // Invalidate credits for the student
            queryClient.invalidateQueries({ queryKey: ['credits', variables.studentId] })
            // Invalidate calendar queries (refund typically cancels the booking)
            queryClient.invalidateQueries({ queryKey: ['calendar'] })
            // Invalidate availability queries (slots may become available)
            queryClient.invalidateQueries({ queryKey: ['availability'] })
            // Trigger schedule store refresh for components that rely on it
            if (variables.instructorId) {
                scheduleStore.triggerInstructorRefresh(variables.instructorId)
            } else {
                scheduleStore.triggerGlobalRefresh()
            }
        }
    })
    
    // Return reactive state and methods
    return {
        // State
        refundInfo,
        isLoadingRefundInfo,
        refundInfoError,
        
        // Mutations
        processRefund: processRefundMutation.mutateAsync,
        isProcessingRefund: processRefundMutation.isPending,
        
        // Methods
        refetchRefundInfo
    }
}
