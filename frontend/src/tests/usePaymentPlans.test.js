import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { usePaymentPlans } from '../composables/usePaymentPlans'
import { useUserStore } from '../stores/userStore'

// Create a test component that uses the composable
const TestComponent = defineComponent({
    props: ['userId'],
    setup(props) {
        const plans = usePaymentPlans(props.userId)
        return { plans }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('usePaymentPlans Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        // Setup Pinia
        pinia = createPinia()
        setActivePinia(pinia)
        
        // Setup user store
        userStore = useUserStore()
        userStore.token = 'test-token'
        userStore.user = { id: 'user-123', name: 'Test User', role: 'student' }
        
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

    describe('Payment Plans Query', () => {
        it('should provide payment plans query state', () => {
            wrapper = createWrapper()
            
            const { paymentPlans, isLoadingPlans, plansError } = wrapper.vm.plans
            
            expect(paymentPlans).toBeDefined()
            expect(isLoadingPlans).toBeDefined()
            expect(plansError).toBeDefined()
        })

        it('should construct correct query key for payment plans', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const plansQuery = queries.find(q => q.queryKey[0] === 'paymentPlans')
            
            expect(plansQuery).toBeDefined()
        })

        it('should use 10-minute staleTime for payment plans', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const plansQuery = queries.find(q => q.queryKey[0] === 'paymentPlans')
            
            // Check staleTime is set to 10 minutes (600000ms)
            expect(plansQuery.options.staleTime).toBe(600000)
        })

        it('should provide filtered lesson plans', () => {
            wrapper = createWrapper()
            
            const { lessonPlans } = wrapper.vm.plans
            
            expect(lessonPlans).toBeDefined()
            // Should default to empty array
            expect(lessonPlans.value).toEqual([])
        })

        it('should provide filtered membership plans', () => {
            wrapper = createWrapper()
            
            const { membershipPlans } = wrapper.vm.plans
            
            expect(membershipPlans).toBeDefined()
            // Should default to empty array
            expect(membershipPlans.value).toEqual([])
        })
    })

    describe('Subscriptions Query', () => {
        it('should provide subscriptions query state', () => {
            wrapper = createWrapper()
            
            const { subscriptions, isLoadingSubscriptions, subscriptionsError } = wrapper.vm.plans
            
            expect(subscriptions).toBeDefined()
            expect(isLoadingSubscriptions).toBeDefined()
            expect(subscriptionsError).toBeDefined()
        })

        it('should construct correct query key for subscriptions', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const subsQuery = queries.find(q => 
                q.queryKey[0] === 'subscriptions' &&
                q.queryKey.length === 2
            )
            
            expect(subsQuery).toBeDefined()
        })

        it('should use 2-minute staleTime for subscriptions', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const subsQuery = queries.find(q => q.queryKey[0] === 'subscriptions')
            
            // Check staleTime is set to 2 minutes (120000ms)
            expect(subsQuery.options.staleTime).toBe(120000)
        })

        it('should provide filtered active subscriptions', () => {
            wrapper = createWrapper()
            
            const { activeSubscriptions } = wrapper.vm.plans
            
            expect(activeSubscriptions).toBeDefined()
            // Should default to empty array
            expect(activeSubscriptions.value).toEqual([])
        })

        it('should not run query when token is missing', () => {
            userStore.token = null
            
            wrapper = createWrapper()
            
            const { isLoadingSubscriptions } = wrapper.vm.plans
            
            // Query should be disabled, so loading should be false
            expect(isLoadingSubscriptions.value).toBe(false)
        })
    })

    describe('Recurring Bookings Query', () => {
        it('should provide recurring bookings query state', () => {
            wrapper = createWrapper()
            
            const { recurringBookings, isLoadingRecurringBookings, recurringBookingsError } = wrapper.vm.plans
            
            expect(recurringBookings).toBeDefined()
            expect(isLoadingRecurringBookings).toBeDefined()
            expect(recurringBookingsError).toBeDefined()
        })

        it('should construct correct query key for recurring bookings', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const bookingsQuery = queries.find(q => 
                q.queryKey[0] === 'recurringBookings' &&
                q.queryKey.length === 2
            )
            
            expect(bookingsQuery).toBeDefined()
        })

        it('should use 2-minute staleTime for recurring bookings', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const bookingsQuery = queries.find(q => q.queryKey[0] === 'recurringBookings')
            
            // Check staleTime is set to 2 minutes (120000ms)
            expect(bookingsQuery.options.staleTime).toBe(120000)
        })
    })

    describe('Helper Methods', () => {
        it('should provide getRecurringBooking helper', () => {
            wrapper = createWrapper()
            
            const { getRecurringBooking } = wrapper.vm.plans
            
            expect(getRecurringBooking).toBeDefined()
            expect(typeof getRecurringBooking).toBe('function')
            
            // Should return null when no bookings
            expect(getRecurringBooking('sub-123')).toBeNull()
        })

        it('should provide fetchCancellationPreviewData helper', () => {
            wrapper = createWrapper()
            
            const { fetchCancellationPreviewData } = wrapper.vm.plans
            
            expect(fetchCancellationPreviewData).toBeDefined()
            expect(typeof fetchCancellationPreviewData).toBe('function')
        })
    })

    describe('Refetch Methods', () => {
        it('should provide refetch methods', () => {
            wrapper = createWrapper()
            
            const { refetchPlans, refetchSubscriptions, refetchRecurringBookings } = wrapper.vm.plans
            
            expect(refetchPlans).toBeDefined()
            expect(typeof refetchPlans).toBe('function')
            expect(refetchSubscriptions).toBeDefined()
            expect(typeof refetchSubscriptions).toBe('function')
            expect(refetchRecurringBookings).toBeDefined()
            expect(typeof refetchRecurringBookings).toBe('function')
        })

        it('should provide invalidation methods', () => {
            wrapper = createWrapper()
            
            const { invalidateSubscriptions, invalidateRecurringBookings, invalidateAll } = wrapper.vm.plans
            
            expect(invalidateSubscriptions).toBeDefined()
            expect(typeof invalidateSubscriptions).toBe('function')
            expect(invalidateRecurringBookings).toBeDefined()
            expect(typeof invalidateRecurringBookings).toBe('function')
            expect(invalidateAll).toBeDefined()
            expect(typeof invalidateAll).toBe('function')
        })
    })

    describe('Loading and Error States', () => {
        it('should aggregate loading states', () => {
            wrapper = createWrapper()
            
            const { loading } = wrapper.vm.plans
            
            expect(loading).toBeDefined()
            // Should be false when all queries are idle
            expect(loading.value).toBe(false)
        })

        it('should aggregate error states', () => {
            wrapper = createWrapper()
            
            const { error } = wrapper.vm.plans
            
            expect(error).toBeDefined()
            // Should be null when no errors
            expect(error.value).toBeNull()
        })
    })

    describe('Custom User ID', () => {
        it('should support custom userId parameter', () => {
            wrapper = createWrapper({ userId: 'student-456' })
            
            const queries = queryClient.getQueryCache().getAll()
            
            // Queries should exist
            expect(queries.length).toBeGreaterThan(0)
        })

        it('should default to current user when no userId provided', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const subsQuery = queries.find(q => q.queryKey[0] === 'subscriptions')
            
            expect(subsQuery).toBeDefined()
        })
    })
})
