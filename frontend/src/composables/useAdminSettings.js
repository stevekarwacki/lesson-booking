import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch storage configuration from API
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Storage configuration
 */
async function fetchStorageConfig(token) {
    const response = await fetch('/api/admin/settings/storage', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to load storage configuration')
    }
    
    return await response.json()
}

/**
 * Save storage configuration to API
 * @param {Object} storageData - Storage configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveStorageConfigApi(storageData, token) {
    const response = await fetch('/api/admin/settings/storage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storageData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration')
    }
    
    return data
}

/**
 * Test storage connection
 * @param {Object} storageData - Storage configuration to test
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Test result
 */
async function testStorageConnectionApi(storageData, token) {
    const response = await fetch('/api/admin/settings/storage/test-connection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storageData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        const errorMessage = data.error || 'Connection test failed'
        const errorDetails = data.details ? `: ${data.details}` : ''
        throw new Error(errorMessage + errorDetails)
    }
    
    return data
}

/**
 * Save theme settings to API
 * @param {Object} themeConfig - Theme configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveThemeSettingsApi(themeConfig, token) {
    const response = await fetch('/api/admin/settings/theme', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(themeConfig)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to save theme settings')
    }
    
    return result
}

/**
 * Composable for managing admin settings (theme and storage)
 * Admin-only functionality with Vue Query
 * @returns {Object} Admin settings state and methods
 */
export function useAdminSettings() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch storage configuration
    const {
        data: storageConfig,
        isLoading: isLoadingStorage,
        error: storageError,
        refetch: refetchStorage
    } = useQuery({
        queryKey: ['storage'],
        queryFn: () => fetchStorageConfig(token.value),
        enabled: computed(() => !!token.value && userStore.user?.role === 'admin'),
        staleTime: 5 * 60 * 1000, // 5 minutes (admin-only, rare changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Mutation: Save storage configuration
    const saveStorageConfigMutation = useMutation({
        mutationFn: (storageData) => saveStorageConfigApi(storageData, token.value),
        onSuccess: () => {
            // Invalidate storage config to refetch
            queryClient.invalidateQueries({ queryKey: ['storage'] })
        }
    })
    
    // Mutation: Test storage connection (no cache invalidation needed)
    const testStorageConnectionMutation = useMutation({
        mutationFn: (storageData) => testStorageConnectionApi(storageData, token.value)
    })
    
    // Mutation: Save theme settings
    const saveThemeSettingsMutation = useMutation({
        mutationFn: (themeConfig) => saveThemeSettingsApi(themeConfig, token.value),
        onSuccess: () => {
            // Invalidate public config to refetch theme for all users
            queryClient.invalidateQueries({ queryKey: ['publicConfig'] })
        }
    })
    
    // Methods
    const invalidateStorage = () => {
        queryClient.invalidateQueries({ queryKey: ['storage'] })
    }
    
    // Return reactive state and methods
    return {
        // Storage State
        storageConfig,
        isLoadingStorage,
        storageError,
        
        // Mutations
        saveStorageConfig: saveStorageConfigMutation.mutateAsync,
        testStorageConnection: testStorageConnectionMutation.mutateAsync,
        saveThemeSettings: saveThemeSettingsMutation.mutateAsync,
        isSavingStorage: saveStorageConfigMutation.isPending,
        isTestingConnection: testStorageConnectionMutation.isPending,
        isSavingTheme: saveThemeSettingsMutation.isPending,
        
        // Methods
        refetchStorage,
        invalidateStorage
    }
}
