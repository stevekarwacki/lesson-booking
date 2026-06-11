<script setup>
import { useRoute } from 'vue-router'
import { useHelp, useHelpArticle } from '@/composables/useHelp'

const route = useRoute()
const { articles, isLoadingManifest } = useHelp()
const { article, isLoadingArticle } = useHelpArticle(
    () => route.params.category ?? 'admin',
    () => route.params.slug ?? 'index'
)
</script>

<template>
    <div class="help-page">
        <div v-if="isLoadingManifest || isLoadingArticle" class="help-loading">
            Loading help content…
        </div>
        <div v-else-if="article" v-html="article.html" class="help-article-body" />
        <div v-else class="help-empty">
            No article found.
        </div>
    </div>
</template>
