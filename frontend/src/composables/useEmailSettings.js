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
 * Fetch current email provider selection
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Provider configuration
 */
async function fetchEmailProvider(token) {
    const response = await fetch('/api/admin/settings/email/provider', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch email provider')
    }
    
    return await response.json()
}

/**
 * Set email provider
 * @param {string} provider - Provider type (smtp, gmail_oauth, disabled, or null)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function setEmailProviderApi(provider, token) {
    const response = await fetch('/api/admin/settings/email/provider', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to set email provider')
    }
    
    return data
}

/**
 * Fetch OAuth status
 * @param {string} token - Auth token
 * @returns {Promise<Object>} OAuth status
 */
async function fetchOAuthStatus(token) {
    const response = await fetch('/api/admin/settings/email/oauth/status', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch OAuth status')
    }
    
    return await response.json()
}

/**
 * Fetch instructors with OAuth connections
 * @param {string} token - Auth token
 * @returns {Promise<Object>} List of instructors with OAuth
 */
async function fetchOAuthInstructors(token) {
    const response = await fetch('/api/admin/settings/email/oauth/instructors', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch OAuth instructors')
    }
    
    return await response.json()
}

/**
 * Fetch OAuth credentials configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} OAuth credentials
 */
async function fetchOAuthCredentials(token) {
    const response = await fetch('/api/admin/settings/email/oauth/credentials', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch OAuth credentials')
    }
    
    return await response.json()
}

/**
 * Save OAuth credentials configuration
 * @param {Object} credentialsData - OAuth credentials data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveOAuthCredentialsApi(credentialsData, token) {
    const response = await fetch('/api/admin/settings/email/oauth/credentials', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentialsData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        // Handle validation errors specially
        if (response.status === 400 && data.details) {
            const errorMessage = Object.entries(data.details)
                .filter(([_, value]) => value) // Filter out undefined values
                .map(([field, message]) => `${field}: ${message}`)
                .join(', ')
            throw new Error(errorMessage)
        }
        throw new Error(data.error || 'Failed to save OAuth credentials')
    }
    
    return data
}

/**
 * Delete OAuth credentials configuration
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Delete result
 */
async function deleteOAuthCredentialsApi(token) {
    const response = await fetch('/api/admin/settings/email/oauth/credentials', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to delete OAuth credentials')
    }
    
    return data
}

/**
 * Composable for managing email settings using Vue Query
 * Admin-only functionality
 * @returns {Object} Email configuration state and methods
 */
