<template>
    <div class="calendar-page">
        <div class="page-header">
            <h1>Manage Your Calendar</h1>
        </div>
        <InstructorCalendar />
    </div>
</template>

<script setup>
import InstructorCalendar from '../components/InstructorCalendar.vue'
import { currentUser } from '../stores/userStore'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
    if (!currentUser.value || currentUser.value.role !== 'instructor') {
        router.push('/')
    }
})
</script>

<style scoped>
.calendar-page {
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