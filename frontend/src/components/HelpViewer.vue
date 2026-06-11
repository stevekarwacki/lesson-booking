<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHelp, useHelpArticle } from '@/composables/useHelp'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'
import Separator from '@/components/ui/separator/Separator.vue'
import Skeleton from '@/components/ui/skeleton/Skeleton.vue'

const route = useRoute()
const router = useRouter()

const currentCategory = computed(() => route.params.category ?? 'admin')
const currentSlug = computed(() => route.params.slug ?? 'index')

const { articlesByCategory, isLoadingManifest } = useHelp()
const { article, isLoadingArticle } = useHelpArticle(
    () => currentCategory.value,
    () => currentSlug.value
)

const CATEGORY_ORDER = ['admin', 'users', 'bookings', 'packages', 'settings']
const CATEGORY_LABELS = {
    admin: 'Overview',
    users: 'Users',
    bookings: 'Bookings',
    packages: 'Packages',
    settings: 'Settings',
}

const orderedCategories = computed(() => {
    const cats = Object.keys(articlesByCategory.value ?? {})
    return [
        ...CATEGORY_ORDER.filter(c => cats.includes(c)),
        ...cats.filter(c => !CATEGORY_ORDER.includes(c)),
    ]
})

const isIndexArticle = (cat, art) => cat === 'admin' && art.slug === 'index'

const isActive = (cat, art) => {
    if (isIndexArticle(cat, art)) {
        return !route.params.category
    }
    return currentCategory.value === cat && currentSlug.value === art.slug
}

const navigate = (cat, art) => {
    if (isIndexArticle(cat, art)) {
        router.push('/help')
    } else {
        router.push(`/help/${cat}/${art.slug}`)
    }
}
</script>

<template>
    <div class="help-viewer">
        <aside class="help-sidebar">
            <ScrollArea class="h-full">
                <nav class="help-nav">
                    <template v-if="isLoadingManifest">
                        <Skeleton class="h-3 w-20 mb-3" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-5/6 mb-2" />
                        <Skeleton class="h-4 w-full mb-5" />
                        <Skeleton class="h-3 w-16 mb-3" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-4/5 mb-2" />
                    </template>
                    <template v-else>
                        <template v-for="(cat, index) in orderedCategories" :key="cat">
                            <Separator v-if="index > 0" class="my-3" />
                            <p class="help-nav-category">
                                {{ CATEGORY_LABELS[cat] ?? cat }}
                            </p>
                            <button
                                v-for="art in articlesByCategory[cat]"
                                :key="art.slug"
                                class="help-nav-item"
                                :class="{ 'is-active': isActive(cat, art) }"
                                @click="navigate(cat, art)"
                            >
                                {{ art.title }}
                            </button>
                        </template>
                    </template>
                </nav>
            </ScrollArea>
        </aside>

        <main class="help-content">
            <ScrollArea class="h-full">
                <div class="help-article-wrapper">
                    <template v-if="isLoadingArticle">
                        <Skeleton class="h-8 w-3/5 mb-6" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-4/5 mb-6" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-full mb-2" />
                        <Skeleton class="h-4 w-3/4" />
                    </template>
                    <template v-else-if="article">
                        <div class="help-article-body" v-html="article.html" />
                    </template>
                    <template v-else>
                        <p class="help-empty">Article not found.</p>
                    </template>
                </div>
            </ScrollArea>
        </main>
    </div>
</template>

<style scoped>
.help-viewer {
    display: flex;
    height: calc(100vh - 120px);
    border: 1px solid #e5e7eb;
    border-radius: var(--border-radius, 0.5rem);
    overflow: hidden;
    background: white;
}

/* Sidebar */
.help-sidebar {
    width: 260px;
    flex-shrink: 0;
    border-right: 1px solid #e5e7eb;
    background: #f9fafb;
}

.help-nav {
    padding: 1.25rem 1rem;
}

.help-nav-category {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9ca3af;
    margin: 0 0 0.4rem 0.5rem;
}

.help-nav-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.5rem;
    border-radius: 0.375rem;
    border: none;
    background: none;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    line-height: 1.4;
}

.help-nav-item:hover {
    background: #e5e7eb;
    color: #111827;
}

.help-nav-item.is-active {
    background: var(--primary-color, #2563eb);
    color: white;
    font-weight: 500;
}

/* Article pane */
.help-content {
    flex: 1;
    min-width: 0;
}

.help-article-wrapper {
    padding: 2rem 2.5rem;
    max-width: 720px;
}

.help-empty {
    color: #6b7280;
    font-size: 0.875rem;
}

/* Article HTML styles */
.help-article-body :deep(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1.25rem 0;
    line-height: 1.3;
}

.help-article-body :deep(h2) {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 1.75rem 0 0.6rem 0;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid #e5e7eb;
}

.help-article-body :deep(h3) {
    font-size: 0.975rem;
    font-weight: 600;
    color: #374151;
    margin: 1.25rem 0 0.4rem 0;
}

.help-article-body :deep(p) {
    font-size: 0.9rem;
    color: #374151;
    line-height: 1.7;
    margin: 0 0 0.875rem 0;
}

.help-article-body :deep(ul),
.help-article-body :deep(ol) {
    padding-left: 1.5rem;
    margin: 0 0 0.875rem 0;
}

.help-article-body :deep(li) {
    font-size: 0.9rem;
    color: #374151;
    line-height: 1.6;
    margin-bottom: 0.3rem;
}

.help-article-body :deep(strong) {
    font-weight: 600;
    color: #1f2937;
}

.help-article-body :deep(code) {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    padding: 0.1em 0.35em;
}

.help-article-body :deep(blockquote) {
    border-left: 3px solid #d1d5db;
    margin: 0.875rem 0;
    padding: 0.5rem 1rem;
    background: #f9fafb;
    border-radius: 0 0.25rem 0.25rem 0;
}

.help-article-body :deep(blockquote p) {
    margin: 0;
    color: #4b5563;
    font-size: 0.875rem;
}

.help-article-body :deep(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    margin: 0.875rem 0;
}

.help-article-body :deep(th) {
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    color: #374151;
}

.help-article-body :deep(td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    color: #4b5563;
    vertical-align: top;
}

.help-article-body :deep(tr:nth-child(even) td) {
    background: #fafafa;
}

.help-article-body :deep(hr) {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1.5rem 0;
}

.help-article-body :deep(a) {
    color: var(--primary-color, #2563eb);
    text-decoration: underline;
    text-underline-offset: 2px;
}

@media (max-width: 768px) {
    .help-viewer {
        flex-direction: column;
        height: auto;
    }

    .help-sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
        max-height: 220px;
    }

    .help-article-wrapper {
        padding: 1.25rem 1rem;
    }
}
</style>
