<script setup>
import { PageContainer } from '@/components/ui/page-container'
import HelpViewer from '@/components/HelpViewer.vue'
</script>

<template>
    <PageContainer class="help-page">
        <div class="page-header">
            <h1>Help</h1>
        </div>
        <HelpViewer />
    </PageContainer>
</template>

<style scoped>
.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}
</style>
