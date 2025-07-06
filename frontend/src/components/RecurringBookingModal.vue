<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>{{ isEditing ? 'Change Your Weekly Lesson Time' : 'Set Your Weekly Lesson Time' }}</h2>
                <button class="modal-close" @click="$emit('close')">&times;</button>
            </div>
            
            <div class="modal-body">
                <div v-if="loading" class="loading-state">
                    Loading...
                </div>

                <div v-else-if="error" class="form-message error-message">
                    {{ error }}
                </div>

                <div v-else>
                    <!-- Current recurring booking info (if editing) -->
                    <div v-if="isEditing && existingBooking" class="current-booking-info">
                        <h3>Current Weekly Schedule</h3>
                        <p><strong>Day:</strong> {{ getDayName(existingBooking.day_of_week) }}</p>
                        <p><strong>Time:</strong> {{ formatTime(slotToTime(existingBooking.start_slot)) }} - {{ formatTime(slotToTime(existingBooking.start_slot + existingBooking.duration)) }}</p>
                        <p><strong>Instructor:</strong> {{ existingBooking.Instructor.User.name }}</p>
                    </div>

                    <!-- Instructor Selection -->
                    <div class="form-group">
                        <label for="instructor-select" class="form-label">Select Instructor:</label>
                        <select 
                            id="instructor-select" 
                            v-model="selectedInstructor" 
                            class="form-input"
                            @change="handleInstructorChange"
                        >
                            <option value="">Choose an instructor</option>
                            <option 
                                v-for="instructor in instructors" 
                                :key="instructor.id" 
                                :value="instructor.id"
                            >
                                {{ instructor.name }}
                            </option>
                        </select>
                    </div>

                    <!-- Day Selection -->
                    <div class="form-group" v-if="selectedInstructor">
                        <label for="day-select" class="form-label">Select Day:</label>
                        <select 
                            id="day-select" 
                            v-model="selectedDay" 
                            class="form-input"
                            @change="handleDayChange"
                        >
                            <option value="">Choose a day</option>
                            <option 
                                v-for="day in daysOfWeek" 
                                :key="day.value" 
                                :value="day.value"
                            >
                                {{ day.label }}
                            </option>
                        </select>
                    </div>

                    <!-- Time Selection -->
                    <div class="form-group" v-if="selectedInstructor && selectedDay !== ''">
                        <label class="form-label">Select Time:</label>
                        <div v-if="loadingAvailability" class="loading-state">
                            Loading available times...
                        </div>
                        <div v-else-if="availableSlots.length === 0" class="no-availability">
                            <p>No available time slots for this day.</p>
                        </div>
                        <div v-else class="time-slots">
                            <div 
                                v-for="slot in availableSlots" 
                                :key="slot.start_slot"
                                @click="selectSlot(slot)"
                                :class="{ 
                                    'time-slot': true,
                                    'active': selectedSlot && selectedSlot.start_slot === slot.start_slot,
                                    'available': slot.type === 'available'
                                }"
                            >
                                {{ formatTime(slotToTime(slot.start_slot)) }} - {{ formatTime(slotToTime(slot.start_slot + slot.duration)) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button 
                    type="button"
                    class="form-button form-button-cancel" 
                    @click="$emit('close')"
                    :disabled="processing"
                >
                    Cancel
                </button>
                <button 
                    class="form-button" 
                    @click="confirmRecurringBooking"
                    :disabled="!selectedSlot || processing"
                >
                    {{ processing ? 'Processing...' : 'Confirm Weekly Time' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { formatTime, slotToTime } from '../utils/timeFormatting'

const props = defineProps({
    subscription: {
        type: Object,
        required: true
    },
    existingBooking: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const userStore = useUserStore()
const loading = ref(false)
const error = ref(null)
const processing = ref(false)
const loadingAvailability = ref(false)

// Form data
const instructors = ref([])
const selectedInstructor = ref('')
const selectedDay = ref('')
const selectedSlot = ref(null)
const availableSlots = ref([])

// Check if we're editing an existing booking
const isEditing = computed(() => !!props.existingBooking)

// Days of the week
const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
]

const getDayName = (dayValue) => {
    const day = daysOfWeek.find(d => d.value === dayValue)
    return day ? day.label : 'Unknown'
}

// Fetch instructors
const fetchInstructors = async () => {
    try {
        loading.value = true
        const response = await fetch('/api/instructors', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        if (!response.ok) throw new Error('Failed to fetch instructors')
        
        instructors.value = await response.json()
        
        // If editing, pre-select the current instructor
        if (isEditing.value && props.existingBooking) {
            selectedInstructor.value = props.existingBooking.instructor_id
            selectedDay.value = props.existingBooking.day_of_week
        }
    } catch (err) {
        error.value = 'Error fetching instructors: ' + err.message
        console.error(err)
    } finally {
        loading.value = false
    }
}

// Handle instructor change
const handleInstructorChange = () => {
    selectedDay.value = ''
    selectedSlot.value = null
    availableSlots.value = []
}

// Handle day change
const handleDayChange = async () => {
    selectedSlot.value = null
    if (selectedInstructor.value && selectedDay.value !== '') {
        await fetchAvailability()
    }
}

// Fetch availability for selected instructor and day
const fetchAvailability = async () => {
    if (!selectedInstructor.value || selectedDay.value === '') return

    try {
        loadingAvailability.value = true
        
        // Get instructor's weekly availability
        const availabilityResponse = await fetch(`/api/availability/${selectedInstructor.value}/weekly`, {
            headers: { 'Authorization': `Bearer ${userStore.token}` }
        })
        
        if (!availabilityResponse.ok) throw new Error('Failed to fetch availability')
        
        const weeklyAvailability = await availabilityResponse.json()
        
        // Filter for selected day
        const dayAvailability = weeklyAvailability.filter(slot => 
            slot.day_of_week === selectedDay.value
        )
        
        // Convert to 30-minute slots for UI
        const slots = []
        dayAvailability.forEach(slot => {
            // Break down longer slots into 30-minute (2 slot) increments
            for (let i = 0; i < slot.duration; i += 2) {
                if (i + 2 <= slot.duration) {
                    slots.push({
                        start_slot: slot.start_slot + i,
                        duration: 2, // 30 minutes
                        type: 'available'
                    })
                }
            }
        })
        
        // Sort by start time
        slots.sort((a, b) => a.start_slot - b.start_slot)
        
        availableSlots.value = slots
        
    } catch (err) {
        error.value = 'Error fetching availability: ' + err.message
        console.error(err)
    } finally {
        loadingAvailability.value = false
    }
}

// Select a time slot
const selectSlot = (slot) => {
    selectedSlot.value = slot
}

// Confirm the recurring booking
const confirmRecurringBooking = async () => {
    if (!selectedSlot.value) return

    try {
        processing.value = true
        error.value = null

        const requestData = {
            subscriptionId: props.subscription.id,
            instructorId: selectedInstructor.value,
            dayOfWeek: selectedDay.value,
            startSlot: selectedSlot.value.start_slot,
            duration: selectedSlot.value.duration
        }

        let response
        if (isEditing.value) {
            // Update existing recurring booking
            response = await fetch(`/api/recurring-bookings/${props.existingBooking.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userStore.token}`
                },
                body: JSON.stringify(requestData)
            })
        } else {
            // Create new recurring booking
            response = await fetch('/api/recurring-bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userStore.token}`
                },
                body: JSON.stringify(requestData)
            })
        }

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to save recurring booking')
        }

        const result = await response.json()
        emit('booking-confirmed', result.recurringBooking)

    } catch (err) {
        error.value = err.message
        console.error('Error saving recurring booking:', err)
    } finally {
        processing.value = false
    }
}

onMounted(() => {
    fetchInstructors()
})
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: var(--border-radius);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: var(--card-shadow);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    margin: 0;
    color: var(--secondary-color);
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-secondary);
}

