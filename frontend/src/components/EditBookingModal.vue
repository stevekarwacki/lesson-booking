<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <h2>Reschedule Lesson</h2>
            
            <div class="booking-details">
                <p>Current Booking:</p>
                <p>Date: {{ formatDate(booking.date, 'anm-abbr') }}</p>
                <p>Time: {{ formatTime(slotToTime(booking.start_slot)) }} - {{ formatTime(slotToTime(booking.start_slot + booking.duration)) }}</p>
                <p>Instructor: {{ booking.Instructor.User.name }}</p>
            </div>

            <div class="schedule-section">
                <h3>Select New Time</h3>
                <div class="date-selection">
                    <label for="date-select">Select a date:</label>
                    <input 
                        type="date" 
                        id="date-select"
                        v-model="selectedDate"
                        :min="today"
                        @change="handleDateChange"
                    >
                </div>

                <div v-if="dailySchedule" class="schedule-view">
                    <DailyScheduleView 
                        :dailySchedule="dailySchedule"
                        :selected-day="selectedDay"
                        :isInstructorOrAdmin="false"
                        @slot-selected="handleSlotSelected"
                    />
                </div>
                <div v-else-if="selectedDate" class="no-availability">
                    <p>No available time slots for this date.</p>
                </div>
            </div>

            <div class="action-buttons">
                <button 
                    class="btn-cancel" 
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    Cancel
                </button>
                <button 
                    class="btn-confirm" 
                    @click="updateBooking"
                    :disabled="loading || !selectedSlot"
                >
                    {{ loading ? 'Processing...' : 'Update Booking' }}
                </button>
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTime, formatDate, formatTime } from '../utils/timeFormatting'
import DailyScheduleView from './DailyScheduleView.vue'

const props = defineProps({
    booking: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-updated'])

const userStore = useUserStore()
const loading = ref(false)
const error = ref(null)
const selectedDate = ref('')
const dailySchedule = ref(null)
const selectedSlot = ref(null)

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

const selectedDay = computed(() => {
    if (!selectedDate.value) return null
    // Create a new date object from the selected date string
    const date = new Date(selectedDate.value + 'T00:00:00')
    return {
        date: selectedDate.value,
        formattedDate: formatDate(date, 'anm-abbr')
    }
})

const handleDateChange = async () => {
    if (!selectedDate.value) return

    try {
        // Create a date object and adjust for timezone
        const localDate = new Date(selectedDate.value)
        const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000)
        const formattedDate = utcDate.toISOString().split('T')[0]

        // Fetch both availability and booked events
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${props.booking.instructor_id}/daily/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/dailyEvents/${props.booking.instructor_id}/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            throw new Error('Failed to fetch data')
        }

        const scheduleDate = new Date(formattedDate)

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        const formattedSchedule = {}

        availabilityData.forEach(slot => {
            for (let i = 0; i < slot.duration; i += 2) {
                const slotStart = slot.start_slot + i
                const newSlot = Object.assign({}, slot, { start_slot: slotStart, duration: 2 });

                formattedSchedule[slotStart] = formatSlot(newSlot, scheduleDate)
            }
        })

        // Split availability slots around booked events and add booked events to schedule
        bookedEvents.forEach(event => {
            // Skip the current booking when showing conflicts
            if (event.id === props.booking.id) return
            
            // Add booked event to schedule
            formattedSchedule[event.start_slot] = formatSlot(event, scheduleDate)
        })

        dailySchedule.value = formattedSchedule
    } catch (err) {
        error.value = 'Error fetching schedule'
        console.error('Fetch error:', err)
    }
}

const formatSlot = (slot, date) => {
    return {
        ...slot,
        date: date,
        type: slot.student_id ? 'booked' : 'available'
    }
}

const handleSlotSelected = (slot) => {
    selectedSlot.value = {
        ...slot,
        instructorId: props.booking.instructor_id
    }
}

const updateBooking = async () => {
    if (!selectedSlot.value) return

    try {
        loading.value = true
        error.value = null

        // Get the date in UTC
        const date = new Date(selectedSlot.value.date)
        date.setUTCHours(0, 0, 0, 0)
        const utcDate = date.toISOString().split('T')[0]
        
        // Convert slot times to UTC
        const startTime = slotToTime(selectedSlot.value.startSlot)
        const endTime = slotToTime(parseInt(selectedSlot.value.startSlot) + parseInt(selectedSlot.value.duration))
        
        // Create UTC dates
        const startDate = new Date(`${utcDate}T${startTime}:00.000Z`)
        const endDate = new Date(`${utcDate}T${endTime}:00.000Z`)

        const response = await fetch(`/api/calendar/student/${props.booking.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString()
            })
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to update booking')
        }

        emit('booking-updated')
    } catch (err) {
        error.value = err.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.modal-content {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

.booking-details {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    background: var(--background-light);
    border-radius: var(--border-radius);
}

.schedule-section {
    margin: var(--spacing-md) 0;
}

.date-selection {
    margin-bottom: var(--spacing-md);
}

.date-selection label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
}

.date-selection input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.no-availability {
    text-align: center;
    padding: var(--spacing-lg);
    background: var(--background-light);
    border-radius: var(--border-radius);
    margin-top: var(--spacing-md);
}

.action-buttons {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
}

.btn-cancel {
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--text-secondary);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel:hover:not(:disabled) {
    opacity: 0.9;
}

.btn-confirm {
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
    opacity: 0.9;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.error-message {
    color: var(--error-color);
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}
</style> 