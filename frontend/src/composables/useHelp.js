import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useUserStore } from '@/stores/userStore'

// ---------------------------------------------------------------------------
// API fetchers
// ---------------------------------------------------------------------------

async function fetchManifest(token) {
    const response = await fetch('/api/help', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) throw new Error('Failed to load help content')
    const data = await response.json()
    return data.articles ?? []
}

async function fetchArticle(category, slug, token) {
    const response = await fetch(`/api/help/${category}/${slug}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!response.ok) {
        if (response.status === 404) throw new Error('Article not found')
        throw new Error('Failed to load article')
    }
    const data = await response.json()
    return data.article
}

// ---------------------------------------------------------------------------
// useHelp — manifest + helpers (no category/slug needed)
// ---------------------------------------------------------------------------

export function useHelp() {
    const userStore = useUserStore()
    const token = computed(() => userStore.token)
    const isAdmin = computed(() => userStore.user?.role === 'admin')

    const {
        data: articles,
        isLoading: isLoadingManifest,
        isError: isManifestError,
        error: manifestError,
        refetch: refetchManifest,
    } = useQuery({
        queryKey: ['help', 'manifest'],
        queryFn: () => fetchManifest(token.value),
        enabled: computed(() => !!token.value && isAdmin.value),
        staleTime: 10 * 60 * 1000,
    })

    // Find the first article whose uiRoute (and optional uiTab) matches
    // the current Vue Router route — used for contextual "Help on this page".
    const getByRoute = (routePath, tab = null) => {
        if (!articles.value) return null
        return articles.value.find(a => {
            const routeMatch = a.uiRoute === routePath
            if (!routeMatch) return false
            if (tab && a.uiTab) return a.uiTab === tab
            return true
        }) ?? null
    }

    // Simple client-side search over title and keywords fields.
    const search = (query) => {
        if (!articles.value || !query?.trim()) return articles.value ?? []
        const q = query.toLowerCase()
        return articles.value.filter(a => {
            const inTitle = a.title?.toLowerCase().includes(q)
            const inKeywords = a.keywords?.some(k => k.toLowerCase().includes(q))
            return inTitle || inKeywords
        })
    }

    // Articles grouped by category for building the nav tree.
    const articlesByCategory = computed(() => {
        if (!articles.value) return {}
        return articles.value.reduce((acc, article) => {
            const cat = article.category ?? 'other'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(article)
            return acc
        }, {})
    })

    return {
        articles,
        articlesByCategory,
        isLoadingManifest,
        isManifestError,
        manifestError,
        refetchManifest,
        getByRoute,
        search,
    }
}

// ---------------------------------------------------------------------------
// useHelpArticle — single article query
// ---------------------------------------------------------------------------

export function useHelpArticle(category, slug) {
    const userStore = useUserStore()
    const token = computed(() => userStore.token)
    const isAdmin = computed(() => userStore.user?.role === 'admin')

    const categoryVal = computed(() => {
        if (typeof category === 'function') return category()
        if (typeof category === 'object' && category !== null) return category.value
        return category
    })
    const slugVal = computed(() => {
        if (typeof slug === 'function') return slug()
        if (typeof slug === 'object' && slug !== null) return slug.value
        return slug
    })

    const {
        data: article,
        isLoading: isLoadingArticle,
        isError: isArticleError,
        error: articleError,
        refetch: refetchArticle,
    } = useQuery({
        queryKey: computed(() => ['help', 'article', categoryVal.value, slugVal.value]),
        queryFn: () => fetchArticle(categoryVal.value, slugVal.value, token.value),
        enabled: computed(() => !!token.value && isAdmin.value && !!categoryVal.value && !!slugVal.value),
        staleTime: 10 * 60 * 1000,
    })

    return {
        article,
        isLoadingArticle,
        isArticleError,
        articleError,
        refetchArticle,
    }
}
