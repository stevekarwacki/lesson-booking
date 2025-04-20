<script setup>
import InstructorManager from '../components/InstructorManager.vue'
import { useUserStore } from '../stores/userStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

onMounted(() => {
    if (!userStore.isAdmin) {
        router.push('/')
    }
})
</script>

<template>
    <div class="manage-instructors-page">
        <div class="page-header">
            <h1>Manage Instructors</h1>
        </div>
        <InstructorManager />
    </div>
</template>

<style scoped>
.manage-instructors-page {
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