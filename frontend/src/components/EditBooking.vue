<template>
    <div class="edit-booking-slides">
        <SlideTransition
            :slide-count="2"
            @slide-changed="handleSlideChange"
        >
            <!-- Slide 1: Calendar Selection -->
            <template #main="{ navigate }">
                <div class="calendar-slide">
                    <div class="booking-details">
                        <h3>Current Booking</h3>
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
                        
                        <div class="form-group-inline">
                            <Label for="date-select">Select a date:</Label>
                            <DatePicker
                                v-model="selectedDate"
                                :min-value="today"
                                placeholder="Pick a date"
                                class="w-[280px]"
                            />
                        </div>

                        <div v-if="dailySchedule" class="schedule-view">
                            <DailyScheduleView 
                                :dailySchedule="dailySchedule"
                                :selected-day="selectedDay"
                                :isInstructorOrAdmin="false"
                                :isRescheduling="true"
                                :selected-slot="selectedSlot"
                                :original-slot="booking"
                                @slot-selected="handleSlotSelected($event, navigate)"
                            />
                        </div>
                        <div v-else-if="selectedDate" class="no-availability">
                            <p>No available time slots for this date.</p>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Slide 2: Confirmation -->
            <template #detail>
                <div v-if="selectedSlot" class="confirmation-slide">
                    <h3 class="text-2xl font-semibold mb-6">Confirm Reschedule</h3>
                    
                    <Card class="mb-4">
                        <CardHeader>
                            <CardTitle>Original Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p class="text-lg font-semibold">
                                {{ formatDate(new Date(booking.date + 'T00:00:00')) }}
                            </p>
                            <p class="text-muted-foreground">
                                {{ formatTime(slotToTime(booking.start_slot)) }} - 
                                {{ formatTime(slotToTime(booking.start_slot + booking.duration)) }}
                            </p>
                        </CardContent>
                    </Card>

                    <div class="text-center text-2xl my-4">↓</div>

                    <Card class="mb-6">
                        <CardHeader>
                            <CardTitle>New Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p class="text-lg font-semibold">
                                {{ formatDate(selectedSlot.date) }}
                            </p>
                            <p class="text-muted-foreground">
                                {{ formatTime(slotToTime(selectedSlot.startSlot)) }} - 
                                {{ formatTime(slotToTime(selectedSlot.startSlot + selectedSlot.duration)) }}
                            </p>
                        </CardContent>
                    </Card>

                    <div class="confirmation-message p-4 bg-muted rounded-lg">
                        <p class="text-center">Are you sure you want to reschedule your booking to this new time?</p>
                    </div>
                </div>
            </template>
        </SlideTransition>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, inject } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useCalendar } from '../composables/useCalendar'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { useAvailability } from '../composables/useAvailability'
import { useUserStore } from '../stores/userStore'
import { useScheduleStore } from '../stores/scheduleStore'
import { useSettingsStore } from '../stores/settingsStore'
import { slotToTimeUTC, slotToTime, formatDateUTC, createUTCDateFromSlot, formatDate, formatTime } from '../utils/timeFormatting'
import DailyScheduleView from './DailyScheduleView.vue'
import { Button } from '@/components/ui/button'
import SlideTransition from './SlideTransition.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const props = defineProps({
    booking: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-updated', 'booking-cancelled'])

// Inject actionControl for button management
const actionControl = inject('actionControl', null)

const queryClient = useQueryClient()
const formFeedback = useFormFeedback()
const userStore = useUserStore()
const scheduleStore = useScheduleStore()
const settingsStore = useSettingsStore()
const loading = ref(false)
const selectedDate = ref('')
const dailySchedule = ref(null)
const selectedSlot = ref(null)

// Track current slide for button management
const currentSlide = ref(0)

// Computed date for queries
const formattedSelectedDate = computed(() => {
    if (!selectedDate.value) return null
    const localDate = new Date(selectedDate.value)
    const utcDate = new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000)
    return utcDate.toISOString().split('T')[0]
})

