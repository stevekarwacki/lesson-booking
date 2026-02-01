import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch SMTP configuration from API
 * @param {string} token - Auth token
 * @returns {Promise<Object>} SMTP configuration
 */
async function fetchSMTPConfig(token) {
    const response = await fetch('/api/admin/settings/smtp', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch SMTP configuration')
    }
    
    return await response.json()
}

/**
 * Save SMTP configuration to API
 * @param {Object} configData - SMTP configuration data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveSMTPConfigApi(configData, token) {
    const response = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        // Handle validation errors specially
        if (response.status === 400 && data.details) {
            const errorMessage = Object.entries(data.details)
                .map(([field, message]) => `${field}: ${message}`)
                .join(', ')
            throw new Error(errorMessage)
        }
        throw new Error(data.error || 'Failed to save SMTP configuration')
    }
    
    return data
}

/**
 * Delete SMTP configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Delete result
 */
async function deleteSMTPConfigApi(token) {
    const response = await fetch('/api/admin/settings/smtp', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete SMTP configuration')
    }
    
    return data
}

/**
 * Test SMTP connection by sending test email
 * @param {string} recipientEmail - Email to send test to
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Test result
 */
async function testSMTPConnectionApi(recipientEmail, token) {
    const response = await fetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recipient_email: recipientEmail
        })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.details || data.error || 'SMTP connection test failed')
    }
    
    return data
}

/**
 * Composable for managing SMTP email settings using Vue Query
 * Admin-only functionality
 * @returns {Object} SMTP configuration state and methods
 */
export function useEmailSettings() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch SMTP configuration
    const {
        data: smtpConfig,
        isLoading: isLoadingSMTPConfig,
        error: smtpConfigError,
        refetch: refetchSMTPConfig
    } = useQuery({
        queryKey: ['smtpConfig'],
        queryFn: () => fetchSMTPConfig(token.value),
        enabled: computed(() => !!token.value && userStore.user?.role === 'admin'),
        staleTime: 5 * 60 * 1000, // 5 minutes (admin-only, rare changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Mutation: Save SMTP configuration
    const saveSMTPConfigMutation = useMutation({
        mutationFn: (configData) => saveSMTPConfigApi(configData, token.value),
        onSuccess: () => {
            // Invalidate SMTP config to refetch
            queryClient.invalidateQueries({ queryKey: ['smtpConfig'] })
        }
    })
    
    // Mutation: Delete SMTP configuration
    const deleteSMTPConfigMutation = useMutation({
        mutationFn: () => deleteSMTPConfigApi(token.value),
        onSuccess: () => {
            // Invalidate SMTP config to refetch
            queryClient.invalidateQueries({ queryKey: ['smtpConfig'] })
        }
    })
    
    // Mutation: Test SMTP connection (no cache invalidation needed)
    const testSMTPConnectionMutation = useMutation({
        mutationFn: (recipientEmail) => testSMTPConnectionApi(recipientEmail, token.value)
    })
    
    // Computed: Check if SMTP is configured
    const isSMTPConfigured = computed(() => {
        return smtpConfig.value?.is_configured || false
    })
    
    // Methods
    const invalidateSMTPConfig = () => {
        queryClient.invalidateQueries({ queryKey: ['smtpConfig'] })
    }
    
    // Return reactive state and methods
    return {
        // State
        smtpConfig,
        isLoadingSMTPConfig,
        smtpConfigError,
        isSMTPConfigured,
        
        // Mutations
        saveSMTPConfig: saveSMTPConfigMutation.mutateAsync,
        deleteSMTPConfig: deleteSMTPConfigMutation.mutateAsync,
        testSMTPConnection: testSMTPConnectionMutation.mutateAsync,
        isSavingSMTPConfig: saveSMTPConfigMutation.isPending,
        isDeletingSMTPConfig: deleteSMTPConfigMutation.isPending,
        isTestingSMTPConnection: testSMTPConnectionMutation.isPending,
        
        // Methods
        refetchSMTPConfig,
        invalidateSMTPConfig
    }
}
