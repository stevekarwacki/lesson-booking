<script setup>
import UserManager from '../components/UserManager.vue'
import { useUserStore } from '../stores/userStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

onMounted(() => {
    if (!userStore.canManageUsers) {
        router.push('/')
    }
})
</script>

<template>
    <div class="manage-users-page">
        <div class="page-header">
            <h1>Manage Users</h1>
        </div>
        <UserManager />
    </div>
</template>

<style scoped>
.manage-users-page {
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