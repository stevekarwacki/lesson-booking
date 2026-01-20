<template>
    <div class="edit-booking">
        <div class="booking-details">
            <h3>Current Booking Information</h3>
            <div>
                <span>Date:</span>
                <span>{{ formatDate(new Date(booking.date + 'T00:00:00')) }}</span>
            </div>
            <div>
                <span>Time:</span>
                <span>{{ booking.start_slot ? formatTime(slotToTime(booking.start_slot)) : '' }} - {{ booking.start_slot && booking.duration ? formatTime(slotToTime(booking.start_slot + booking.duration)) : '' }}</span>
            </div>
            <div>
                <span>Instructor:</span>
                <span>{{ booking.Instructor.User.name }}</span>
            </div>
        </div>

        <div class="schedule-section">
            <h3>Select New Time</h3>
            
            <div class="time-comparison">
                <div class="original-time-info">
                    <h4>Original Time:</h4>
                    <p>{{ formatDate(new Date(booking.date + 'T00:00:00')) }} at {{ booking.start_slot ? formatTime(slotToTime(booking.start_slot)) : '' }} - {{ booking.start_slot && booking.duration ? formatTime(slotToTime(booking.start_slot + booking.duration)) : '' }}</p>
                </div>
                <div class="selected-slot-info">
                    <h4>New Time:</h4>
                    <p v-if="selectedSlot">{{ formatDate(selectedSlot.date) }} at {{ selectedSlot.startSlot ? formatTime(slotToTime(selectedSlot.startSlot)) : '' }} - {{ selectedSlot.startSlot && selectedSlot.duration ? formatTime(slotToTime(selectedSlot.startSlot + selectedSlot.duration)) : '' }}</p>
                    <p v-else class="placeholder-text">Select a new time slot</p>
                </div>
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
                    :isRescheduling="true"
                    :selected-slot="selectedSlot"
                    :original-slot="booking"
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

        <div class="edit-booking-actions">
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
                    Cancel Booking
                </button>
                <button 
                    class="form-button" 
                    @click="updateBooking"
                    :disabled="loading || !selectedSlot"
                >
                    Update Booking
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useCalendar } from '../composables/useCalendar'
import { useAvailability } from '../composables/useAvailability'
import { useUserStore } from '../stores/userStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { useSettingsStore } from '../stores/settingsStore'
import { slotToTimeUTC, slotToTime, formatDateUTC, createUTCDateFromSlot, formatDate, formatTime } from '../utils/timeFormatting'
import DailyScheduleView from './DailyScheduleView.vue'

const props = defineProps({
    booking: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-updated', 'booking-cancelled'])

const queryClient = useQueryClient()
const formFeedback = useFormFeedback()
const userStore = useUserStore()
const scheduleStore = useScheduleStore()
const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref(null)
const selectedDate = ref('')
const dailySchedule = ref(null)
const selectedSlot = ref(null)

// Computed date for queries
const formattedSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    const localDate = new Date(selectedDate.value)
    const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000)
    return utcDate.toISOString().split('T')[0]
})

// Use calendar composable for events (Vue Query)
const {
    dailyEvents: rescheduleEvents,
    isLoadingDailyEvents: isLoadingRescheduleEvents,
} = useCalendar(
    computed(() => props.booking.instructor_id),
    null, // no weekly start date needed
    null, // no weekly end date needed
    formattedSelectedDate
)

// Use availability composable (Vue Query)
const {
    dailyAvailability: rescheduleAvailability,
    isLoadingDailyAvailability: isLoadingRescheduleAvailability,
} = useAvailability(
    computed(() => props.booking.instructor_id),
    formattedSelectedDate
)

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0]

// Set the initial selected date to the booking's date
onMounted(() => {
    // Create a date object from the booking's date
    const date = new Date(props.booking.date + 'T00:00:00')
    // Format it as YYYY-MM-DD
    selectedDate.value = date.toISOString().split('T')[0]
})

// Watch for Vue Query data changes and update schedule
watch([rescheduleAvailability, rescheduleEvents], () => {
    if (rescheduleAvailability.value && rescheduleEvents.value) {
        handleDateChange()
    }
}, { immediate: true })

const selectedDay = computed(() => {
    if (!selectedDate.value) return null
    // Parse the date string correctly to avoid timezone issues
    const [year, month, day] = selectedDate.value.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return {
        date: date,
        formattedDate: formatDate(date)
    }
})

