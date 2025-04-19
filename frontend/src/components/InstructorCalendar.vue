<template v-if="instructor">

    <!-- Booked Lessons List -->
    <div v-if="isInstructorOrAdmin && dailyBookings.length > 0" class="booked-lessons-list card">
        <h3>Today's Booked Lessons</h3>
        <div class="bookings-list">
            <div v-for="booking in dailyBookings" :key="booking.id" class="booking-item">
                <div class="booking-time">
                    {{ formatTime(slotToTime(booking.start_slot)) }} - {{ formatTime(slotToTime(booking.start_slot + booking.duration)) }}
                </div>
                <div class="booking-student">
                    {{ booking.student?.name }}
                </div>
            </div>
        </div>
    </div>

    <!-- Date selection -->
    <div class="view-controls">
        <!-- Week navigation - only show when no specific date is selected -->
        <div class="week-navigation" v-if="!selectedDate">
            <button 
                class="btn btn-secondary"
                @click="previousWeek"
                :disabled="isPreviousWeekInPast"
            >
                Previous Week
            </button>
            <span class="week-display">
                Week of {{ weekStart.toLocaleDateString() }}
            </span>
            <button 
                class="btn btn-secondary"
                @click="nextWeek"
            >
                Next Week
            </button>
        </div>

        <button 
            v-if="selectedDate" 
            class="btn btn-secondary"
            @click="clearSelectedDate"
        >
            Back to Weekly View
        </button>

        <!-- Date selection -->
        <div>
            <label for="date-select">{{ !selectedDate ? 'Or select' : 'Select' }} a specific date:</label>
            <input 
                type="date" 
                id="date-select"
                v-model="selectedDate"
                :min="today"
                @change="handleDateChange"
            >
        </div>
    </div>

    <!-- Weekly Schedule View -->
    <div v-if="!selectedDate" class="schedule-view">
        <WeeklyScheduleView 
            :weeklySchedule="weeklySchedule"
            :weekStartDate="weekStart"
            :isInstructorOrAdmin="isInstructorOrAdmin"
            @slot-selected="handleSlotSelected"
        />
    </div>

    <!-- Daily Schedule View -->
    <div v-if="selectedDate && dailySchedule" class="schedule-view">
        <DailyScheduleView 
            :dailySchedule="dailySchedule"
            :selected-day="selectedDay"
            :isInstructorOrAdmin="isInstructorOrAdmin"
            @slot-selected="handleSlotSelected"
        />
    </div>

    <div v-else-if="selectedDate && dailySchedule.length === 0" class="no-availability">
        <p>No available time slots for this date.</p>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>

    <BookingModal
        v-if="showBookingModal"
        :slot="selectedSlot"
        @close="showBookingModal = false"
        @booking-confirmed="handleBookingConfirmed"
    />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { currentUser, isInstructor, isAdmin } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'
import { getStartOfDay, formatTime, slotToTime } from '../utils/timeFormatting'
import BookingModal from './BookingModal.vue'

const { instructor } = defineProps({
    instructor: {
        type: Object,
        required: true
    }
})

const SLOT_DURATION = 2

const selectedDate = ref('')
const weeklyScheduleData = ref([])
const dailyScheduleData = ref([])
const error = ref('')
const dailyBookings = ref([])

// Week selection state
const selectedWeek = ref(firstDayOfWeek(new Date()))

// Get today's date in YYYY-MM-DD format
const today = computed(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
})

// Get start of week (Sunday)
const weekStart = computed(() => {
    const date = new Date(selectedWeek.value)
    const day = date.getDay()
    date.setDate(date.getDate() - day)
    return date
})

function firstDayOfWeek(dateObject, firstDayOfWeekIndex = 0) {
    const dayOfWeek = dateObject.getDay(),
        firstDayOfWeek = new Date(dateObject),
        diff = dayOfWeek >= firstDayOfWeekIndex ?
            dayOfWeek - firstDayOfWeekIndex :
            6 - dayOfWeek

    firstDayOfWeek.setDate(dateObject.getDate() - diff)
    firstDayOfWeek.setHours(0,0,0,0)

    return firstDayOfWeek
}

// Check if previous week would be entirely in the past
const isPreviousWeekInPast = computed(() => {
    const today = getStartOfDay(new Date())
    
    const previousWeekStart = new Date(weekStart.value)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    
    // Get end of previous week (Saturday)
    const previousWeekEnd = new Date(previousWeekStart)
    previousWeekEnd.setDate(previousWeekStart.getDate() + 6)
    previousWeekEnd.setHours(23, 59, 59, 999) // End of day
    
    return previousWeekEnd < today
})

