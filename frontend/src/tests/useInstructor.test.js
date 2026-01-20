import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useInstructor } from '../composables/useInstructor'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    props: ['instructorId'],
    setup(props) {
        const instructor = useInstructor(props.instructorId)
        return { instructor }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useInstructor Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        // Setup Pinia first
        pinia = createPinia()
        setActivePinia(pinia)
        
        // Setup user store with token BEFORE any component mount
        userStore = useUserStore()
        userStore.user = { id: 'user-123', name: 'Test User', role: 'student' }
        userStore.token = 'test-token'
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

    const createWrapper = (props = {}) => {
        return mount(TestComponent, {
            props,
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Instructor Query', () => {
        it('should provide instructor query state', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { instructor, isLoadingInstructor, instructorError } = wrapper.vm.instructor
            
            expect(instructor).toBeDefined()
            expect(isLoadingInstructor).toBeDefined()
            expect(instructorError).toBeDefined()
        })

        it('should construct correct query key for instructor', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            expect(instructorQuery).toBeDefined()
            expect(instructorQuery.queryKey).toEqual(['instructors', 1])
        })

        it('should use 5-minute staleTime for instructor', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            expect(instructorQuery).toBeDefined()
            expect(instructorQuery.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('should not run query when instructorId is missing', () => {
            wrapper = createWrapper({ instructorId: null })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            // Query should exist but not be enabled
            expect(instructorQuery).toBeDefined()
            expect(instructorQuery.state.status).toBe('pending')
        })

        it('should not run query when token is missing', () => {
            userStore.token = null
            wrapper = createWrapper({ instructorId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            // Query should exist but not be enabled
            expect(instructorQuery).toBeDefined()
            expect(instructorQuery.state.status).toBe('pending')
        })
    })

    describe('Hourly Rate Computation', () => {
        it('should extract hourly rate from instructor data', async () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { hourlyRate } = wrapper.vm.instructor
            
            // Initially null/undefined
            expect(hourlyRate.value).toBeNull()
            
            // Mock instructor data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 1,
                    name: 'Test Instructor',
                    hourly_rate: '75.50'
                })
            })
            
            // Trigger refetch
            const { refetchInstructor } = wrapper.vm.instructor
            await refetchInstructor()
            
            // Should parse hourly rate as float
            expect(hourlyRate.value).toBe(75.50)
        })

        it('should return null when instructor has no hourly_rate', async () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            // Mock instructor data without hourly_rate
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 1,
                    name: 'Test Instructor'
                })
            })
            
            const { refetchInstructor, hourlyRate } = wrapper.vm.instructor
            await refetchInstructor()
            
            expect(hourlyRate.value).toBeNull()
        })
    })

    describe('Refetch and Invalidation', () => {
        it('should provide refetchInstructor method', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { refetchInstructor } = wrapper.vm.instructor
            
            expect(typeof refetchInstructor).toBe('function')
        })

        it('should provide invalidateInstructor method', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const { invalidateInstructor } = wrapper.vm.instructor
            
            expect(typeof invalidateInstructor).toBe('function')
        })

        it('should invalidate instructor cache when called', () => {
            wrapper = createWrapper({ instructorId: 1 })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidateInstructor } = wrapper.vm.instructor
            invalidateInstructor()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const instructorCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'instructors'
            )
            expect(instructorCall).toBeDefined()
        })
    })

    describe('Parameter Normalization', () => {
        it('should support raw instructorId values', () => {
            wrapper = createWrapper({ instructorId: 42 })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            expect(instructorQuery.queryKey).toEqual(['instructors', 42])
        })

        it('should handle null instructorId', () => {
            wrapper = createWrapper({ instructorId: null })
            
            const queries = queryClient.getQueryCache().getAll()
            const instructorQuery = queries.find(q => q.queryKey[0] === 'instructors')
            
            expect(instructorQuery).toBeDefined()
            expect(instructorQuery.queryKey).toEqual(['instructors', null])
        })
    })
})
