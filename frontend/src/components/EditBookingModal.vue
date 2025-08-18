<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reschedule Lesson</h2>
            </div>
            
            <div class="modal-body">
                <div class="booking-details">
                    <h3>Current Booking Information</h3>
                    <div>
                        <span>Date:</span>
                        <span>{{ formatDate(booking.date, 'anm-abbr') }}</span>
                    </div>
                    <div>
                        <span>Time:</span>
                        <span>{{ formatTime(slotToTime(booking.start_slot)) }} - {{ formatTime(slotToTime(booking.start_slot + booking.duration)) }}</span>
                    </div>
                    <div>
                        <span>Instructor:</span>
                        <span>{{ booking.Instructor.User.name }}</span>
                    </div>
                </div>

                <div class="schedule-section">
                    <h3>Select New Time</h3>
                    
                    <div v-if="selectedSlot" class="selected-slot-info">
                        <h4>Selected New Time:</h4>
                        <p>{{ formatDate(selectedSlot.date, 'anm-abbr') }} at {{ formatTime(slotToTime(selectedSlot.startSlot)) }} - {{ formatTime(slotToTime(selectedSlot.startSlot + selectedSlot.duration)) }}</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="date-select" class="form-label">Select a date:</label>
                        <input 
                            type="date" 
                            id="date-select"
                            v-model="selectedDate"
                            :min="today"
                            @change="handleDateChange"
                            class="form-input"
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

                <div v-if="error" class="form-message error-message">
                    {{ error }}
                </div>
            </div>

            <div class="modal-footer">
                <button 
                    type="button"
                    class="form-button form-button-cancel" 
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    Close
                </button>
                <div class="button-group">
                    <button 
                        type="button"
                        class="form-button form-button-danger" 
                        @click="cancelBooking"
                        :disabled="loading"
                    >
                        {{ loading ? 'Processing...' : 'Cancel Booking' }}
                    </button>
                    <button 
                        class="form-button" 
                        @click="updateBooking"
                        :disabled="loading || !selectedSlot"
                    >
                        {{ loading ? 'Processing...' : 'Update Booking' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTimeUTC, slotToTime, formatDateUTC, createUTCDateFromSlot, formatDate, formatTime } from '../utils/timeFormatting'
import DailyScheduleView from './DailyScheduleView.vue'

const props = defineProps({
    booking: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-updated', 'booking-cancelled'])

const userStore = useUserStore()
const loading = ref(false)
const error = ref(null)
const selectedDate = ref('')
const dailySchedule = ref(null)
const selectedSlot = ref(null)

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

// Set the initial selected date to the booking's date
onMounted(() => {
    // Create a date object from the booking's date
    const date = new Date(props.booking.date + 'T00:00:00')
    // Format it as YYYY-MM-DD
    selectedDate.value = date.toISOString().split('T')[0]
    // Trigger the date change handler to load the schedule
    handleDateChange()
})

const selectedDay = computed(() => {
    if (!selectedDate.value) return null
    // Parse the date string correctly to avoid timezone issues
    const [year, month, day] = selectedDate.value.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return {
        date: date,
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
        type: slot.student_id ? 'booked' : 'available',
        isOwnBooking: slot.student_id === userStore.user.id
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

        // Get the date in UTC using utility functions
        const utcDate = formatDateUTC(selectedSlot.value.date)
        
        // Convert slot times to UTC using utility functions
        const startTime = slotToTimeUTC(selectedSlot.value.startSlot)
        const endTime = slotToTimeUTC(parseInt(selectedSlot.value.startSlot) + parseInt(selectedSlot.value.duration))
        
        // Create UTC dates using utility functions
        const startDate = createUTCDateFromSlot(utcDate, selectedSlot.value.startSlot)
        const endSlot = parseInt(selectedSlot.value.startSlot) + parseInt(selectedSlot.value.duration)
        const endDate = createUTCDateFromSlot(utcDate, endSlot)

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

const cancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return
    }

    try {
        loading.value = true
        error.value = null

        const response = await fetch(`/api/calendar/student/${props.booking.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to cancel booking')
        }

        const result = await response.json()
        
        emit('booking-cancelled', result)
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
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.booking-details h3 {
    margin-bottom: var(--spacing-md);
}

.booking-details > div {
    margin: var(--spacing-sm) 0;
    display: flex;
    gap: var(--spacing-md);
}

.schedule-section {
    margin: var(--spacing-md) 0;
}

.schedule-section h3 {
    margin-bottom: var(--spacing-md);
}

.schedule-view {
    margin-top: var(--spacing-md);
}

.no-availability {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    text-align: center;
    color: var(--text-secondary);
    background: var(--background-light);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.selected-slot-info {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    background: var(--calendar-booked-self);
    border: 1px solid var(--primary-color);
    border-radius: var(--border-radius);
}

.selected-slot-info h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
}

.selected-slot-info p {
    margin: 0;
    font-weight: 500;
    color: var(--text-primary);
}

.form-label {
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
}

.form-input {
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.modal-footer {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
    justify-content: flex-end;
}

.error-message {
    color: var(--error-color);
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}

.button-group {
    display: flex;
    gap: var(--spacing-md);
}
</style> 