export function useEmailSettings() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch email provider (always fetch first)
    const {
        data: emailProvider,
        isLoading: isLoadingProvider,
        error: providerError,
        refetch: refetchProvider
    } = useQuery({
        queryKey: ['emailProvider'],
        queryFn: () => fetchEmailProvider(token.value),
        enabled: computed(() => !!token.value && userStore.user?.role === 'admin'),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })
    
    // Query: Fetch SMTP configuration (only when provider is 'smtp')
    const {
        data: smtpConfig,
        isLoading: isLoadingSMTPConfig,
        error: smtpConfigError,
        refetch: refetchSMTPConfig
    } = useQuery({
        queryKey: ['smtpConfig'],
        queryFn: () => fetchSMTPConfig(token.value),
        enabled: computed(() => 
            !!token.value && 
            userStore.user?.role === 'admin' &&
            emailProvider.value?.provider === 'smtp'
        ),
        staleTime: 5 * 60 * 1000, // 5 minutes (admin-only, rare changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Query: Fetch OAuth status (only when provider is 'gmail_oauth')
    const {
        data: oauthStatus,
        isLoading: isLoadingOAuthStatus,
        error: oauthStatusError,
        refetch: refetchOAuthStatus
    } = useQuery({
        queryKey: ['emailOAuthStatus'],
        queryFn: () => fetchOAuthStatus(token.value),
        enabled: computed(() => 
            !!token.value && 
            userStore.user?.role === 'admin' &&
            emailProvider.value?.provider === 'gmail_oauth'
        ),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })
    
    // Query: Fetch OAuth instructors (only when provider is 'gmail_oauth')
    const {
        data: oauthInstructors,
        isLoading: isLoadingOAuthInstructors,
        error: oauthInstructorsError,
        refetch: refetchOAuthInstructors
    } = useQuery({
        queryKey: ['emailOAuthInstructors'],
        queryFn: () => fetchOAuthInstructors(token.value),
        enabled: computed(() => 
            !!token.value && 
            userStore.user?.role === 'admin' &&
            emailProvider.value?.provider === 'gmail_oauth'
        ),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })
    
    // Query: Fetch OAuth credentials (only when provider is 'gmail_oauth')
    const {
        data: oauthCredentials,
        isLoading: isLoadingOAuthCredentials,
        error: oauthCredentialsError,
        refetch: refetchOAuthCredentials
    } = useQuery({
        queryKey: ['emailOAuthCredentials'],
        queryFn: () => fetchOAuthCredentials(token.value),
        enabled: computed(() => 
            !!token.value && 
            userStore.user?.role === 'admin' &&
            emailProvider.value?.provider === 'gmail_oauth'
        ),
        staleTime: 5 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
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
    
    // Mutation: Set email provider
    const setEmailProviderMutation = useMutation({
        mutationFn: (provider) => setEmailProviderApi(provider, token.value),
        onSuccess: () => {
            // Invalidate provider query to refetch
            queryClient.invalidateQueries({ queryKey: ['emailProvider'] })
        }
    })
    
    // Mutation: Save OAuth credentials
    const saveOAuthCredentialsMutation = useMutation({
        mutationFn: (credentialsData) => saveOAuthCredentialsApi(credentialsData, token.value),
        onSuccess: () => {
            // Invalidate OAuth queries to refetch
            queryClient.invalidateQueries({ queryKey: ['emailOAuthCredentials'] })
            queryClient.invalidateQueries({ queryKey: ['emailOAuthStatus'] })
        }
    })
    
    // Mutation: Delete OAuth credentials
    const deleteOAuthCredentialsMutation = useMutation({
        mutationFn: () => deleteOAuthCredentialsApi(token.value),
        onSuccess: () => {
            // Invalidate OAuth queries to refetch
            queryClient.invalidateQueries({ queryKey: ['emailOAuthCredentials'] })
            queryClient.invalidateQueries({ queryKey: ['emailOAuthStatus'] })
        }
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
        // SMTP State
        smtpConfig,
        isLoadingSMTPConfig,
        smtpConfigError,
        isSMTPConfigured,
        
        // Provider State
        emailProvider,
        isLoadingProvider,
        providerError,
        
        // OAuth Status State
        oauthStatus,
        isLoadingOAuthStatus,
        oauthStatusError,
        
        // OAuth Instructors State
        oauthInstructors,
        isLoadingOAuthInstructors,
        oauthInstructorsError,
        
        // OAuth Credentials State
        oauthCredentials,
        isLoadingOAuthCredentials,
        oauthCredentialsError,
        
        // SMTP Mutations
        saveSMTPConfig: saveSMTPConfigMutation.mutateAsync,
        deleteSMTPConfig: deleteSMTPConfigMutation.mutateAsync,
        testSMTPConnection: testSMTPConnectionMutation.mutateAsync,
        isSavingSMTPConfig: saveSMTPConfigMutation.isPending,
        isDeletingSMTPConfig: deleteSMTPConfigMutation.isPending,
        isTestingSMTPConnection: testSMTPConnectionMutation.isPending,
        
        // Provider Mutations
        setEmailProvider: setEmailProviderMutation.mutateAsync,
        isSettingProvider: setEmailProviderMutation.isPending,
        
        // OAuth Credentials Mutations
        saveOAuthCredentials: saveOAuthCredentialsMutation.mutateAsync,
        deleteOAuthCredentials: deleteOAuthCredentialsMutation.mutateAsync,
        isSavingOAuthCredentials: saveOAuthCredentialsMutation.isPending,
        isDeletingOAuthCredentials: deleteOAuthCredentialsMutation.isPending,
        
        // Methods
        refetchSMTPConfig,
        refetchProvider,
        refetchOAuthStatus,
        refetchOAuthInstructors,
        refetchOAuthCredentials,
        invalidateSMTPConfig
    }
}