.modal-close:hover {
    color: var(--text-primary);
}

.modal-body {
    padding: var(--spacing-lg);
}

.modal-footer {
    padding: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-md);
}

.current-booking-info {
    background: var(--background-light);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-lg);
}

.current-booking-info h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--secondary-color);
}

.current-booking-info p {
    margin: var(--spacing-xs) 0;
}

.form-group {
    margin-bottom: var(--spacing-lg);
}

.form-label {
    display: block;
    margin-bottom: var(--spacing-sm);
    font-weight: 500;
    color: var(--text-primary);
}

.form-input {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-size: var(--font-size-md);
}

.form-input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.time-slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--spacing-sm);
    max-height: 300px;
    overflow-y: auto;
}

.time-slot {
    padding: var(--spacing-sm);
    border: 2px solid var(--border-color);
    border-radius: var(--border-radius);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
}

.time-slot:hover {
    border-color: var(--primary-color);
    background: var(--background-light);
}

.time-slot.active {
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: white;
}

.loading-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.no-availability {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.form-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    border: none;
    border-radius: var(--border-radius);
    font-size: var(--font-size-md);
    cursor: pointer;
    transition: all 0.2s ease;
}

.form-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.form-button:not(.form-button-cancel) {
    background: var(--primary-color);
    color: white;
}

.form-button:not(.form-button-cancel):hover:not(:disabled) {
    background: var(--primary-color-dark, #4338ca);
}

.form-button-cancel {
    background: var(--background-light);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.form-button-cancel:hover:not(:disabled) {
    background: var(--border-color);
}

.form-message {
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
}

.error-message {
    background: #fee;
    color: #c53030;
    border: 1px solid #feb2b2;
}

@media (max-width: 768px) {
    .modal-content {
        width: 95%;
        margin: var(--spacing-md);
    }
    
    .time-slots {
        grid-template-columns: 1fr;
    }
}
</style> 