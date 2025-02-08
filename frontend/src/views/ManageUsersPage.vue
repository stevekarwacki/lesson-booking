<script setup>
import UserManager from '../components/UserManager.vue'
import { currentUser } from '../stores/userStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
    // Redirect if not admin
    if (!currentUser.value || currentUser.value.role !== 'admin') {
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
    padding: var(--spacing-lg);
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