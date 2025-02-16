<template>
    <div class="lesson-booking">
        <h3>Available Lesson Times</h3>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <div class="instructor-select">
            <label for="instructor">Select Instructor:</label>
            <select 
                id="instructor"
                v-model="selectedInstructorId"
                @change="fetchAvailability"
            >
                <option value="">Choose an instructor</option>
                <option 
                    v-for="instructor in instructors" 
                    :key="instructor.id" 
                    :value="instructor.id"
                >
                    {{ instructor.name }} - {{ instructor.specialties }}
                </option>
            </select>
        </div>

        <div v-if="selectedInstructorId" class="available-slots">
            <div 
                v-for="slot in availableSlots" 
                :key="slot.id" 
                class="slot-card"
            >
                <div class="slot-details">
                    <h4>{{ slot.title }}</h4>
                    <p>{{ formatDateTime(slot.start_time) }} - {{ formatDateTime(slot.end_time) }}</p>
                </div>
                <button 
                    class="btn btn-primary"
                    @click="bookLesson(slot.id)"
                >
                    Book Lesson
                </button>
            </div>

            <div v-if="availableSlots.length === 0" class="no-slots">
                No available time slots for this instructor
            </div>
        </div>

        <!-- Add this section for admin booking -->
        <div v-if="isAdmin" class="admin-booking-controls">
            <div class="form-group">
                <label for="student-select">Book for Student:</label>
                <select 
                    id="student-select"
                    v-model="selectedStudentId"
                >
                    <option value="">Select a student</option>
                    <option 
                        v-for="student in students" 
                        :key="student.id" 
                        :value="student.id"
                    >
                        {{ student.name }} ({{ student.email }})
                    </option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { currentUser } from '../stores/userStore'
import { api } from '../utils/fetchWrapper'

const instructors = ref([])
const selectedInstructorId = ref('')
const availableSlots = ref([])
const error = ref('')
const success = ref('')
const students = ref([])
const selectedStudentId = ref('')
const isAdmin = computed(() => currentUser.value?.role === 'admin')

const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString()
}

const fetchInstructors = async () => {
    const { data, error: fetchError } = await api.get('/api/instructors', {
        'user-id': currentUser.value.id
    });
    
    if (fetchError) {
        error.value = fetchError;
        return;
    }
    
    instructors.value = data;
}

const fetchAvailability = async () => {
    if (!selectedInstructorId.value) return;
    
    const { data, error: fetchError } = await api.get(
        `/api/calendar/instructor/${selectedInstructorId.value}`,
        { 'user-id': currentUser.value.id }
    );
    
    if (fetchError) {
        error.value = fetchError;
        return;
    }
    
    availableSlots.value = data.filter(event => event.status === 'available');
}

const fetchStudents = async () => {
    if (!isAdmin.value) return
    
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch students')
        const users = await response.json()
        students.value = users.filter(user => user.role === 'student')
    } catch (err) {
        error.value = err.message
    }
}

const bookLesson = async (eventId) => {
    const { data, error: fetchError } = await api.post(
        `/api/calendar/${eventId}/book`,
        {},  // request body
        { 'user-id': currentUser.value.id }
    );
    
    if (fetchError) {
        error.value = fetchError;
        return;
    }
    
    success.value = 'Lesson booked successfully!';
    await fetchAvailability();
}

onMounted(() => {
    fetchInstructors()
    if (isAdmin.value) {
        fetchStudents()
    }
})
</script>

<style scoped>
.lesson-booking {
    padding: var(--spacing-md);
}

.instructor-select {
    margin-bottom: var(--spacing-lg);
}

.available-slots {
    display: grid;
    gap: var(--spacing-md);
}

.slot-card {
    background: white;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.slot-details h4 {
    margin: 0 0 var(--spacing-sm);
    color: var(--secondary-color);
}

.no-slots {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--secondary-color);
}

.admin-booking-controls {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    background-color: #f8f9fa;
    border-radius: var(--border-radius);
}
</style> 