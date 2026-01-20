import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useBranding } from '../composables/useBranding'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    setup() {
        const branding = useBranding()
        return { branding }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useBranding Composable', () => {
    let wrapper
    let queryClient

    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        
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
                plugins: [[VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Branding Query', () => {
        it('should provide branding query state', () => {
            wrapper = createWrapper()
            
            const { branding, isLoadingBranding, brandingError } = wrapper.vm.branding
            
            expect(branding).toBeDefined()
            expect(isLoadingBranding).toBeDefined()
            expect(brandingError).toBeDefined()
        })

        it('should construct correct query key', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const brandingQuery = queries.find(q => q.queryKey[0] === 'branding')
            
            expect(brandingQuery).toBeDefined()
            expect(brandingQuery.queryKey).toEqual(['branding'])
        })

        it('should use 10-minute staleTime', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const brandingQuery = queries.find(q => q.queryKey[0] === 'branding')
            
            expect(brandingQuery).toBeDefined()
            expect(brandingQuery.options.staleTime).toBe(10 * 60 * 1000)
        })
    })

    describe('Business Info Query', () => {
        it('should provide business info query state', () => {
            wrapper = createWrapper()
            
            const { businessInfo, isLoadingBusinessInfo, businessInfoError } = wrapper.vm.branding
            
            expect(businessInfo).toBeDefined()
            expect(isLoadingBusinessInfo).toBeDefined()
            expect(businessInfoError).toBeDefined()
        })

        it('should construct correct query key', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const businessInfoQuery = queries.find(q => q.queryKey[0] === 'businessInfo')
            
            expect(businessInfoQuery).toBeDefined()
            expect(businessInfoQuery.queryKey).toEqual(['businessInfo'])
        })

        it('should use 10-minute staleTime', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const businessInfoQuery = queries.find(q => q.queryKey[0] === 'businessInfo')
            
            expect(businessInfoQuery).toBeDefined()
            expect(businessInfoQuery.options.staleTime).toBe(10 * 60 * 1000)
        })
    })

    describe('Refetch Methods', () => {
        it('should provide refetch methods', () => {
            wrapper = createWrapper()
            
            const { refetchBranding, refetchBusinessInfo } = wrapper.vm.branding
            
            expect(typeof refetchBranding).toBe('function')
            expect(typeof refetchBusinessInfo).toBe('function')
        })
    })
})
