<template>
    <div class="lesson-booking card">
        <div class="card-header">
            <h2>Book A Lesson</h2>
        </div>
        
        <div class="card-body">
            <!-- Instructor selection -->
            <div class="form-group" v-if="instructors.length > 1">
                <label for="instructor-select" class="form-label">Select Instructor:</label>
                <select id="instructor-select" v-model="selectedInstructor" class="form-input">
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

            <div v-if="error" class="form-message error-message">{{ error }}</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import InstructorCalendar from './InstructorCalendar.vue'
import { fetchInstructors as fetchInstructorsHelper } from '../utils/fetchHelper'

const userStore = useUserStore()
const instructors = ref([])
const error = ref('')
const selectedInstructor = ref({})

// Fetch instructors
const fetchInstructors = async () => {
    try {
        const result = await fetchInstructorsHelper(userStore.token, {
            onError: (errorMessage, err) => {
                error.value = 'Error fetching instructors';
            }
        });
        
        instructors.value = result.instructors;
        
        // Set the first instructor as default if there's only one
        if (result.selectedInstructor) {
            selectedInstructor.value = result.selectedInstructor;
        }
    } catch (err) {
        // Error already handled in the helper
    }
}

onMounted(async () => {
    await fetchInstructors()
})
</script>

<style scoped>
.lesson-booking {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.form-group {
    margin-bottom: var(--spacing-lg);
}

@media (max-width: 768px) {
    .lesson-booking {
        padding: var(--spacing-md);
    }
}
</style> 