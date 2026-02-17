import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useCalendarSettings } from '../composables/useCalendarSettings'
import { useUserStore } from '../stores/userStore'

global.fetch = vi.fn()

const TestComponent = defineComponent({
    setup() {
        const calendarSettings = useCalendarSettings()
        return { calendarSettings }
    },
    render() {
        return h('div', 'Test')
    }
})

describe('useCalendarSettings Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)

        userStore = useUserStore()
        userStore.user = { id: 1, name: 'Admin', role: 'admin' }
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

    const createWrapper = () => {
        return mount(TestComponent, {
            global: {
                plugins: [pinia, [VueQueryPlugin, { queryClient }]]
            }
        })
    }

    describe('Calendar Method Query', () => {
        it('should provide calendar method query state', () => {
            wrapper = createWrapper()

            const { calendarMethod, isLoadingMethod, methodError } = wrapper.vm.calendarSettings

            expect(calendarMethod).toBeDefined()
            expect(isLoadingMethod).toBeDefined()
            expect(methodError).toBeDefined()
        })

        it('should create calendarMethod query for admin users', () => {
            wrapper = createWrapper()

            const queries = queryClient.getQueryCache().getAll()
            const methodQuery = queries.find(q => q.queryKey[0] === 'calendarMethod')

            expect(methodQuery).toBeDefined()
        })

        it('should not create calendarMethod query for non-admin users', () => {
            userStore.user = { id: 2, name: 'Student', role: 'student' }
            wrapper = createWrapper()

            const queries = queryClient.getQueryCache().getAll()
            const methodQuery = queries.find(q =>
                q.queryKey[0] === 'calendarMethod' &&
                q.state.fetchStatus === 'fetching'
            )

            expect(methodQuery).toBeUndefined()
        })
    })

    describe('Service Account Query', () => {
        it('should provide service account query state', () => {
            wrapper = createWrapper()

            const { serviceAccountConfig, isLoadingServiceAccount, serviceAccountError } = wrapper.vm.calendarSettings

            expect(serviceAccountConfig).toBeDefined()
            expect(isLoadingServiceAccount).toBeDefined()
            expect(serviceAccountError).toBeDefined()
        })
    })

    describe('Connected Instructors Query', () => {
        it('should provide connected instructors query state', () => {
            wrapper = createWrapper()

            const { connectedInstructors, isLoadingInstructors, instructorsError } = wrapper.vm.calendarSettings

            expect(connectedInstructors).toBeDefined()
            expect(isLoadingInstructors).toBeDefined()
            expect(instructorsError).toBeDefined()
        })
    })

    describe('Mutations', () => {
        it('should provide setCalendarMethod mutation', () => {
            wrapper = createWrapper()

            const { setCalendarMethod, isSettingMethod } = wrapper.vm.calendarSettings

            expect(setCalendarMethod).toBeDefined()
            expect(typeof setCalendarMethod).toBe('function')
            expect(isSettingMethod).toBeDefined()
        })

        it('should provide saveServiceAccount mutation', () => {
            wrapper = createWrapper()

            const { saveServiceAccount, isSavingServiceAccount } = wrapper.vm.calendarSettings

            expect(saveServiceAccount).toBeDefined()
            expect(typeof saveServiceAccount).toBe('function')
            expect(isSavingServiceAccount).toBeDefined()
        })

        it('should provide deleteServiceAccount mutation', () => {
            wrapper = createWrapper()

            const { deleteServiceAccount, isDeletingServiceAccount } = wrapper.vm.calendarSettings

            expect(deleteServiceAccount).toBeDefined()
            expect(typeof deleteServiceAccount).toBe('function')
            expect(isDeletingServiceAccount).toBeDefined()
        })
    })

    describe('Fetch Functions', () => {
        it('should provide refetch methods', () => {
            wrapper = createWrapper()

            const { refetchMethod, refetchServiceAccount, refetchInstructors } = wrapper.vm.calendarSettings

            expect(typeof refetchMethod).toBe('function')
            expect(typeof refetchServiceAccount).toBe('function')
            expect(typeof refetchInstructors).toBe('function')
        })

        it('should call correct URL for setCalendarMethod mutation', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, method: 'oauth' })
            })

            wrapper = createWrapper()

            await wrapper.vm.calendarSettings.setCalendarMethod('oauth')

            const postCall = global.fetch.mock.calls.find(
                call => call[1]?.method === 'POST'
            )

            expect(postCall).toBeDefined()
            expect(postCall[0]).toBe('/api/admin/settings/calendar/method')
            expect(JSON.parse(postCall[1].body)).toEqual({ method: 'oauth' })
        })
    })
})
