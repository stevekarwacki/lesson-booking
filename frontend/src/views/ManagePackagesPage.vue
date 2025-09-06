<script setup>
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
    <div class="manage-packages-page">
        <div class="page-header">
            <h1>Manage Packages</h1>
        </div>
        <PackageManager />
    </div>
</template>

<style scoped>
.manage-packages-page {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}
</style> 