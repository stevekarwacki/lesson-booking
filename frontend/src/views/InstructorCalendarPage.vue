<template>
    <div class="calendar-page">
        <div class="page-header">
            <h1>Manage Your Calendar</h1>
        </div>
        <InstructorCalendar v-if="instructor && instructor.id" :instructor="instructor" />
    </div>
</template>

<script setup>
import InstructorCalendar from '../components/InstructorCalendar.vue'
import { currentUser } from '../stores/userStore'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const instructor = ref(null)

const fetchInstructor = async () => {
    try {
        const response = await fetch(`/api/instructors/user/${currentUser.value.id}`, {
            headers: {
                'user-id': currentUser.value.id
            }
        });
        if (!response.ok) throw new Error('Failed to fetch instructor information');
        const data = await response.json();
        instructor.value = data;
    } catch (err) {
        error.value = 'Failed to fetch instructor information';
    }
}

onMounted(() => {
    if (!currentUser.value || currentUser.value.role !== 'instructor') {
        router.push('/')
    } else if (currentUser.value.role === 'instructor') {
        fetchInstructor()
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