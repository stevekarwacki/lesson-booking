import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useGoogleCalendar } from '../composables/useGoogleCalendar'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    props: ['instructorId'],
    setup(props) {
        const googleCalendar = useGoogleCalendar(props.instructorId)
        return { googleCalendar }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useGoogleCalendar Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)
        
        userStore = useUserStore()
        userStore.user = { id: 'instructor-123', name: 'Instructor', role: 'instructor' }
        userStore.token = 'test-token'
        userStore.isAuthenticated = true
        
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

    const createWrapper = (props = {}) => {
        return mount(TestComponent, {
            props,
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Calendar Config Query', () => {
        it('should provide calendar config query state', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { calendarConfig, isLoadingConfig, configError } = wrapper.vm.googleCalendar
            
            expect(calendarConfig).toBeDefined()
            expect(isLoadingConfig).toBeDefined()
            expect(configError).toBeDefined()
        })

        it('should construct correct query key for config', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const configQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' && 
                q.queryKey[2] === 'config'
            )
            
            expect(configQuery).toBeDefined()
            expect(configQuery.queryKey).toEqual(['googleCalendar', 1, 'config'])
        })

        it('should use 2-minute staleTime', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const configQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' && 
                q.queryKey[2] === 'config'
            )
            
            expect(configQuery).toBeDefined()
            expect(configQuery.options.staleTime).toBe(2 * 60 * 1000)
        })

        it('should not run query when instructorId is missing', () => {
            wrapper = createWrapper({ instructorId: null })
            
            const queries = queryClient.getQueryCache().getAll()
            const configQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' && 
                q.queryKey[2] === 'config'
            )
            
            expect(configQuery).toBeDefined()
            expect(configQuery.state.status).toBe('pending')
        })
    })

    describe('Setup Info Query', () => {
        it('should provide setup info query state', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { setupInfo, isLoadingSetup, setupError } = wrapper.vm.googleCalendar
            
            expect(setupInfo).toBeDefined()
            expect(isLoadingSetup).toBeDefined()
            expect(setupError).toBeDefined()
        })

        it('should construct correct query key for setup info', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const setupQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' && 
                q.queryKey[2] === 'setupInfo'
            )
            
            expect(setupQuery).toBeDefined()
            expect(setupQuery.queryKey).toEqual(['googleCalendar', 1, 'setupInfo'])
        })
    })

    describe('Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper({ instructorId: 1 })
        })

        it('should expose saveCalendarConfig mutation', () => {
            const { saveCalendarConfig, isSavingConfig } = wrapper.vm.googleCalendar
            
            expect(typeof saveCalendarConfig).toBe('function')
            expect(isSavingConfig).toBeDefined()
        })

        it('should expose testConnection mutation', () => {
            const { testConnection, isTestingConnection } = wrapper.vm.googleCalendar
            
            expect(typeof testConnection).toBe('function')
            expect(isTestingConnection).toBeDefined()
        })

        it('should save config and invalidate cache', async () => {
            const { saveCalendarConfig } = wrapper.vm.googleCalendar
            
            const configData = {
                calendar_id: 'primary',
                all_day_event_handling: 'block'
            }
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, config: configData })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await saveCalendarConfig(configData)
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/auth/calendar/config/1')
            expect(fetchCall[1].method).toBe('POST')
            
            // Should invalidate googleCalendar queries
            const invalidateCalls = invalidateSpy.mock.calls
            const calendarCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'googleCalendar' &&
                call[0].queryKey[1] === 1
            )
            expect(calendarCall).toBeDefined()
        })

        it('should test connection without caching', async () => {
            const { testConnection } = wrapper.vm.googleCalendar
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    eventsFound: 5
                })
            })
            
            const result = await testConnection()
            
            expect(result.success).toBe(true)
            expect(result.eventsFound).toBe(5)
            
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/auth/calendar/test/1')
        })

        it('should handle save errors', async () => {
            const { saveCalendarConfig } = wrapper.vm.googleCalendar
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid calendar ID' })
            })
            
            await expect(
                saveCalendarConfig({})
            ).rejects.toThrow('Invalid calendar ID')
        })
    })

    describe('Loading and Error States', () => {
        it('should aggregate loading states', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { loading, isLoadingConfig, isLoadingSetup } = wrapper.vm.googleCalendar
            
            expect(loading).toBeDefined()
            expect(isLoadingConfig).toBeDefined()
            expect(isLoadingSetup).toBeDefined()
        })

        it('should aggregate error states', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { error, configError, setupError } = wrapper.vm.googleCalendar
            
            expect(error).toBeDefined()
            expect(configError).toBeDefined()
            expect(setupError).toBeDefined()
        })
    })

    describe('Methods', () => {
        it('should provide refetch methods', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { refetchConfig, refetchSetup } = wrapper.vm.googleCalendar
            
            expect(typeof refetchConfig).toBe('function')
            expect(typeof refetchSetup).toBe('function')
        })

        it('should provide invalidation method', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { invalidateCalendar } = wrapper.vm.googleCalendar
            
            expect(typeof invalidateCalendar).toBe('function')
        })

        it('should invalidate calendar cache when called', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidateCalendar } = wrapper.vm.googleCalendar
            invalidateCalendar()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const calendarCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'googleCalendar' &&
                call[0].queryKey[1] === 1
            )
            expect(calendarCall).toBeDefined()
        })
    })

    describe('Parameter Normalization', () => {
        it('should support raw instructorId values', () => {
            wrapper = createWrapper({ instructorId: 42 })
            
            const queries = queryClient.getQueryCache().getAll()
            const configQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' &&
                q.queryKey[2] === 'config'
            )
            
            expect(configQuery.queryKey[1]).toBe(42)
        })

        it('should handle null instructorId', () => {
            wrapper = createWrapper({ instructorId: null })
            
            const queries = queryClient.getQueryCache().getAll()
            const configQuery = queries.find(q => 
                q.queryKey[0] === 'googleCalendar' &&
                q.queryKey[2] === 'config'
            )
            
            expect(configQuery).toBeDefined()
            expect(configQuery.queryKey[1]).toBeNull()
        })
    })
})
