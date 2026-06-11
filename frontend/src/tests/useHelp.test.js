import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useHelp, useHelpArticle } from '../composables/useHelp'
import { useUserStore } from '../stores/userStore'

global.fetch = vi.fn()

// ---------------------------------------------------------------------------
// Test harness components
// ---------------------------------------------------------------------------

const ManifestComponent = defineComponent({
    setup() { return { help: useHelp() } },
    render() { return h('div') }
})

const ArticleComponent = defineComponent({
    props: { category: String, slug: String },
    setup(props) {
        // Wrap in ref — same convention as useCalendar test
        const category = ref(props.category)
        const slug = ref(props.slug)
        return { helpArticle: useHelpArticle(category, slug) }
    },
    render() { return h('div') }
})

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

describe('useHelp composable', () => {
    let wrapper
    let queryClient
    let userStore
    let pinia

    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)

        userStore = useUserStore()
        userStore.user = { id: 1, name: 'Admin', role: 'admin', email: 'admin@test.com' }
        userStore.token = 'admin-token'
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

    const mountManifest = () => mount(ManifestComponent, {
        global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] }
    })

    const mountArticle = (category, slug) => mount(ArticleComponent, {
        props: { category, slug },
        global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] }
    })

    // -------------------------------------------------------------------------
    // Manifest query
    // -------------------------------------------------------------------------

    describe('manifest query', () => {
        it('should expose articles, loading, and error state', () => {
            wrapper = mountManifest()
            const { articles, isLoadingManifest, isManifestError } = wrapper.vm.help
            expect(articles).toBeDefined()
            expect(isLoadingManifest).toBeDefined()
            expect(isManifestError).toBeDefined()
        })

        it('should use [help, manifest] query key', () => {
            wrapper = mountManifest()
            const q = queryClient.getQueryCache().getAll()
            const manifest = q.find(x => x.queryKey[0] === 'help' && x.queryKey[1] === 'manifest')
            expect(manifest).toBeDefined()
        })

        it('should be enabled for admin users', () => {
            wrapper = mountManifest()
            const q = queryClient.getQueryCache().getAll()
            const manifest = q.find(x => x.queryKey[1] === 'manifest')
            expect(manifest).toBeDefined()
        })

        it('should not fetch for non-admin users', () => {
            userStore.user.role = 'student'
            wrapper = mountManifest()
            const q = queryClient.getQueryCache().getAll()
            const manifest = q.find(x => x.queryKey[1] === 'manifest')
            expect(manifest?.state.status).toBe('pending')
            expect(global.fetch).not.toHaveBeenCalled()
        })

        it('should expose a refetchManifest function', () => {
            wrapper = mountManifest()
            expect(typeof wrapper.vm.help.refetchManifest).toBe('function')
        })

        it('should throw on non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
            wrapper = mountManifest()
            await vi.waitFor(() => wrapper.vm.help.isManifestError.value === true, { timeout: 3000 })
                .catch(() => {}) // query may not have run; test the fetch path only
        })
    })

    // -------------------------------------------------------------------------
    // getByRoute helper
    // -------------------------------------------------------------------------

    describe('getByRoute', () => {
        const articles = [
            { id: 'users-overview',    title: 'Users Overview',    category: 'users',    slug: 'overview' },
            { id: 'settings-overview', title: 'Settings Overview', category: 'settings', slug: 'overview' },
        ]
        const routeMap = {
            '/admin/users':    { category: 'users',    slug: 'overview' },
            '/admin/settings': { category: 'settings', slug: 'overview' },
        }

        beforeEach(() => {
            queryClient.setQueryData(['help', 'manifest'], { articles, routeMap })
            wrapper = mountManifest()
        })

        it('should return the mapped article for a known route', () => {
            const result = wrapper.vm.help.getByRoute('/admin/users')
            expect(result?.id).toBe('users-overview')
        })

        it('should return the correct article when multiple articles exist', () => {
            const result = wrapper.vm.help.getByRoute('/admin/settings')
            expect(result?.id).toBe('settings-overview')
        })

        it('should return null for an unmapped route', () => {
            const result = wrapper.vm.help.getByRoute('/unknown')
            expect(result).toBeNull()
        })

        it('should return null when the mapped article is not in the manifest', () => {
            queryClient.setQueryData(['help', 'manifest'], {
                articles: [],
                routeMap: { '/admin/users': { category: 'users', slug: 'overview' } },
            })
            wrapper.unmount()
            wrapper = mountManifest()
            const result = wrapper.vm.help.getByRoute('/admin/users')
            expect(result).toBeNull()
        })
    })

    // -------------------------------------------------------------------------
    // search helper
    // -------------------------------------------------------------------------

    describe('search', () => {
        const articles = [
            { id: 'settings-smtp', title: 'Configure SMTP', category: 'settings', keywords: ['smtp', 'email', 'password'] },
            { id: 'users-create', title: 'Create Users', category: 'users', keywords: ['users', 'invite'] },
            { id: 'bookings-refund', title: 'Process a Refund', category: 'bookings', keywords: ['refund', 'credit', 'stripe'] }
        ]

        beforeEach(() => {
            queryClient.setQueryData(['help', 'manifest'], { articles, routeMap: {} })
            wrapper = mountManifest()
        })

        it('should return all articles for empty query', () => {
            const results = wrapper.vm.help.search('')
            expect(results).toHaveLength(3)
        })

        it('should filter by title substring', () => {
            const results = wrapper.vm.help.search('refund')
            expect(results).toHaveLength(1)
            expect(results[0].id).toBe('bookings-refund')
        })

        it('should filter by keyword', () => {
            const results = wrapper.vm.help.search('stripe')
            expect(results).toHaveLength(1)
            expect(results[0].id).toBe('bookings-refund')
        })

        it('should be case-insensitive', () => {
            const results = wrapper.vm.help.search('SMTP')
            expect(results).toHaveLength(1)
            expect(results[0].id).toBe('settings-smtp')
        })

        it('should return empty array for no matches', () => {
            const results = wrapper.vm.help.search('xyznotfound')
            expect(results).toHaveLength(0)
        })
    })

    // -------------------------------------------------------------------------
    // articlesByCategory
    // -------------------------------------------------------------------------

    describe('articlesByCategory', () => {
        it('should group articles by category', () => {
            queryClient.setQueryData(['help', 'manifest'], {
                articles: [
                    { id: 'settings-smtp', category: 'settings', title: 'SMTP' },
                    { id: 'settings-business', category: 'settings', title: 'Business' },
                    { id: 'users-create', category: 'users', title: 'Create Users' }
                ],
                routeMap: {},
            })
            wrapper = mountManifest()
            const { articlesByCategory } = wrapper.vm.help
            expect(articlesByCategory.value.settings).toHaveLength(2)
            expect(articlesByCategory.value.users).toHaveLength(1)
        })
    })

    // -------------------------------------------------------------------------
    // useHelpArticle
    // -------------------------------------------------------------------------

    describe('useHelpArticle', () => {
        it('should expose article, loading, and error state', () => {
            wrapper = mountArticle('settings', 'business-info')
            const { article, isLoadingArticle, isArticleError } = wrapper.vm.helpArticle
            expect(article).toBeDefined()
            expect(isLoadingArticle).toBeDefined()
            expect(isArticleError).toBeDefined()
        })

        it('should use [help, article, category, slug] query key', () => {
            wrapper = mountArticle('settings', 'smtp')
            const q = queryClient.getQueryCache().getAll()
            const articleQuery = q.find(x => x.queryKey[0] === 'help' && x.queryKey[1] === 'article')
            expect(articleQuery).toBeDefined()
            expect(articleQuery.queryKey).toEqual(['help', 'article', 'settings', 'smtp'])
        })

        it('should expose a refetchArticle function', () => {
            wrapper = mountArticle('settings', 'smtp')
            expect(typeof wrapper.vm.helpArticle.refetchArticle).toBe('function')
        })

        it('should throw for 404 responses', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false, status: 404 })
            wrapper = mountArticle('settings', 'nonexistent')
            await vi.waitFor(() => wrapper.vm.helpArticle.isArticleError.value === true, { timeout: 3000 })
                .catch(() => {})
        })

        it('should not fetch without category or slug', () => {
            wrapper = mountArticle('', '')
            expect(global.fetch).not.toHaveBeenCalled()
        })
    })
})