// Use calendar composable for events and mutations (Vue Query)
const {
    dailyEvents: rescheduleEvents,
    isLoadingDailyEvents: isLoadingRescheduleEvents,
    updateBooking: updateBookingMutation,
    cancelBooking: cancelBookingMutation,
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
// (Removed - now done in onMounted with button initialization)

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
            const slotStart = slot.start_slot
            const slotDuration = slot.duration || 2

            // Expand: store the same data at every slot position this availability occupies
            for (let i = 0; i < slotDuration; i++) {
                const currentSlot = slotStart + i
                formattedSchedule[currentSlot] = formatSlot(slot, scheduleDate)
            }
        })

        // Add booked events to schedule
        bookedEvents.forEach(event => {
            // Handle the current booking being rescheduled differently
            if (event.id === props.booking.id) {
                // Expand rescheduling booking to all slots it occupies
                const slotStart = event.start_slot
                const slotDuration = originalDuration || 2
                
                for (let i = 0; i < slotDuration; i++) {
                    const currentSlot = slotStart + i
                    const slotData = {
                        ...event,
                        duration: slotDuration,
                        type: 'rescheduling'
                    }
                    formattedSchedule[currentSlot] = formatSlot(slotData, scheduleDate)
                }
                return
            }
            
            // Expand other bookings to all slots they occupy
            const slotStart = event.start_slot
            const slotDuration = event.duration || 2
            
            for (let i = 0; i < slotDuration; i++) {
                const currentSlot = slotStart + i
                formattedSchedule[currentSlot] = formatSlot(event, scheduleDate)
            }
        })

        dailySchedule.value = formattedSchedule
    } catch (err) {
        formFeedback.handleError(err, 'Error fetching schedule:')
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

const handleSlotSelected = (slot, navigate) => {
    selectedSlot.value = {
        ...slot,
        instructorId: props.booking.instructor_id,
        duration: props.booking.duration // Always use original booking duration for rescheduling
    }
    // Navigate to confirmation slide
    navigate()
}

const updateBooking = async () => {
    if (!selectedSlot.value) return

    try {
        loading.value = true

        // Get the date in UTC using utility functions
        const utcDate = formatDateUTC(selectedSlot.value.date)
        
        // Convert slot times to UTC using utility functions
        const startTime = slotToTimeUTC(selectedSlot.value.startSlot)
        const endTime = slotToTimeUTC(parseInt(selectedSlot.value.startSlot) + parseInt(selectedSlot.value.duration))
        
        // Create UTC dates using utility functions
        const startDate = createUTCDateFromSlot(utcDate, selectedSlot.value.startSlot)
        const endSlot = parseInt(selectedSlot.value.startSlot) + parseInt(selectedSlot.value.duration)
        const endDate = createUTCDateFromSlot(utcDate, endSlot)

        await updateBookingMutation({
            bookingId: props.booking.id,
            updateData: {
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString()
            }
        })

        // Trigger schedule refresh for this instructor
        scheduleStore.triggerInstructorRefresh(props.booking.instructor_id)

        // Show success toast
        formFeedback.showSuccess('Booking rescheduled successfully!')

        // Emit and close modal
        emit('booking-updated')
        
        // Close the modal if we have actionControl
        if (actionControl && actionControl.close) {
            // Small delay to let the success toast show
            setTimeout(() => {
                actionControl.close()
            }, 500)
        }
    } catch (err) {
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

        const result = await cancelBookingMutation(props.booking.id)
        
        // Trigger schedule refresh for this instructor
        scheduleStore.triggerInstructorRefresh(props.booking.instructor_id)
        
        // Show success toast
        formFeedback.showSuccess('Booking cancelled successfully!')
        
        // Emit and close modal
        emit('booking-cancelled', result)
        
        // Close the modal if we have actionControl
        if (actionControl && actionControl.close) {
            // Small delay to let the success toast show
            setTimeout(() => {
                actionControl.close()
            }, 500)
        }
    } catch (err) {
        formFeedback.handleError(err, 'Failed to cancel booking:')
        loading.value = false // Only reset on error so user can retry
    }
}

// Handle slide changes
const handleSlideChange = ({ index }) => {
    currentSlide.value = index
    updateButtons(index)
}

// Update buttons based on slide
const updateButtons = (slideIndex) => {
    if (!actionControl) return

    if (slideIndex === 0) {
        // Calendar slide - "Cancel Booking" button
        actionControl.setSaveText('Cancel Booking')
        actionControl.setSaveDisabled(false)
        actionControl.showSave()
        actionControl.onSave = cancelBooking
    } else if (slideIndex === 1) {
        // Confirmation slide - "Confirm Reschedule" button
        actionControl.setSaveText('Confirm Reschedule')
        actionControl.setSaveDisabled(false)
        actionControl.showSave()
        actionControl.onSave = updateBooking
    }
}

// Handle save button click - delegates to current slide's action
const handleSave = () => {
    if (currentSlide.value === 0) {
        cancelBooking()
    } else if (currentSlide.value === 1) {
        updateBooking()
    }
}

// Initialize buttons on mount
onMounted(() => {
    // Create a date object from the booking's date
    const date = new Date(props.booking.date + 'T00:00:00')
    // Format it as YYYY-MM-DD
    selectedDate.value = date.toISOString().split('T')[0]
    
    // Initialize buttons for first slide
    updateButtons(0)
})

// Expose handleSave for parent to call
defineExpose({ handleSave })
</script>

<style scoped>
.edit-booking-slides {
    width: 100%;
}

.calendar-slide,
.confirmation-slide {
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

.schedule-section h3 {
    margin-bottom: var(--spacing-md);
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

.error-message {
    color: var(--error-color);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}

.edit-booking-slides {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.calendar-slide {
    display: flex;
    flex-direction: column;
}

.schedule-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.schedule-view {
    flex: 1;
    overflow: hidden;
    margin-top: var(--spacing-md);
}

.confirmation-slide {
    padding: var(--spacing-md) 0;
}
</style>
