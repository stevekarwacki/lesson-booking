import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useInstructor } from '../composables/useInstructor'
import { useUserStore } from '../stores/userStore'

// Mock fetch globally
global.fetch = vi.fn()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockInstructor = {
    id: 1,
    user_id: 100,
    bio: 'I teach guitar',
    specialties: 'Guitar',
    hourly_rate: '75.50',
    is_active: true,
    name: 'Test Instructor',
    email: 'instructor@test.com'
}

function mockOk(body) {
    return { ok: true, json: async () => body }
}

function mockError(status, body) {
    return { ok: false, status, json: async () => body }
}

// Generic test component wrapper
function makeTestComponent(options) {
    return defineComponent({
        props: Object.keys(options ?? {}),
        setup(props) {
            const result = useInstructor(props)
            return { result }
        },
        render() { return h('div', 'Test') }
    })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

describe('useInstructor Composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)

        userStore = useUserStore()
        userStore.user = { id: 100, name: 'Test User', role: 'instructor' }
        userStore.token = 'test-token'
        userStore.isAuthenticated = true

        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        })

        vi.clearAllMocks()
    })

    afterEach(() => {
        wrapper?.unmount()
        queryClient.clear()
    })

    const mount_ = (Component, props = {}) =>
        mount(Component, {
            props,
            global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] }
        })

    // -----------------------------------------------------------------------
    // Admin mode — by instructorId (legacy behaviour)
    // -----------------------------------------------------------------------
    describe('admin mode — instructorId', () => {
        const Comp = defineComponent({
            props: ['instructorId'],
            setup(props) {
                return { result: useInstructor({ instructorId: props.instructorId }) }
            },
            render() { return h('div') }
        })

        it('uses query key ["instructors", id]', () => {
            wrapper = mount_(Comp, { instructorId: 1 })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructors')
            expect(q?.queryKey).toEqual(['instructors', 1])
        })

        it('uses 5-minute staleTime', () => {
            wrapper = mount_(Comp, { instructorId: 1 })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructors')
            expect(q?.options.staleTime).toBe(5 * 60 * 1000)
        })

        it('does not run query when instructorId is null', () => {
            wrapper = mount_(Comp, { instructorId: null })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructor')
            expect(q?.state.status).toBe('pending')
        })

        it('does not run query when token is missing', () => {
            userStore.token = null
            wrapper = mount_(Comp, { instructorId: 1 })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructors')
            expect(q?.state.status).toBe('pending')
        })

        it('null instructorId uses ["instructor", "unknown"] key', () => {
            wrapper = mount_(Comp, { instructorId: null })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructor')
            expect(q?.queryKey).toEqual(['instructor', 'unknown'])
        })
    })

    // -----------------------------------------------------------------------
    // Admin mode — by userId
    // -----------------------------------------------------------------------
    describe('admin mode — userId', () => {
        const Comp = defineComponent({
            props: ['userId'],
            setup(props) {
                return { result: useInstructor({ mode: 'admin', userId: props.userId }) }
            },
            render() { return h('div') }
        })

        it('uses query key ["instructor", "user", id]', () => {
            wrapper = mount_(Comp, { userId: 100 })
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructor')
            expect(q?.queryKey).toEqual(['instructor', 'user', 100])
        })
    })

    // -----------------------------------------------------------------------
    // Self mode
    // -----------------------------------------------------------------------
    describe('self mode', () => {
        const Comp = defineComponent({
            setup() {
                return { result: useInstructor({ mode: 'self' }) }
            },
            render() { return h('div') }
        })

        it('uses query key ["instructor", "self"]', () => {
            wrapper = mount_(Comp)
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructor')
            expect(q?.queryKey).toEqual(['instructor', 'self'])
        })

        it('is enabled even without an id param', () => {
            wrapper = mount_(Comp)
            const q = queryClient.getQueryCache().getAll()
                .find(q => q.queryKey[0] === 'instructor')
            expect(q).toBeDefined()
        })
    })

    // -----------------------------------------------------------------------
    // Hourly rate computed
    // -----------------------------------------------------------------------
    describe('hourlyRate computed', () => {
        const Comp = defineComponent({
            props: ['instructorId'],
            setup(props) {
                return { result: useInstructor({ instructorId: props.instructorId }) }
            },
            render() { return h('div') }
        })

        it('parses hourly_rate string to float', async () => {
            wrapper = mount_(Comp, { instructorId: 1 })
            fetch.mockResolvedValueOnce(mockOk({ ...mockInstructor, hourly_rate: '75.50' }))
            await wrapper.vm.result.refetchInstructor()
            expect(wrapper.vm.result.hourlyRate.value).toBe(75.50)
        })

        it('returns null when hourly_rate is absent', async () => {
            wrapper = mount_(Comp, { instructorId: 1 })
            fetch.mockResolvedValueOnce(mockOk({ id: 1, name: 'Instructor' }))
            await wrapper.vm.result.refetchInstructor()
            expect(wrapper.vm.result.hourlyRate.value).toBeNull()
        })
    })

    // -----------------------------------------------------------------------
    // Mutations — updateInstructor
    // -----------------------------------------------------------------------
    describe('updateInstructor mutation', () => {
        const Comp = defineComponent({
            setup() {
                return { result: useInstructor({ mode: 'self' }) }
            },
            render() { return h('div') }
        })

        it('resolves without error when instructor id is available', async () => {
            // Prime the cache with a known instructor so id is available
            wrapper = mount_(Comp)
            fetch.mockResolvedValueOnce(mockOk(mockInstructor))
            await wrapper.vm.result.refetchInstructor()

            fetch.mockResolvedValueOnce(mockOk({ message: 'updated' }))
            await expect(
                wrapper.vm.result.updateInstructor({ bio: 'Updated', specialties: 'Piano', hourly_rate: '80' })
            ).resolves.not.toThrow()
        })

        it('throws when instructor id is not yet available', () => {
            // No fetch mock — query stays pending, instructor.value is undefined
            wrapper = mount_(Comp)
            expect(() =>
                wrapper.vm.result.updateInstructor({ bio: 'x' })
            ).toThrow('Instructor id is not yet available')
        })

        it('accepts explicit { id, data } form without throwing', async () => {
            fetch.mockResolvedValueOnce(mockOk({ message: 'updated' }))
            wrapper = mount_(Comp)
            await expect(
                wrapper.vm.result.updateInstructor({ id: 5, data: { bio: 'x' } })
            ).resolves.not.toThrow()
        })
    })

    // -----------------------------------------------------------------------
    // Mutations — createInstructor
    // -----------------------------------------------------------------------
    describe('createInstructor mutation', () => {
        const Comp = defineComponent({
            setup() {
                return { result: useInstructor({ mode: 'admin', userId: 100 }) }
            },
            render() { return h('div') }
        })

        it('resolves without error', async () => {
            fetch.mockResolvedValueOnce(mockOk({ message: 'created' }))
            wrapper = mount_(Comp)
            await expect(
                wrapper.vm.result.createInstructor({ user_id: 100, bio: 'New', specialties: 'Piano', hourly_rate: '60' })
            ).resolves.not.toThrow()
        })
    })

    // -----------------------------------------------------------------------
    // Invalidation
    // -----------------------------------------------------------------------
    describe('invalidateInstructor', () => {
        const Comp = defineComponent({
            props: ['instructorId'],
            setup(props) {
                return { result: useInstructor({ instructorId: props.instructorId }) }
            },
            render() { return h('div') }
        })

        it('invalidates the instructors query key', () => {
            wrapper = mount_(Comp, { instructorId: 1 })
            const spy = vi.spyOn(queryClient, 'invalidateQueries')
            wrapper.vm.result.invalidateInstructor()
            const calls = spy.mock.calls.map(c => c[0].queryKey[0])
            expect(calls).toContain('instructors')
        })
    })
})
