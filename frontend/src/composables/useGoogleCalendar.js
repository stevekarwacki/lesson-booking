import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch calendar config from API
 * @param {number} instructorId - Instructor ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Calendar configuration
 */
async function fetchCalendarConfig(instructorId, token) {
    const response = await fetch(`/api/auth/calendar/config/${instructorId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        // Return null if not configured yet (404)
        if (response.status === 404) return null
        throw new Error('Failed to fetch calendar config')
    }
    
    return await response.json()
}

/**
 * Fetch calendar setup info from API
 * @param {number} instructorId - Instructor ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Setup information
 */
async function fetchSetupInfo(instructorId, token) {
    const response = await fetch(`/api/auth/calendar/setup-info/${instructorId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch setup info')
    }
    
    return await response.json()
}

/**
 * Save calendar config to API
 * @param {number} instructorId - Instructor ID
 * @param {Object} configData - Calendar configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveCalendarConfigApi(instructorId, configData, token) {
    const response = await fetch(`/api/auth/calendar/config/${instructorId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
    }
    
    return data
}

/**
 * Test calendar connection
 * @param {number} instructorId - Instructor ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Test result
 */
async function testCalendarConnectionApi(instructorId, token) {
    const response = await fetch(`/api/auth/calendar/test/${instructorId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    return await response.json()
}

/**
 * Composable for managing Google Calendar integration using Vue Query
 * @param {Ref<number>|number} instructorId - Instructor ID (reactive or raw)
 * @returns {Object} Google Calendar state and methods
 */
export function useGoogleCalendar(instructorId) {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    
    // Normalize instructorId parameter
    const normalizedInstructorId = computed(() => {
        if (!instructorId) return null
        return typeof instructorId === 'object' && 'value' in instructorId 
            ? instructorId.value 
            : instructorId
    })
    
    const token = computed(() => userStore.token)
    
    // Query: Fetch calendar config
    const {
        data: calendarConfig,
        isLoading: isLoadingConfig,
        error: configError,
        refetch: refetchConfig
    } = useQuery({
        queryKey: ['googleCalendar', normalizedInstructorId, 'config'],
        queryFn: () => fetchCalendarConfig(normalizedInstructorId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedInstructorId.value),
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
    
    // Query: Fetch setup info
    const {
        data: setupInfo,
        isLoading: isLoadingSetup,
        error: setupError,
        refetch: refetchSetup
    } = useQuery({
        queryKey: ['googleCalendar', normalizedInstructorId, 'setupInfo'],
        queryFn: () => fetchSetupInfo(normalizedInstructorId.value, token.value),
        enabled: computed(() => !!token.value && !!normalizedInstructorId.value),
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
    
    // Mutation: Save calendar config
    const saveCalendarConfigMutation = useMutation({
        mutationFn: (configData) => 
            saveCalendarConfigApi(normalizedInstructorId.value, configData, token.value),
        onSuccess: () => {
            // Invalidate config and setup info
            queryClient.invalidateQueries({ 
                queryKey: ['googleCalendar', normalizedInstructorId.value] 
            })
        }
    })
    
    // Mutation: Test calendar connection (no cache invalidation)
    const testConnectionMutation = useMutation({
        mutationFn: () => testCalendarConnectionApi(normalizedInstructorId.value, token.value)
    })
    
    // Loading and error states
    const loading = computed(() => 
        isLoadingConfig.value || 
        isLoadingSetup.value
    )
    
    const error = computed(() => 
        configError.value || 
        setupError.value
    )
    
    // Methods
    const invalidateCalendar = () => {
        queryClient.invalidateQueries({ 
            queryKey: ['googleCalendar', normalizedInstructorId.value] 
        })
    }
    
    // Return reactive state and methods
    return {
        // State
        calendarConfig,
        setupInfo,
        loading,
        error,
        isLoadingConfig,
        isLoadingSetup,
        configError,
        setupError,
        
        // Mutations
        saveCalendarConfig: saveCalendarConfigMutation.mutateAsync,
        testConnection: testConnectionMutation.mutateAsync,
        isSavingConfig: saveCalendarConfigMutation.isPending,
        isTestingConnection: testConnectionMutation.isPending,
        
        // Methods
        refetchConfig,
        refetchSetup,
        invalidateCalendar
    }
}