const handleDateChange = () => {
    if (selectedDate.value) {
        fetchDailySchedule()
    }
}

const showBookingModal = ref(false)
const selectedSlot = ref(null)

const handleSlotSelected = (slot) => {
    selectedSlot.value = {
        ...slot,
        instructorId: instructor.id
    }
    showBookingModal.value = true
}

const handleBookingConfirmed = () => {
    showBookingModal.value = false
    selectedSlot.value = null
    // Refresh the schedule
    if (selectedDate.value) {
        fetchDailySchedule()
    } else {
        fetchWeeklySchedule()
    }
}

const clearSelectedDate = () => {
    selectedDate.value = ''
}

/**
 * Formats slot for display
 * @param {Object} slot - slot to be formatted
 * @returns {Object} - formatted slot
 */
const formatSlot = (slot, date) => {
    const formattedSlot = {
        start_slot: slot.start_slot,
        duration: slot.duration,
        date: date,
        type: slot.status || 'available',
        student: null,
        startTime: null,
        endTime: null
    }

    // Calculate start and end times
    const startHour = Math.floor(slot.start_slot / 4)
    const startMinute = (slot.start_slot % 4) * 15
    const endHour = Math.floor((slot.start_slot + slot.duration) / 4)
    const endMinute = ((slot.start_slot + slot.duration) % 4) * 15

    formattedSlot.startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
    formattedSlot.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

    if (slot.student_id) {
        formattedSlot.student = {
            id: slot.student_id,
            name: slot.student_name,
            email: slot.student_email
        }
    }

    return formattedSlot
}

// Fetch weekly schedule
const fetchWeeklySchedule = async () => {
    if (!instructor.id) return

    try {
        // Get week start and end dates
        const startDate = weekStart.value.toISOString().split('T')[0]
        const endDate = new Date(weekStart.value)
        endDate.setDate(endDate.getDate() + 6)
        const endDateStr = endDate.toISOString().split('T')[0]

        // Fetch both availability and booked events
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${instructor.id}/weekly`, {
                headers: { 'user-id': currentUser.value.id }
            }),
            fetch(`/api/calendar/events/${instructor.id}/${startDate}/${endDateStr}`, {
                headers: { 'user-id': currentUser.value.id }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            throw new Error('Failed to fetch data')
        }

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        // Initialize schedule with dates
        const formattedSchedule = {}
        const slotTemplate = {}
        
        for (let i = 0; i < 7; i++) {
            const slotDate = new Date(selectedWeek.value)
            slotDate.setDate(slotDate.getDate() + i)
            slotDate.setHours(0,0,0,0)

            slotTemplate[i] = {
                date: slotDate,
                type: 'unavailable'
            }
        }

        // Start with available slots
        availabilityData.forEach(slot => {
            const dayIndex = slot.day_of_week

            for (let i = 0; i < slot.duration; i += SLOT_DURATION) {
                const slotStart = slot.start_slot + i
                const newSlot = Object.assign({}, slot, { start_slot: slotStart, duration: SLOT_DURATION });

                if (!(slotStart in formattedSchedule)) {
                    formattedSchedule[slotStart] = Object.assign({}, slotTemplate)
                }

                formattedSchedule[slotStart][dayIndex] = formatSlot(newSlot, formattedSchedule[slotStart][dayIndex].date)
            }
        })

        // Overwrite availability with booked events
        bookedEvents.forEach(event => {
            const eventDate = new Date(event.date)
            eventDate.setDate(eventDate.getDate() + 1)
            const dayIndex = eventDate.getDay()
            const slotStart = event.start_slot
            
            formattedSchedule[slotStart][dayIndex] = formatSlot(event, eventDate)
        })

        weeklyScheduleData.value = formattedSchedule
    } catch (err) {
        error.value = 'Error fetching schedule'
        console.error('Fetch error:', err)
    }
}

const dailySchedule = computed(() => {
    return dailyScheduleData.value
})

const selectedDay = computed(() => {
    if (!selectedDate.value) return ''

    const date = new Date(`${selectedDate.value}T00:00:00`)

    return {
        date: date,
        formattedDate: date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric' 
        })
    }
})

const fetchDailySchedule = async () => {
    if (!instructor.id || !selectedDate.value) return

    try {
        // Fetch both availability and booked events
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${instructor.id}/daily/${selectedDate.value}`, {
                headers: { 'user-id': currentUser.value.id }
            }),
            fetch(`/api/calendar/dailyEvents/${instructor.id}/${selectedDate.value}`, {
                headers: { 'user-id': currentUser.value.id }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            throw new Error('Failed to fetch data')
        }

        const scheduleDate = new Date(selectedDate.value)

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        const formattedSchedule = {}

        availabilityData.forEach(slot => {
            for (let i = 0; i < slot.duration; i += SLOT_DURATION) {
                const slotStart = slot.start_slot + i
                const newSlot = Object.assign({}, slot, { start_slot: slotStart, duration: SLOT_DURATION });

                formattedSchedule[slotStart] = formatSlot(newSlot, scheduleDate)
            }
        })

        // Split availability slots around booked events and add booked events to schedule
        bookedEvents.forEach(event => {
            // Add booked event to schedule
            formattedSchedule[event.start_slot] = formatSlot(event, scheduleDate)
        })

        dailyScheduleData.value = formattedSchedule
    } catch (err) {
        error.value = 'Error fetching daily schedule'
        console.error('Fetch error:', err)
    }
}

