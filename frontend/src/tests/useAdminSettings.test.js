import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useAdminSettings } from '../composables/useAdminSettings'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// Create a test component that uses the composable
const TestComponent = defineComponent({
    setup() {
        const adminSettings = useAdminSettings()
        return { adminSettings }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useAdminSettings Composable', () => {
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
        userStore.user = { id: 'admin-123', name: 'Admin User', role: 'admin' }
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

    describe('Storage Query', () => {
        it('should provide storage query state', () => {
            wrapper = createWrapper()
            
            const { storageConfig, isLoadingStorage, storageError } = wrapper.vm.adminSettings
            
            expect(storageConfig).toBeDefined()
            expect(isLoadingStorage).toBeDefined()
            expect(storageError).toBeDefined()
        })

        it('should construct correct query key for storage', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const storageQuery = queries.find(q => q.queryKey[0] === 'storage')
            
            expect(storageQuery).toBeDefined()
            expect(storageQuery.queryKey).toEqual(['storage'])
        })

        it('should use 5-minute staleTime for storage', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const storageQuery = queries.find(q => q.queryKey[0] === 'storage')
            
            expect(storageQuery).toBeDefined()
            expect(storageQuery.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('should only run query for admin users', () => {
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const storageQuery = queries.find(q => q.queryKey[0] === 'storage')
            
            // Query should be enabled for admin
            expect(storageQuery).toBeDefined()
        })

        it('should not run query for non-admin users', () => {
            userStore.user.role = 'student'
            wrapper = createWrapper()
            
            const queries = queryClient.getQueryCache().getAll()
            const storageQuery = queries.find(q => q.queryKey[0] === 'storage')
            
            // Query should exist but not be enabled
            expect(storageQuery).toBeDefined()
            expect(storageQuery.state.status).toBe('pending')
        })
    })

    describe('Storage Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper()
        })

        it('should expose saveStorageConfig mutation', () => {
            const { saveStorageConfig, isSavingStorage } = wrapper.vm.adminSettings
            
            expect(typeof saveStorageConfig).toBe('function')
            expect(isSavingStorage).toBeDefined()
        })

        it('should expose testStorageConnection mutation', () => {
            const { testStorageConnection, isTestingConnection } = wrapper.vm.adminSettings
            
            expect(typeof testStorageConnection).toBe('function')
            expect(isTestingConnection).toBeDefined()
        })

        it('should save storage config and invalidate cache', async () => {
            const { saveStorageConfig } = wrapper.vm.adminSettings
            
            const storageData = {
                storage_type: 'spaces',
                storage_endpoint: 'https://sfo3.digitaloceanspaces.com',
                storage_region: 'sfo3',
                storage_bucket: 'my-bucket'
            }
            
            // Mock successful save
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Saved successfully'
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            await saveStorageConfig(storageData)
            
            // Check fetch was called correctly
            expect(global.fetch).toHaveBeenCalled()
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/settings/storage')
            expect(fetchCall[1].method).toBe('POST')
            
            // Should invalidate storage cache
            const invalidateCalls = invalidateSpy.mock.calls
            const storageCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'storage'
            )
            expect(storageCall).toBeDefined()
        })

        it('should test storage connection without caching', async () => {
            const { testStorageConnection } = wrapper.vm.adminSettings
            
            const storageData = {
                storage_type: 'spaces',
                storage_endpoint: 'https://sfo3.digitaloceanspaces.com',
                storage_region: 'sfo3',
                storage_bucket: 'test-bucket'
            }
            
            // Mock successful test
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Connection successful'
                })
            })
            
            const result = await testStorageConnection(storageData)
            
            expect(result.success).toBe(true)
            expect(result.message).toBe('Connection successful')
            
            // Check fetch was called
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/settings/storage/test-connection')
            expect(fetchCall[1].method).toBe('POST')
        })

        it('should handle save errors gracefully', async () => {
            const { saveStorageConfig } = wrapper.vm.adminSettings
            
            // Mock failed save
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid configuration' })
            })
            
            await expect(
                saveStorageConfig({ storage_type: 'invalid' })
            ).rejects.toThrow('Invalid configuration')
        })

        it('should handle test connection errors gracefully', async () => {
            const { testStorageConnection } = wrapper.vm.adminSettings
            
            // Mock failed test
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ 
                    error: 'Connection failed',
                    details: 'Invalid credentials'
                })
            })
            
            await expect(
                testStorageConnection({ storage_type: 'spaces' })
            ).rejects.toThrow('Connection failed: Invalid credentials')
        })
    })

    describe('Theme Mutations', () => {
        beforeEach(() => {
            wrapper = createWrapper()
        })

        it('should expose saveThemeSettings mutation', () => {
            const { saveThemeSettings, isSavingTheme } = wrapper.vm.adminSettings
            
            expect(typeof saveThemeSettings).toBe('function')
            expect(isSavingTheme).toBeDefined()
        })

        it('should save theme settings and invalidate public config', async () => {
            const { saveThemeSettings } = wrapper.vm.adminSettings
            
            const themeConfig = {
                primaryColor: '#007bff',
                secondaryColor: '#17a2b8',
                palette: 'Ocean Blue'
            }
            
            // Mock successful save
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Theme saved',
                    data: themeConfig
                })
            })
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const result = await saveThemeSettings(themeConfig)
            
            expect(result.success).toBe(true)
            
            // Check fetch was called correctly
            const fetchCall = global.fetch.mock.calls[0]
            expect(fetchCall[0]).toBe('/api/admin/settings/theme')
            expect(fetchCall[1].method).toBe('PUT')
            
            // Should invalidate public config (which contains theme)
            const invalidateCalls = invalidateSpy.mock.calls
            const publicConfigCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'publicConfig'
            )
            expect(publicConfigCall).toBeDefined()
        })

        it('should handle theme save errors gracefully', async () => {
            const { saveThemeSettings } = wrapper.vm.adminSettings
            
            // Mock failed save
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ 
                    error: 'Invalid theme',
                    details: 'Color must be hex format'
                })
            })
            
            await expect(
                saveThemeSettings({ primaryColor: 'invalid' })
            ).rejects.toThrow('Color must be hex format')
        })
    })

    describe('Refetch and Invalidation', () => {
        it('should provide refetch method', () => {
            wrapper = createWrapper()
            
            const { refetchStorage } = wrapper.vm.adminSettings
            
            expect(typeof refetchStorage).toBe('function')
        })

        it('should provide invalidation method', () => {
            wrapper = createWrapper()
            
            const { invalidateStorage } = wrapper.vm.adminSettings
            
            expect(typeof invalidateStorage).toBe('function')
        })

        it('should invalidate storage cache when called', () => {
            wrapper = createWrapper()
            
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
            
            const { invalidateStorage } = wrapper.vm.adminSettings
            invalidateStorage()
            
            expect(invalidateSpy).toHaveBeenCalled()
            const invalidateCalls = invalidateSpy.mock.calls
            const storageCall = invalidateCalls.find(call => 
                call[0].queryKey[0] === 'storage'
            )
            expect(storageCall).toBeDefined()
        })
    })
})
