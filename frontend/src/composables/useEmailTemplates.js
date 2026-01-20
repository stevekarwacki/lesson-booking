import { computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

/**
 * Fetch all email templates from API
 * @param {string} token - Auth token
 * @returns {Promise<Array>} Email templates
 */
async function fetchEmailTemplates(token) {
    const response = await fetch('/api/admin/email-templates', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    if (!response.ok) {
        throw new Error('Failed to fetch email templates')
    }
    
    const data = await response.json()
    // Check if data is an array directly or has templates property
    return Array.isArray(data) ? data : (data.templates || [])
}

/**
 * Save email template to API
 * @param {string} templateKey - Template key
 * @param {Object} templateData - Template data
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Save result
 */
async function saveEmailTemplateApi(templateKey, templateData, token) {
    const response = await fetch(`/api/admin/email-templates/${templateKey}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to save template')
    }
    
    return data
}

/**
 * Send test email for template
 * @param {string} templateKey - Template key
 * @param {string} recipientEmail - Email to send test to
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Test result
 */
async function sendTestEmailApi(templateKey, recipientEmail, token) {
    const response = await fetch(`/api/admin/email-templates/${templateKey}/test`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recipientEmail
        })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
    }
    
    return data
}

/**
 * Reset email template to default
 * @param {string} templateKey - Template key
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Reset result
 */
async function resetEmailTemplateApi(templateKey, token) {
    const response = await fetch(`/api/admin/email-templates/${templateKey}/reset`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to reset template')
    }
    
    return data
}

/**
 * Composable for managing email templates using Vue Query
 * Admin-only functionality
 * @returns {Object} Email templates state and methods
 */
export function useEmailTemplates() {
    const userStore = useUserStore()
    const queryClient = useQueryClient()
    const token = computed(() => userStore.token)
    
    // Query: Fetch all email templates
    const {
        data: templates,
        isLoading: isLoadingTemplates,
        error: templatesError,
        refetch: refetchTemplates
    } = useQuery({
        queryKey: ['emailTemplates'],
        queryFn: () => fetchEmailTemplates(token.value),
        enabled: computed(() => !!token.value && userStore.user?.role === 'admin'),
        staleTime: 5 * 60 * 1000, // 5 minutes (admin-only, rare changes)
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
    
    // Mutation: Save email template
    const saveEmailTemplateMutation = useMutation({
        mutationFn: ({ templateKey, templateData }) => 
            saveEmailTemplateApi(templateKey, templateData, token.value),
        onSuccess: () => {
            // Invalidate templates to refetch
            queryClient.invalidateQueries({ queryKey: ['emailTemplates'] })
        }
    })
    
    // Mutation: Send test email (no cache invalidation needed)
    const sendTestEmailMutation = useMutation({
        mutationFn: ({ templateKey, recipientEmail }) => 
            sendTestEmailApi(templateKey, recipientEmail, token.value)
    })
    
    // Mutation: Reset email template
    const resetEmailTemplateMutation = useMutation({
        mutationFn: (templateKey) => resetEmailTemplateApi(templateKey, token.value),
        onSuccess: () => {
            // Invalidate templates to refetch updated content
            queryClient.invalidateQueries({ queryKey: ['emailTemplates'] })
        }
    })
    
    // Helper: Get template by key
    const getTemplateByKey = (templateKey) => {
        return templates.value?.find(t => t.template_key === templateKey) || null
    }
    
    // Methods
    const invalidateTemplates = () => {
        queryClient.invalidateQueries({ queryKey: ['emailTemplates'] })
    }
    
    // Return reactive state and methods
    return {
        // State
        templates,
        isLoadingTemplates,
        templatesError,
        
        // Helpers
        getTemplateByKey,
        
        // Mutations
        saveEmailTemplate: saveEmailTemplateMutation.mutateAsync,
        sendTestEmail: sendTestEmailMutation.mutateAsync,
        resetEmailTemplate: resetEmailTemplateMutation.mutateAsync,
        isSavingTemplate: saveEmailTemplateMutation.isPending,
        isSendingTest: sendTestEmailMutation.isPending,
        isResettingTemplate: resetEmailTemplateMutation.isPending,
        
        // Methods
        refetchTemplates,
        invalidateTemplates
    }
}