const weeklySchedule = computed(() => {
    // Initialize empty schedule
    let schedule = {
        0: {
            0: { },
            1: { },
            2: { },
            3: { },
            4: { },
            5: { },
            6: { }
        }
    }

    // If we have data, populate the slots
    if (Object.keys(weeklyScheduleData.value).length) {
        schedule = weeklyScheduleData.value
    }

    return schedule
})

// Navigation methods
const previousWeek = () => {
    const newDate = new Date(selectedWeek.value)
    newDate.setDate(newDate.getDate() - 7)
    selectedWeek.value = newDate
}

const nextWeek = () => {
    const newDate = new Date(selectedWeek.value)
    newDate.setDate(newDate.getDate() + 7)
    selectedWeek.value = newDate
}

// Watch for changes to selected week
watch(selectedWeek, () => {
    fetchWeeklySchedule()
})

// Fetch data on component mount
onMounted(() => {
    fetchWeeklySchedule()
    fetchDailyBookings()
})

watch(() => instructor, async (newInstructor) => {
    if (newInstructor) {
        await fetchWeeklySchedule()
    }
}, { immediate: true })

const isInstructorOrAdmin = computed(() => {
    return isInstructor.value || isAdmin.value
})

const fetchDailyBookings = async () => {
    if (!instructor.id) return

    const bookingDate = selectedDate.value || new Date().toISOString().split('T')[0]

    try {
        const response = await fetch(`/api/calendar/dailyEvents/${instructor.id}/${bookingDate}`, {
            headers: { 'user-id': currentUser.value.id }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch daily bookings')
        }

        const events = await response.json()
        dailyBookings.value = events.map(event => (formatSlot(event)))
    } catch (error) {
        console.error('Error fetching daily bookings:', error)
        dailyBookings.value = []
    }
}

// Watch for changes to selected date
watch(selectedDate, () => {
    fetchDailyBookings()
})
</script>

<style scoped>
.lesson-booking {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.instructor-info {
    margin-bottom: 20px;
}

.instructor-info h3 {
    color: var(--secondary-color);
    margin: 0;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group select,
.form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.schedule-view {
    margin-top: 20px;
}

.no-availability {
    text-align: center;
    padding: 20px;
    background: var(--background-light);
    border-radius: var(--border-radius);
    margin-top: 20px;
}

.error-message {
    color: var(--error-color);
    margin-top: 10px;
}

.view-controls {
    display: flex;
    gap: 20px;
    align-items: flex-end;
    margin-bottom: 20px;
}

.view-controls label {
    font-weight: bold;
}

.btn-secondary {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-secondary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-color);
}

/* Add styles for week navigation */
.week-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.week-display {
    font-weight: bold;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.tooltip {
    position: absolute;
    background: white;
    padding: 8px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 200px;
    font-size: 0.9rem;
}

.tooltip-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.tooltip-content {
    color: var(--text-secondary);
}

.tooltip-content p {
    margin: 4px 0;
}

.booked-lessons-list {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
}

.booked-lessons-list h3 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--secondary-color);
}

.bookings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.booking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm);
    background: var(--background-light);
    border-radius: var(--border-radius);
}

.booking-time {
    font-weight: 500;
    color: var(--text-primary);
}

.booking-student {
    color: var(--text-secondary);
}
</style> 