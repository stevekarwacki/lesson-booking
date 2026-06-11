<script setup>
import HelpViewer from '@/components/HelpViewer.vue'
</script>

<template>
    <div class="page-container">
        <h1 class="page-title">Help</h1>
        <HelpViewer />
    </div>
</template>

<style scoped>
.page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--spacing-lg, 1.5rem);
}

.page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 1.25rem;
}
</style>
