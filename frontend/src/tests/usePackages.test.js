import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { usePackages } from '../composables/usePackages'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    setup() {
        const packages = usePackages()
        return { packages }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('usePackages Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)
        
        userStore = useUserStore()
        userStore.user = { id: 'admin-123', name: 'Admin User', role: 'admin' }
        userStore.token = 'admin-token'
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

    const createWrapper = () => {
        return mount(TestComponent, {
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Packages Query', () => {
        it('should provide packages query state', () => {
            wrapper = createWrapper()
            
            const { packages, isLoadingPackages, packagesError } = wrapper.vm.packages
            
            expect(packages).toBeDefined()
            expect(isLoadingPackages).toBeDefined()
            expect(packagesError).toBeDefined()
        })

        it('should construct correct query key', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const packagesQuery = queries.find(q => q.queryKey[0] === 'packages')
            
            expect(packagesQuery).toBeDefined()
            expect(packagesQuery.queryKey).toEqual(['packages'])
        })

        it('should use 5-minute staleTime', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const packagesQuery = queries.find(q => q.queryKey[0] === 'packages')
            
            expect(packagesQuery).toBeDefined()
            expect(packagesQuery.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('should only run query for admin users', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const packagesQuery = queries.find(q => q.queryKey[0] === 'packages')
            
            expect(packagesQuery).toBeDefined()
        })

        it('should not run query for non-admin users', () => {
            userStore.user.role = 'student'
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const packagesQuery = queries.find(q => q.queryKey[0] === 'packages')
            
            expect(packagesQuery).toBeDefined()
            expect(packagesQuery.state.status).toBe('pending')
        })
    })

    describe('Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper()
        })

        it('should expose create mutation', () => {
            const { createPackage, isCreatingPackage } = wrapper.vm.packages
            
            expect(typeof createPackage).toBe('function')
            expect(isCreatingPackage).toBeDefined()
        })

        it('should expose update mutation', () => {
            const { updatePackage, isUpdatingPackage } = wrapper.vm.packages
            
            expect(typeof updatePackage).toBe('function')
            expect(isUpdatingPackage).toBeDefined()
        })

        it('should expose delete mutation', () => {
            const { deletePackage, isDeletingPackage } = wrapper.vm.packages
            
            expect(typeof deletePackage).toBe('function')
            expect(isDeletingPackage).toBeDefined()
        })

        it('should create package and invalidate caches', async () => {
            const { createPackage } = wrapper.vm.packages
            
            const packageData = {
                name: 'Test Package',
                price: 100,
                credits: 10,
                type: 'one-time',
                lesson_duration_minutes: 30
            }
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 1, ...packageData })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await createPackage(packageData)
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/packages')
            expect(fetchCall[1].method).toBe('POST')
            
            // Should invalidate both packages and paymentPlans
            const invalidateCalls = invalidateSpy.mock.calls
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'packages')).toBe(true)
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'paymentPlans')).toBe(true)
        })

        it('should update package and invalidate caches', async () => {
            const { updatePackage } = wrapper.vm.packages
            
            const packageData = {
                name: 'Updated Package',
                price: 150,
                credits: 15
            }
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 1, ...packageData })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await updatePackage({
                packageId: 1,
                packageData
            })
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/packages/1')
            expect(fetchCall[1].method).toBe('PUT')
            
            // Should invalidate both packages and paymentPlans
            const invalidateCalls = invalidateSpy.mock.calls
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'packages')).toBe(true)
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'paymentPlans')).toBe(true)
        })

        it('should delete package and invalidate caches', async () => {
            const { deletePackage } = wrapper.vm.packages
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await deletePackage(1)
            
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/packages/1')
            expect(fetchCall[1].method).toBe('DELETE')
            
            // Should invalidate both packages and paymentPlans
            const invalidateCalls = invalidateSpy.mock.calls
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'packages')).toBe(true)
            expect(invalidateCalls.some(call => call[0].queryKey[0] === 'paymentPlans')).toBe(true)
        })

        it('should handle create errors', async () => {
            const { createPackage } = wrapper.vm.packages
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid data' })
            })
            
            await expect(
                createPackage({})
            ).rejects.toThrow('Invalid data')
        })

        it('should handle update errors', async () => {
            const { updatePackage } = wrapper.vm.packages
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Package not found' })
            })
            
            await expect(
                updatePackage({ packageId: 999, packageData: {} })
            ).rejects.toThrow('Package not found')
        })

        it('should handle delete errors', async () => {
            const { deletePackage } = wrapper.vm.packages
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Package not found' })
            })
            
            await expect(
                deletePackage(999)
            ).rejects.toThrow('Package not found')
        })
    })

    describe('Methods', () => {
        it('should provide refetch method', () => {
            wrapper = createWrapper()
            
            const { refetchPackages } = wrapper.vm.packages
            
            expect(typeof refetchPackages).toBe('function')
        })

        it('should provide invalidation method', () => {
            wrapper = createWrapper()
            
            const { invalidatePackages } = wrapper.vm.packages
            
            expect(typeof invalidatePackages).toBe('function')
        })

        it('should invalidate packages cache when called', () => {
            wrapper = createWrapper()
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidatePackages } = wrapper.vm.packages
            invalidatePackages()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const packagesCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'packages'
            )
            expect(packagesCall).toBeDefined()
        })
    })
})
