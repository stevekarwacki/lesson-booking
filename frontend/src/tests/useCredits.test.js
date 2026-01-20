import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useCredits } from '../composables/useCredits'
import { useUserStore } from '../stores/userStore'

// Create a test component that uses the composable
const TestComponent = defineComponent({
    props: ['userId'],
    setup(props) {
        const credits = useCredits(props.userId)
        return { credits }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useCredits Composable', () => {
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

    it('should provide credits query state', () => {
        wrapper = createWrapper()
        
        const { userCredits, creditBreakdown, loading, error } = wrapper.vm.credits
        
        expect(userCredits).toBeDefined()
        expect(creditBreakdown).toBeDefined()
        expect(loading).toBeDefined()
        expect(error).toBeDefined()
    })

    it('should provide transactions query state', () => {
        wrapper = createWrapper()
        
        const { transactions, isLoadingTransactions } = wrapper.vm.credits
        
        expect(transactions).toBeDefined()
        expect(isLoadingTransactions).toBeDefined()
    })

    it('should construct correct query keys for credits', () => {
        wrapper = createWrapper()
        
        // Query keys should follow hierarchical pattern
        const queries = queryClient.getQueryCache().getAll()
        
        // Check for credits query
        const creditsQuery = queries.find(q => 
            q.queryKey[0] === 'credits' &&
            q.queryKey.length === 2
        )
        expect(creditsQuery).toBeDefined()
        
        // Check for transactions query
        const transactionsQuery = queries.find(q => 
            q.queryKey[0] === 'credits' &&
            q.queryKey[2] === 'history'
        )
        expect(transactionsQuery).toBeDefined()
    })

    it('should not run queries when token is missing', () => {
        userStore.token = null
        
        wrapper = createWrapper()
        
        const { isLoadingCredits, isLoadingTransactions } = wrapper.vm.credits
        
        // Queries should be disabled, so loading should be false
        expect(isLoadingCredits.value).toBe(false)
        expect(isLoadingTransactions.value).toBe(false)
    })

    it('should support custom userId parameter', () => {
        wrapper = createWrapper({ userId: 'student-456' })
        
        const queries = queryClient.getQueryCache().getAll()
        
        // Query should exist
        expect(queries.length).toBeGreaterThan(0)
    })

    it('should provide getAvailableCredits computed function', () => {
        wrapper = createWrapper()
        
        const { getAvailableCredits } = wrapper.vm.credits
        
        expect(getAvailableCredits).toBeDefined()
        expect(typeof getAvailableCredits.value).toBe('function')
        
        // Should return 0 for no credits (default)
        expect(getAvailableCredits.value(30)).toBe(0)
        expect(getAvailableCredits.value(60)).toBe(0)
    })

    it('should provide refetch methods', () => {
        wrapper = createWrapper()
        
        const { fetchCredits, refreshCredits, refetchTransactions } = wrapper.vm.credits
        
        expect(fetchCredits).toBeDefined()
        expect(typeof fetchCredits).toBe('function')
        expect(refreshCredits).toBeDefined()
        expect(typeof refreshCredits).toBe('function')
        expect(refetchTransactions).toBeDefined()
        expect(typeof refetchTransactions).toBe('function')
    })

    it('should provide invalidateCredits method', () => {
        wrapper = createWrapper()
        
        const { invalidateCredits } = wrapper.vm.credits
        
        expect(invalidateCredits).toBeDefined()
        expect(typeof invalidateCredits).toBe('function')
    })

    it('should use 1-minute staleTime for financial data', () => {
        wrapper = createWrapper()
        
        const queries = queryClient.getQueryCache().getAll()
        const creditsQuery = queries.find(q => 
            q.queryKey[0] === 'credits' &&
            q.queryKey.length === 2
        )
        
        // Check staleTime is set to 1 minute (60000ms)
        expect(creditsQuery.options.staleTime).toBe(60000)
    })

    it('should compute creditBreakdown with default structure', () => {
        wrapper = createWrapper()
        
        const { creditBreakdown } = wrapper.vm.credits
        
        // Should have default structure even without data
        expect(creditBreakdown.value).toHaveProperty('30')
        expect(creditBreakdown.value).toHaveProperty('60')
        expect(creditBreakdown.value[30]).toEqual({ credits: 0, next_expiry: null })
        expect(creditBreakdown.value[60]).toEqual({ credits: 0, next_expiry: null })
    })

    it('should compute userCredits with default value', () => {
        wrapper = createWrapper()
        
        const { userCredits } = wrapper.vm.credits
        
        // Should default to 0 when no data
        expect(userCredits.value).toBe(0)
    })

    it('should compute nextExpiry with default value', () => {
        wrapper = createWrapper()
        
        const { nextExpiry } = wrapper.vm.credits
        
        // Should default to null when no data
        expect(nextExpiry.value).toBeNull()
    })
})
