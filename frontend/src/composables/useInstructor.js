import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch instructor details from API
 * @param {number} instructorId - Instructor ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Instructor details
 */
async function fetchInstructor(instructorId, token) {
    const response = await fetch(`/api/instructors/${instructorId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch instructor')
    }
    
    return await response.json()
}

/**
 * Composable for managing instructor data using Vue Query
 * @param {Ref<number>|number} instructorId - Instructor ID (reactive or raw)
 * @returns {Object} Instructor state and methods
 */
export function useInstructor(instructorId) {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    
    // Normalize instructorId parameter to support both refs and raw values
    const normalizedInstructorId = computed(() => {
        if (!instructorId) return null
        return typeof instructorId === 'object' && 'value' in instructorId 
            ? instructorId.value 
            : instructorId
    })
    
    const token = computed(() => userStore.token)
    
    // Query: Fetch instructor details
    const {
        data: instructor,
        isLoading: isLoadingInstructor,
        error: instructorError,
        refetch: refetchInstructor
    } = useQuery({
        queryKey: ['instructors', normalizedInstructorId],
        queryFn: () => fetchInstructor(normalizedInstructorId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedInstructorId.value),
        staleTime: 5 * 60 * 1000, // 5 minutes (changes rarely)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Computed: Extract hourly rate from instructor data
    const hourlyRate = computed(() => {
        if (!instructor.value?.hourly_rate) return null
        return parseFloat(instructor.value.hourly_rate)
    })
    
    // Method: Invalidate instructor cache
    const invalidateInstructor = () => {
        queryClient.invalidateQueries({ queryKey: ['instructors', normalizedInstructorId.value] })
    }
    
    // Return reactive state and methods
    return {
        // State
        instructor,
        hourlyRate,
        isLoadingInstructor,
        instructorError,
        
        // Methods
        refetchInstructor,
        invalidateInstructor
    }
}
