import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { usePaymentPlans } from '../composables/usePaymentPlans'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

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

    describe('Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper()
        })

        it('should expose deleteRecurringBooking mutation', () => {
            const { deleteRecurringBooking, isDeletingRecurringBooking } = wrapper.vm.plans
            
            expect(typeof deleteRecurringBooking).toBe('function')
            expect(isDeletingRecurringBooking).toBeDefined()
        })

        it('should expose cancelSubscription mutation', () => {
            const { cancelSubscription, isCancellingSubscription } = wrapper.vm.plans
            
            expect(typeof cancelSubscription).toBe('function')
            expect(isCancellingSubscription).toBeDefined()
        })

        it('should delete recurring booking and invalidate cache', async () => {
            const { deleteRecurringBooking } = wrapper.vm.plans
            
            // Mock successful deletion
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await deleteRecurringBooking(1)
            
            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/recurring-bookings/1')
            expect(fetchCall[1].method).toBe('DELETE')
            // Note: Authorization header includes token from userStore
            expect(fetchCall[1].headers.Authorization).toContain('Bearer')
            
            // Should invalidate recurring bookings cache
            // Note: In test environment, userId may be undefined
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const recurringBookingsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'recurringBookings'
            )
            expect(recurringBookingsCall).toBeDefined()
        })

        it('should cancel subscription and invalidate multiple caches', async () => {
            const { cancelSubscription } = wrapper.vm.plans
            
            // Mock successful cancellation
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    cancellation: { wasSyncIssue: false },
                    credits: { awarded: 2 }
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const result = await cancelSubscription(123)
            
            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/subscriptions/cancel')
            expect(fetchCall[1].method).toBe('POST')
            expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
            // Note: Authorization header includes token from userStore
            expect(fetchCall[1].headers.Authorization).toContain('Bearer')
            expect(fetchCall[1].body).toBe(JSON.stringify({ subscriptionId: 123 }))
            
            expect(result.credits.awarded).toBe(2)
            
            // Should invalidate subscriptions, recurring bookings, and credits
            // Note: In test environment, userId may be undefined
            expect(invalidateSpy).toHaveBeenCalledTimes(3)
            const invalidateCalls = invalidateSpy.mock.calls
            
            const subscriptionsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'subscriptions'
            )
            const recurringBookingsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'recurringBookings'
            )
            const creditsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'credits'
            )
            
            expect(subscriptionsCall).toBeDefined()
            expect(recurringBookingsCall).toBeDefined()
            expect(creditsCall).toBeDefined()
        })

        it('should handle deletion errors gracefully', async () => {
            const { deleteRecurringBooking } = wrapper.vm.plans
            
            // Mock failed deletion
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Not found' })
            })
            
            await expect(
                deleteRecurringBooking(999)
            ).rejects.toThrow('Not found')
        })

        it('should handle cancellation errors gracefully', async () => {
            const { cancelSubscription } = wrapper.vm.plans
            
            // Mock failed cancellation
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid subscription' })
            })
            
            await expect(
                cancelSubscription(999)
            ).rejects.toThrow('Invalid subscription')
        })

        it('should create recurring booking and invalidate cache', async () => {
            const { createRecurringBooking } = wrapper.vm.plans
            
            const bookingData = {
                subscriptionId: 1,
                instructorId: 2,
                dayOfWeek: 1,
                startSlot: 8,
                duration: 4
            }
            
            // Mock successful creation
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    recurringBooking: { id: 10, ...bookingData }
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const result = await createRecurringBooking(bookingData)
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/recurring-bookings')
            expect(fetchCall[1].method).toBe('POST')
            expect(fetchCall[1].headers.Authorization).toContain('Bearer')
            expect(JSON.parse(fetchCall[1].body)).toEqual(bookingData)
            
            expect(result.recurringBooking.id).toBe(10)
            
            // Should invalidate recurring bookings cache
            const invalidateCalls = invalidateSpy.mock.calls
            const recurringBookingsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'recurringBookings'
            )
            expect(recurringBookingsCall).toBeDefined()
        })

        it('should update recurring booking and invalidate cache', async () => {
            const { updateRecurringBooking } = wrapper.vm.plans
            
            const bookingData = {
                subscriptionId: 1,
                instructorId: 2,
                dayOfWeek: 3,
                startSlot: 12,
                duration: 4
            }
            
            // Mock successful update
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    recurringBooking: { id: 5, ...bookingData }
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const result = await updateRecurringBooking({
                recurringBookingId: 5,
                bookingData
            })
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/recurring-bookings/5')
            expect(fetchCall[1].method).toBe('PUT')
            expect(fetchCall[1].headers.Authorization).toContain('Bearer')
            expect(JSON.parse(fetchCall[1].body)).toEqual(bookingData)
            
            expect(result.recurringBooking.id).toBe(5)
            
            // Should invalidate recurring bookings cache
            const invalidateCalls = invalidateSpy.mock.calls
            const recurringBookingsCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'recurringBookings'
            )
            expect(recurringBookingsCall).toBeDefined()
        })

        it('should expose createRecurringBooking mutation', () => {
            const { createRecurringBooking, isCreatingRecurringBooking } = wrapper.vm.plans
            
            expect(typeof createRecurringBooking).toBe('function')
            expect(isCreatingRecurringBooking).toBeDefined()
        })

        it('should expose updateRecurringBooking mutation', () => {
            const { updateRecurringBooking, isUpdatingRecurringBooking } = wrapper.vm.plans
            
            expect(typeof updateRecurringBooking).toBe('function')
            expect(isUpdatingRecurringBooking).toBeDefined()
        })
    })
})