const handleDateChange = async () => {
    if (!selectedDate.value) return

    try {
        // Use Vue Query data
        const availabilityData = rescheduleAvailability.value || []
        const bookedEvents = rescheduleEvents.value || []
        
        const formattedDate = formattedSelectedDate.value
        if (!formattedDate) return
        
        const scheduleDate = new Date(formattedDate)

        const formattedSchedule = {}

        // Use the original booking's duration for rescheduling
        const originalDuration = props.booking.duration
        
        availabilityData.forEach(slot => {
            // For rescheduling, only show slots that can accommodate the original duration
            if (slot.duration >= originalDuration) {
                // Create slots that match the original booking duration
                for (let i = 0; i <= slot.duration - originalDuration; i += 2) {
                    const slotStart = slot.start_slot + i
                    const newSlot = Object.assign({}, slot, { 
                        start_slot: slotStart, 
                        duration: originalDuration 
                    });

                    formattedSchedule[slotStart] = formatSlot(newSlot, scheduleDate)
                }
            }
        })

        // Split availability slots around booked events and add booked events to schedule
        bookedEvents.forEach(event => {
            // Handle the current booking being rescheduled differently
            if (event.id === props.booking.id) {
                // Add current booking as a special "rescheduling" type - handle multi-slot properly
                const SLOT_DURATION = settingsStore.slotDuration
                
                if (originalDuration > SLOT_DURATION) {
                    // Multi-slot rescheduling booking - create entries for each slot
                    const totalSlots = originalDuration / SLOT_DURATION
                    for (let i = 0; i < originalDuration; i += SLOT_DURATION) {
                        const currentSlot = event.start_slot + i
                        const slotData = {
                            ...event,
                            start_slot: currentSlot,
                            duration: SLOT_DURATION,
                            type: 'rescheduling',
                            isMultiSlot: true,
                            totalSlots: totalSlots,
                            slotPosition: i / SLOT_DURATION,
                            bookingId: event.id,
                            originalStartSlot: event.start_slot,
                            originalDuration: originalDuration
                        }
                        formattedSchedule[currentSlot] = formatSlot(slotData, scheduleDate)
                    }
                } else {
                    // Single slot rescheduling
                    const slotData = {
                        ...event,
                        duration: originalDuration,
                        type: 'rescheduling'
                    }
                    const reschedulingSlot = formatSlot(slotData, scheduleDate)
                    formattedSchedule[event.start_slot] = reschedulingSlot
                }
                return
            }
            
            // Add booked event to schedule - handle multi-slot bookings properly
            const SLOT_DURATION = settingsStore.slotDuration
            
            if (event.duration > SLOT_DURATION) {
                // Multi-slot booking - create entries for each slot
                const totalSlots = event.duration / SLOT_DURATION
                for (let i = 0; i < event.duration; i += SLOT_DURATION) {
                    const currentSlot = event.start_slot + i
                    const slotData = {
                        ...event,
                        start_slot: currentSlot,
                        duration: SLOT_DURATION,
                        isMultiSlot: true,
                        totalSlots: totalSlots,
                        slotPosition: i / SLOT_DURATION,
                        bookingId: event.id,
                        originalStartSlot: event.start_slot,
                        originalDuration: event.duration
                    }
                    formattedSchedule[currentSlot] = formatSlot(slotData, scheduleDate)
                }
            } else {
                // Single slot booking
                formattedSchedule[event.start_slot] = formatSlot(event, scheduleDate)
            }
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
        type: slot.type || (slot.student_id ? 'booked' : 'available'), // Preserve existing type if set
        isOwnBooking: slot.student_id === userStore.user.id
    }
}

const handleSlotSelected = (slot) => {
    selectedSlot.value = {
        ...slot,
        instructorId: props.booking.instructor_id,
        duration: props.booking.duration // Always use original booking duration for rescheduling
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

        // Invalidate Vue Query caches to reflect the updated booking
        queryClient.invalidateQueries({ 
            queryKey: ['calendar', 'events', props.booking.instructor_id] 
        })
        
        queryClient.invalidateQueries({ 
            queryKey: ['users', props.booking.student_id, 'bookings'] 
        })

        // Trigger schedule refresh for this instructor
        scheduleStore.triggerInstructorRefresh(props.booking.instructor_id)

        // Show success toast
        formFeedback.showSuccess('Booking rescheduled successfully!')

        // Emit immediately - keep buttons in "Processing..." state during transition
        emit('booking-updated')
        // Don't reset loading - component will be destroyed during transition
    } catch (err) {
        error.value = err.message
        formFeedback.handleError(err, 'Failed to reschedule:')
        loading.value = false // Only reset on error so user can retry
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
        
        // Invalidate Vue Query caches to reflect the cancelled booking
        queryClient.invalidateQueries({ 
            queryKey: ['calendar', 'events', props.booking.instructor_id] 
        })
        
        queryClient.invalidateQueries({ 
            queryKey: ['users', props.booking.student_id, 'bookings'] 
        })
        
        // Invalidate credits cache (credits are restored on cancellation)
        queryClient.invalidateQueries({ 
            queryKey: ['credits', props.booking.student_id] 
        })
        
        // Trigger schedule refresh for this instructor
        scheduleStore.triggerInstructorRefresh(props.booking.instructor_id)
        
        // Show success toast
        formFeedback.showSuccess('Booking cancelled successfully!')
        
        // Emit immediately - keep buttons in "Processing..." state during transition
        emit('booking-cancelled', result)
        // Don't reset loading - component will be destroyed during transition
    } catch (err) {
        error.value = err.message
        formFeedback.handleError(err, 'Failed to cancel booking:')
        loading.value = false // Only reset on error so user can retry
    }
}
</script>

<style scoped>
.edit-booking {
    width: 100%;
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

.time-comparison {
    display: flex;
    gap: var(--spacing-md);
    margin: var(--spacing-md) 0;
}

.original-time-info {
    flex: 1;
    padding: var(--spacing-md);
    background: var(--calendar-rescheduling-original);
    border: 1px solid var(--calendar-rescheduling-original);
    border-radius: var(--border-radius);
}

.selected-slot-info {
    flex: 1;
    padding: var(--spacing-md);
    background: var(--calendar-rescheduling-selected);
    border: 1px solid var(--calendar-rescheduling-selected);
    border-radius: var(--border-radius);
}

.original-time-info h4,
.selected-slot-info h4 {
    margin: 0 0 var(--spacing-sm) 0;
    color: white;
}

.original-time-info p,
.selected-slot-info p {
    margin: 0;
    font-weight: 500;
    color: white;
}

.placeholder-text {
    font-style: italic;
    opacity: 0.8;
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

.edit-booking-actions {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
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
