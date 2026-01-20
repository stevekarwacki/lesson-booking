import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useEmailTemplates } from '../composables/useEmailTemplates'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    setup() {
        const emailTemplates = useEmailTemplates()
        return { emailTemplates }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useEmailTemplates Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        // Setup Pinia first
        pinia = createPinia()
        setActivePinia(pinia)
        
        // Setup user store as admin with token
        userStore = useUserStore()
        userStore.user = { id: 'admin-123', name: 'Admin User', role: 'admin', email: 'admin@test.com' }
        userStore.token = 'admin-token'
        userStore.isAuthenticated = true
        
        // Setup QueryClient
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        })
        
        vi.clearAllMocks()
    })

    afterEach(() => {
        if (wrapper) {
            wrapper.unmount()
        }
        queryClient.clear()
    })

    const createWrapper = () => {
        return mount(TestComponent, {
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Email Templates Query', () => {
        it('should provide templates query state', () => {
            wrapper = createWrapper()
            
            const { templates, isLoadingTemplates, templatesError } = wrapper.vm.emailTemplates
            
            expect(templates).toBeDefined()
            expect(isLoadingTemplates).toBeDefined()
            expect(templatesError).toBeDefined()
        })

        it('should construct correct query key for templates', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const templatesQuery = queries.find(q => q.queryKey[0] === 'emailTemplates')
            
            expect(templatesQuery).toBeDefined()
            expect(templatesQuery.queryKey).toEqual(['emailTemplates'])
        })

        it('should use 5-minute staleTime for templates', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const templatesQuery = queries.find(q => q.queryKey[0] === 'emailTemplates')
            
            expect(templatesQuery).toBeDefined()
            expect(templatesQuery.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('should only run query for admin users', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const templatesQuery = queries.find(q => q.queryKey[0] === 'emailTemplates')
            
            // Query should be enabled for admin
            expect(templatesQuery).toBeDefined()
        })

        it('should not run query for non-admin users', () => {
            userStore.user.role = 'student'
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const templatesQuery = queries.find(q => q.queryKey[0] === 'emailTemplates')
            
            // Query should exist but not be enabled
            expect(templatesQuery).toBeDefined()
            expect(templatesQuery.state.status).toBe('pending')
        })
    })

    describe('Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper()
        })

        it('should expose saveEmailTemplate mutation', () => {
            const { saveEmailTemplate, isSavingTemplate } = wrapper.vm.emailTemplates
            
            expect(typeof saveEmailTemplate).toBe('function')
            expect(isSavingTemplate).toBeDefined()
        })

        it('should expose sendTestEmail mutation', () => {
            const { sendTestEmail, isSendingTest } = wrapper.vm.emailTemplates
            
            expect(typeof sendTestEmail).toBe('function')
            expect(isSendingTest).toBeDefined()
        })

        it('should expose resetEmailTemplate mutation', () => {
            const { resetEmailTemplate, isResettingTemplate } = wrapper.vm.emailTemplates
            
            expect(typeof resetEmailTemplate).toBe('function')
            expect(isResettingTemplate).toBeDefined()
        })

        it('should save template and invalidate cache', async () => {
            const { saveEmailTemplate } = wrapper.vm.emailTemplates
            
            const templateData = {
                subject_template: 'New Subject',
                body_template: 'New Body'
            }
            
            // Mock successful save
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    template: {
                        template_key: 'booking_confirmation',
                        ...templateData
                    }
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await saveEmailTemplate({
                templateKey: 'booking_confirmation',
                templateData
            })
            
            // Check fetch was called
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/email-templates/booking_confirmation')
            expect(fetchCall[1].method).toBe('PUT')
            
            // Should invalidate templates cache
            const invalidateCalls = invalidateSpy.mock.calls
            const templatesCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'emailTemplates'
            )
            expect(templatesCall).toBeDefined()
        })

        it('should send test email without caching', async () => {
            const { sendTestEmail } = wrapper.vm.emailTemplates
            
            // Mock successful test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Test email sent'
                })
            })
            
            const result = await sendTestEmail({
                templateKey: 'booking_confirmation',
                recipientEmail: 'admin@test.com'
            })
            
            expect(result.success).toBe(true)
            
            // Check fetch was called
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/email-templates/booking_confirmation/test')
            expect(fetchCall[1].method).toBe('POST')
            expect(JSON.parse(fetchCall[1].body)).toEqual({ recipientEmail: 'admin@test.com' })
        })

        it('should reset template and invalidate cache', async () => {
            const { resetEmailTemplate } = wrapper.vm.emailTemplates
            
            // Mock successful reset
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    template: {
                        template_key: 'booking_confirmation',
                        subject_template: 'Default Subject',
                        body_template: 'Default Body'
                    }
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await resetEmailTemplate('booking_confirmation')
            
            // Check fetch was called
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/email-templates/booking_confirmation/reset')
            expect(fetchCall[1].method).toBe('POST')
            
            // Should invalidate templates cache
            const invalidateCalls = invalidateSpy.mock.calls
            const templatesCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'emailTemplates'
            )
            expect(templatesCall).toBeDefined()
        })

        it('should handle save errors gracefully', async () => {
            const { saveEmailTemplate } = wrapper.vm.emailTemplates
            
            // Mock failed save
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid template' })
            })
            
            await expect(
                saveEmailTemplate({
                    templateKey: 'test',
                    templateData: {}
                })
            ).rejects.toThrow('Invalid template')
        })

        it('should handle test email errors gracefully', async () => {
            const { sendTestEmail } = wrapper.vm.emailTemplates
            
            // Mock failed test
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Email service unavailable' })
            })
            
            await expect(
                sendTestEmail({
                    templateKey: 'test',
                    recipientEmail: 'test@test.com'
                })
            ).rejects.toThrow('Email service unavailable')
        })

        it('should handle reset errors gracefully', async () => {
            const { resetEmailTemplate } = wrapper.vm.emailTemplates
            
            // Mock failed reset
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Template not found' })
            })
            
            await expect(
                resetEmailTemplate('invalid')
            ).rejects.toThrow('Template not found')
        })
    })

    describe('Helper Methods', () => {
        it('should provide getTemplateByKey helper', async () => {
            wrapper = createWrapper()
            
            const { getTemplateByKey } = wrapper.vm.emailTemplates
            
            expect(typeof getTemplateByKey).toBe('function')
            
            // Mock template data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ([
                    { template_key: 'booking_confirmation', name: 'Booking Confirmation' },
                    { template_key: 'cancellation', name: 'Cancellation' }
                ])
            })
            
            const { refetchTemplates } = wrapper.vm.emailTemplates
            await refetchTemplates()
            
            const template = getTemplateByKey('booking_confirmation')
            expect(template).toBeDefined()
            expect(template.name).toBe('Booking Confirmation')
        })

        it('should return null for non-existent template', async () => {
            wrapper = createWrapper()
            
            const { getTemplateByKey } = wrapper.vm.emailTemplates
            
            const template = getTemplateByKey('non_existent')
            expect(template).toBeNull()
        })
    })

    describe('Refetch and Invalidation', () => {
        it('should provide refetch method', () => {
            wrapper = createWrapper()
            
            const { refetchTemplates } = wrapper.vm.emailTemplates
            
            expect(typeof refetchTemplates).toBe('function')
        })

        it('should provide invalidation method', () => {
            wrapper = createWrapper()
            
            const { invalidateTemplates } = wrapper.vm.emailTemplates
            
            expect(typeof invalidateTemplates).toBe('function')
        })

        it('should invalidate templates cache when called', () => {
            wrapper = createWrapper()
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidateTemplates } = wrapper.vm.emailTemplates
            invalidateTemplates()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const templatesCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'emailTemplates'
            )
            expect(templatesCall).toBeDefined()
        })
    })
})
