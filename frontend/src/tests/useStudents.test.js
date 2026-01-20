import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useStudents } from '../composables/useStudents'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    setup() {
        const students = useStudents()
        return { students }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useStudents Composable', () => {
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
        userStore.user = { id: 'user-123', name: 'Test User', role: 'instructor' }
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

    const createWrapper = () => {
        return mount(TestComponent, {
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Students Query', () => {
        it('should provide students query state', () => {
            wrapper = createWrapper()
            
            const { students, isLoadingStudents, studentsError } = wrapper.vm.students
            
            expect(students).toBeDefined()
            expect(isLoadingStudents).toBeDefined()
            expect(studentsError).toBeDefined()
        })

        it('should construct correct query key for students', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const studentsQuery = queries.find(q => q.queryKey[0] === 'students')
            
            expect(studentsQuery).toBeDefined()
            expect(studentsQuery.queryKey).toEqual(['students'])
        })

        it('should use 5-minute staleTime for students', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const studentsQuery = queries.find(q => q.queryKey[0] === 'students')
            
            expect(studentsQuery).toBeDefined()
            expect(studentsQuery.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('should not run query when token is missing', () => {
            userStore.token = null
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const studentsQuery = queries.find(q => q.queryKey[0] === 'students')
            
            // Query should exist but not be enabled
            expect(studentsQuery).toBeDefined()
            expect(studentsQuery.state.status).toBe('pending')
        })
    })

    describe('Payment Options Query', () => {
        it('should provide payment options query state', () => {
            wrapper = createWrapper()
            
            const { paymentOptions, isLoadingPaymentOptions, paymentOptionsError } = wrapper.vm.students
            
            expect(paymentOptions).toBeDefined()
            expect(isLoadingPaymentOptions).toBeDefined()
            expect(paymentOptionsError).toBeDefined()
        })

        it('should construct correct query key for payment options', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const paymentOptionsQuery = queries.find(q => 
                q.queryKey[0] === 'users' && 
                q.queryKey[1] === 'me' && 
                q.queryKey[2] === 'paymentOptions'
            )
            
            expect(paymentOptionsQuery).toBeDefined()
            expect(paymentOptionsQuery.queryKey).toEqual(['users', 'me', 'paymentOptions'])
        })

        it('should use 2-minute staleTime for payment options', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const paymentOptionsQuery = queries.find(q => 
                q.queryKey[0] === 'users' && 
                q.queryKey[1] === 'me'
            )
            
            expect(paymentOptionsQuery).toBeDefined()
            expect(paymentOptionsQuery.options.staleTime).toBe(2 * 60 * 1000)
        })
    })

    describe('Computed Properties', () => {
        it('should extract canUseInPersonPayment from payment options', async () => {
            wrapper = createWrapper()
            
            const { canUseInPersonPayment } = wrapper.vm.students
            
            // Initially false/undefined
            expect(canUseInPersonPayment.value).toBe(false)
            
            // Mock payment options data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    canUseInPersonPayment: true,
                    cardPaymentOnBehalfEnabled: false
                })
            })
            
            const { refetchPaymentOptions } = wrapper.vm.students
            await refetchPaymentOptions()
            
            expect(canUseInPersonPayment.value).toBe(true)
        })

        it('should extract cardPaymentOnBehalfEnabled from payment options', async () => {
            wrapper = createWrapper()
            
            const { cardPaymentOnBehalfEnabled } = wrapper.vm.students
            
            // Initially false/undefined
            expect(cardPaymentOnBehalfEnabled.value).toBe(false)
            
            // Mock payment options data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    canUseInPersonPayment: false,
                    cardPaymentOnBehalfEnabled: true
                })
            })
            
            const { refetchPaymentOptions } = wrapper.vm.students
            await refetchPaymentOptions()
            
            expect(cardPaymentOnBehalfEnabled.value).toBe(true)
        })

        it('should default to false when payment options are missing', async () => {
            wrapper = createWrapper()
            
            const { canUseInPersonPayment, cardPaymentOnBehalfEnabled } = wrapper.vm.students
            
            // Mock empty payment options data
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            })
            
            const { refetchPaymentOptions } = wrapper.vm.students
            await refetchPaymentOptions()
            
            expect(canUseInPersonPayment.value).toBe(false)
            expect(cardPaymentOnBehalfEnabled.value).toBe(false)
        })
    })

    describe('Refetch and Invalidation', () => {
        it('should provide refetch methods', () => {
            wrapper = createWrapper()
            
            const { refetchStudents, refetchPaymentOptions } = wrapper.vm.students
            
            expect(typeof refetchStudents).toBe('function')
            expect(typeof refetchPaymentOptions).toBe('function')
        })

        it('should provide invalidation methods', () => {
            wrapper = createWrapper()
            
            const { invalidateStudents, invalidatePaymentOptions } = wrapper.vm.students
            
            expect(typeof invalidateStudents).toBe('function')
            expect(typeof invalidatePaymentOptions).toBe('function')
        })

        it('should invalidate students cache when called', () => {
            wrapper = createWrapper()
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidateStudents } = wrapper.vm.students
            invalidateStudents()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const studentsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'students'
            )
            expect(studentsCall).toBeDefined()
        })

        it('should invalidate payment options cache when called', () => {
            wrapper = createWrapper()
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidatePaymentOptions } = wrapper.vm.students
            invalidatePaymentOptions()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const paymentOptionsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'users' &&
                call[0].queryKey[1] === 'me' &&
                call[0].queryKey[2] === 'paymentOptions'
            )
            expect(paymentOptionsCall).toBeDefined()
        })
    })

    describe('Loading and Error States', () => {
        it('should aggregate loading states', () => {
            wrapper = createWrapper()
            
            const { loading, isLoadingStudents, isLoadingPaymentOptions } = wrapper.vm.students
            
            expect(loading).toBeDefined()
            expect(isLoadingStudents).toBeDefined()
            expect(isLoadingPaymentOptions).toBeDefined()
        })

        it('should aggregate error states', () => {
            wrapper = createWrapper()
            
            const { error, studentsError, paymentOptionsError } = wrapper.vm.students
            
            expect(error).toBeDefined()
            expect(studentsError).toBeDefined()
            expect(paymentOptionsError).toBeDefined()
        })
    })
})
