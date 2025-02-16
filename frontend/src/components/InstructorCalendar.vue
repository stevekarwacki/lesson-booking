<template>
    <div class="calendar-manager">
        <div class="calendar-header">
            <h3>Manage Your Schedule</h3>
            <button class="btn btn-primary" @click="showAddEventForm = !showAddEventForm">
                {{ showAddEventForm ? 'Cancel' : 'Add Availability' }}
            </button>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <!-- Add Event Form -->
        <div v-if="showAddEventForm" class="add-event-form card">
            <form @submit.prevent="handleAddEvent">
                <div class="form-group">
                    <label for="title">Title</label>
                    <input 
                        id="title"
                        v-model="newEvent.title"
                        type="text"
                        required
                        placeholder="e.g., Piano Lesson"
                    >
                </div>

                <div class="form-group">
                    <label for="start-time">Start Time</label>
                    <input 
                        id="start-time"
                        v-model="newEvent.start_time"
                        type="datetime-local"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="end-time">End Time</label>
                    <input 
                        id="end-time"
                        v-model="newEvent.end_time"
                        type="datetime-local"
                        required
                    >
                </div>

                <button type="submit" class="btn btn-success">Add Time Slot</button>
            </form>
        </div>

        <!-- Calendar Events Display -->
        <div class="events-list">
            <div v-for="event in sortedEvents" :key="event.id" class="event-card">
                <div class="event-details">
                    <h4>{{ event.title }}</h4>
                    <p>{{ formatDateTime(event.start_time) }} - {{ formatDateTime(event.end_time) }}</p>
                    <p class="status" :class="event.status">Status: {{ event.status }}</p>
                    <p v-if="event.student_id">Student: {{ getStudentName(event.student_id) }}</p>
                </div>
                <div class="event-actions" v-if="event.status === 'available'">
                    <button 
                        class="btn btn-danger"
                        @click="deleteEvent(event.id)"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { currentUser } from '../stores/userStore'

const events = ref([])
const error = ref('')
const success = ref('')
const showAddEventForm = ref(false)
const newEvent = ref({
    title: '',
    start_time: '',
    end_time: '',
    status: 'available'
})

const sortedEvents = computed(() => {
    return [...events.value].sort((a, b) => 
        new Date(a.start_time) - new Date(b.start_time)
    )
})

const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString()
}

const fetchEvents = async () => {
    try {
        const response = await fetch(`/api/calendar/instructor/${currentUser.value.instructor_id}`)
        if (!response.ok) throw new Error('Failed to fetch events')
        events.value = await response.json()
    } catch (err) {
        error.value = err.message
    }
}

const handleAddEvent = async () => {
    try {
        const response = await fetch('/api/calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
            },
            body: JSON.stringify({
                ...newEvent.value,
                instructor_id: currentUser.value.instructor_id
            })
        })

        if (!response.ok) throw new Error('Failed to create event')

        success.value = 'Time slot added successfully'
        showAddEventForm.value = false
        newEvent.value = {
            title: '',
            start_time: '',
            end_time: '',
            status: 'available'
        }
        await fetchEvents()
    } catch (err) {
        error.value = err.message
    }
}

const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return

    try {
        const response = await fetch(`/api/calendar/${eventId}`, {
            method: 'DELETE',
            headers: {
                'user-id': currentUser.value.id
            }
        })

        if (!response.ok) throw new Error('Failed to delete event')

        success.value = 'Time slot deleted successfully'
        await fetchEvents()
    } catch (err) {
        error.value = err.message
    }
}

onMounted(fetchEvents)
</script>

<style scoped>
.calendar-manager {
    padding: var(--spacing-md);
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.add-event-form {
    margin-bottom: var(--spacing-lg);
}

.events-list {
    display: grid;
    gap: var(--spacing-md);
}

.event-card {
    background: white;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.event-details h4 {
    margin: 0 0 var(--spacing-sm);
    color: var(--secondary-color);
}

.status {
    font-weight: 500;
}

.status.available { color: var(--success-color); }
.status.booked { color: var(--primary-color); }
.status.unavailable { color: var(--error-color); }

.event-actions {
    display: flex;
    gap: var(--spacing-sm);
}
</style> 