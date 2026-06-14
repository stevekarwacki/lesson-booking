<script setup>
import { PageContainer } from '@/components/ui/page-container'
import PackageManager from '../components/PackageManager.vue'
import { useUserStore } from '../stores/userStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

onMounted(() => {
    if (!userStore.canManagePackages) {
        router.push('/')
    }
})
</script>

<template>
    <PageContainer class="manage-packages-page">
        <div class="page-header">
            <h1>Manage Packages</h1>
        </div>
        <PackageManager />
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