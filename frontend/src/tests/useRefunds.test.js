import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useRefunds } from '../composables/useRefunds'
import { useUserStore } from '../stores/userStore'
import axios from 'axios'

// Mock axios
vi.mock('axios')

// Create a test component that uses the composable
const TestComponent = defineComponent({
    props: ['bookingId'],
    setup(props) {
        const refunds = useRefunds(props.bookingId)
        return { refunds }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useRefunds Composable', () => {
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

    describe('Refund Info Query', () => {
        it('should provide refund info query state', () => {
            wrapper = createWrapper({ bookingId: 1 })
            
            const { refundInfo, isLoadingRefundInfo, refundInfoError } = wrapper.vm.refunds
            
            expect(refundInfo).toBeDefined()
            expect(isLoadingRefundInfo).toBeDefined()
            expect(refundInfoError).toBeDefined()
        })

        it('should construct correct query key', () => {
            wrapper = createWrapper({ bookingId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const refundQuery = queries.find(q => 
                q.queryKey[0] === 'refunds' && 
                q.queryKey[2] === 'info'
            )
            
            expect(refundQuery).toBeDefined()
            expect(refundQuery.queryKey).toEqual(['refunds', 1, 'info'])
        })

        it('should use 1-minute staleTime for financial data', () => {
            wrapper = createWrapper({ bookingId: 1 })
            
            const queries = queryClient.getQueryCache().getAll()
            const refundQuery = queries.find(q => 
                q.queryKey[0] === 'refunds' &&
                q.queryKey[2] === 'info'
            )
            
            expect(refundQuery).toBeDefined()
            expect(refundQuery.options.staleTime).toBe(1 * 60 * 1000)
        })

        it('should not run query when bookingId is missing', () => {
            wrapper = createWrapper({ bookingId: null })
            
            const queries = queryClient.getQueryCache().getAll()
            const refundQuery = queries.find(q => 
                q.queryKey[0] === 'refunds' &&
                q.queryKey[2] === 'info'
            )
            
            expect(refundQuery).toBeDefined()
            expect(refundQuery.state.status).toBe('pending')
        })
    })

    describe('Process Refund Mutation', () => {
        beforeEach(() => {
            wrapper = createWrapper({ bookingId: 1 })
        })

        it('should expose processRefund mutation', () => {
            const { processRefund, isProcessingRefund } = wrapper.vm.refunds
            
            expect(typeof processRefund).toBe('function')
            expect(isProcessingRefund).toBeDefined()
        })

        it('should process refund and invalidate caches', async () => {
            const { processRefund } = wrapper.vm.refunds
            
            const refundData = {
                bookingId: 1,
                refundType: 'full',
                reason: 'Test refund',
                studentId: 'student-123'
            }
            
            // Mock successful refund
            axios.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    refund: {
                        id: 10,
                        amount: 50
                    }
                }
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const result = await processRefund(refundData)
            
            expect(result.success).toBe(true)
            expect(axios.post).toHaveBeenCalledWith(
                '/api/admin/refunds',
                expect.objectContaining({
                    bookingId: 1,
                    refundType: 'full',
                    reason: 'Test refund'
                }),
                expect.any(Object)
            )
            
            // Should invalidate bookings and credits
            const invalidateCalls = invalidateSpy.mock.calls
            expect(invalidateCalls.some(call => 
                call[0].queryKey[0] === 'users' &&
                call[0].queryKey[1] === 'student-123' &&
                call[0].queryKey[2] === 'bookings'
            )).toBe(true)
            expect(invalidateCalls.some(call => 
                call[0].queryKey[0] === 'credits' &&
                call[0].queryKey[1] === 'student-123'
            )).toBe(true)
        })

        it('should handle refund errors', async () => {
            const { processRefund } = wrapper.vm.refunds
            
            // Mock failed refund
            axios.post.mockResolvedValueOnce({
                data: {
                    success: false,
                    error: 'Refund already processed'
                }
            })
            
            await expect(
                processRefund({
                    bookingId: 1,
                    refundType: 'full'
                })
            ).rejects.toThrow('Refund already processed')
        })
    })

    describe('Methods', () => {
        it('should provide refetch method', () => {
            wrapper = createWrapper({ bookingId: 1 })
            
            const { refetchRefundInfo } = wrapper.vm.refunds
            
            expect(typeof refetchRefundInfo).toBe('function')
        })
    })
})
