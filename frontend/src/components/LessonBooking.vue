<template>
    <div class="lesson-booking card">
        <h2>Book A Lesson</h2>
        
        <!-- Instructor selection -->
        <div class="instructor-selection" v-if="instructors.length > 1">
            <label for="instructor-select">Select Instructor:</label>
            <select id="instructor-select" v-model="selectedInstructor">
                <option value="">Choose an instructor</option>
                <option 
                    v-for="instructor in instructors" 
                    :key="instructor.id" 
                    :value="instructor"
                >
                    {{ instructor.name }}
                </option>
            </select>
        </div>

        <InstructorCalendar v-if="selectedInstructor.id" :instructor="selectedInstructor" />

        <div v-if="error" class="error-message">{{ error }}</div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { currentUser } from '../stores/userStore'
import InstructorCalendar from './InstructorCalendar.vue'

const instructors = ref([])
const error = ref('')
const selectedInstructor = ref({})

// Fetch instructors
const fetchInstructors = async () => {
    try {
        const response = await fetch('/api/instructors', {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch instructors')
        
        instructors.value = await response.json()
        // Set the first instructor as default if there's only one
        if (instructors.value.length === 1) {
            selectedInstructor.value = instructors.value[0]
        }
    } catch (err) {
        error.value = 'Error fetching instructors'
        console.error(err)
    }
}

onMounted(async () => {
    await fetchInstructors()
})
</script>

<style scoped>
.instructor-selection {
    display: flex;
    gap: 1rem;
    margin-bottom: 20px;
}

.lesson-booking {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.error-message {
    color: var(--error-color);
    margin-top: 10px;
}
</style> 