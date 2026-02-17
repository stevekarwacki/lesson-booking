import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch current calendar method
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Calendar method configuration
 */
async function fetchCalendarMethod(token) {
    const response = await fetch('/api/admin/settings/calendar/method', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch calendar method')
    }

    return await response.json()
}

/**
 * Set calendar method
 * @param {string} method - Method type (oauth, service_account, disabled)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function setCalendarMethodApi(method, token) {
    const response = await fetch('/api/admin/settings/calendar/method', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method })
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Failed to set calendar method')
    }

    return data
}

/**
 * Fetch service account configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Service account config
 */
async function fetchServiceAccountConfig(token) {
    const response = await fetch('/api/admin/settings/calendar/service-account', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch service account configuration')
    }

    return await response.json()
}

/**
 * Save service account credentials
 * @param {Object} credentials - Service account credentials
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveServiceAccountApi(credentials, token) {
    const response = await fetch('/api/admin/settings/calendar/service-account', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
    })

    const data = await response.json()

    if (!response.ok) {
        if (response.status === 400 && data.details) {
            const errorMessage = Object.entries(data.details)
                .filter(([_, value]) => value)
                .map(([field, message]) => `${field}: ${message}`)
                .join(', ')
            throw new Error(errorMessage)
        }
        throw new Error(data.error || 'Failed to save service account configuration')
    }

    return data
}

/**
 * Delete service account credentials
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Delete result
 */
async function deleteServiceAccountApi(token) {
    const response = await fetch('/api/admin/settings/calendar/service-account', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete service account configuration')
    }

    return data
}

/**
 * Fetch instructors with calendar connections
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Connected instructors list
 */
async function fetchConnectedInstructors(token) {
    const response = await fetch('/api/admin/settings/calendar/connected-instructors', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch connected instructors')
    }

    return await response.json()
}

/**
 * Composable for managing calendar settings using Vue Query
 * Admin-only functionality
 * @returns {Object} Calendar configuration state and methods
 */
export function useCalendarSettings() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    const isAdmin = computed(() => !!token.value && userStore.user?.role === 'admin')

    // Query: Fetch calendar method (always fetch for admin)
    const {
        data: calendarMethod,
        isLoading: isLoadingMethod,
        error: methodError,
        refetch: refetchMethod
    } = useQuery({
        queryKey: ['calendarMethod'],
        queryFn: () => fetchCalendarMethod(token.value),
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })

    // Query: Fetch service account config (only when method is 'service_account')
    const {
        data: serviceAccountConfig,
        isLoading: isLoadingServiceAccount,
        error: serviceAccountError,
        refetch: refetchServiceAccount
    } = useQuery({
        queryKey: ['calendarServiceAccount'],
        queryFn: () => fetchServiceAccountConfig(token.value),
        enabled: computed(() =>
            isAdmin.value &&
            calendarMethod.value?.method === 'service_account'
        ),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })

    // Query: Fetch connected instructors (for any active method)
    const {
        data: connectedInstructors,
        isLoading: isLoadingInstructors,
        error: instructorsError,
        refetch: refetchInstructors
    } = useQuery({
        queryKey: ['calendarConnectedInstructors'],
        queryFn: () => fetchConnectedInstructors(token.value),
        enabled: computed(() =>
            isAdmin.value &&
            calendarMethod.value?.method !== 'disabled' &&
            !!calendarMethod.value?.method
        ),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })

    // Mutation: Set calendar method
    const setCalendarMethodMutation = useMutation({
        mutationFn: (method) => setCalendarMethodApi(method, token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendarMethod'] })
            queryClient.invalidateQueries({ queryKey: ['calendarConnectedInstructors'] })
        }
    })

    // Mutation: Save service account credentials
    const saveServiceAccountMutation = useMutation({
        mutationFn: (credentials) => saveServiceAccountApi(credentials, token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendarServiceAccount'] })
        }
    })

    // Mutation: Delete service account credentials
    const deleteServiceAccountMutation = useMutation({
        mutationFn: () => deleteServiceAccountApi(token.value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendarServiceAccount'] })
        }
    })

    return {
        // Method state
        calendarMethod,
        isLoadingMethod,
        methodError,

        // Service account state
        serviceAccountConfig,
        isLoadingServiceAccount,
        serviceAccountError,

        // Connected instructors state
        connectedInstructors,
        isLoadingInstructors,
        instructorsError,

        // Mutations
        setCalendarMethod: setCalendarMethodMutation.mutateAsync,
        isSettingMethod: setCalendarMethodMutation.isPending,
        saveServiceAccount: saveServiceAccountMutation.mutateAsync,
        isSavingServiceAccount: saveServiceAccountMutation.isPending,
        deleteServiceAccount: deleteServiceAccountMutation.mutateAsync,
        isDeletingServiceAccount: deleteServiceAccountMutation.isPending,

        // Refetch methods
        refetchMethod,
        refetchServiceAccount,
        refetchInstructors
    }
}
