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
import { useUserStore } from '../stores/userStore'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const instructor = ref(null)
const error = ref(null)
const loading = ref(false)

const fetchInstructor = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch(`/api/instructors/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructor information');
        }
        
        const data = await response.json();
        instructor.value = data;
    } catch (err) {
        error.value = 'Error fetching instructor information: ' + err.message;
        console.error('Error fetching instructor information:', err);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    if (!userStore.isInstructor) {
        router.push('/')
    } else {
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