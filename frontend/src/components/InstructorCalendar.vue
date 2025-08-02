<template v-if="instructor">

    <!-- Booked Lessons List -->
    <div v-if="isInstructorOrAdmin && dailyBookings.length > 0" class="card">
        <div class="card-header">
            <h3>Today's Booked Lessons</h3>
        </div>
        <div class="card-body">
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
    </div>

    <!-- Date selection -->
    <div class="view-controls card">
        <div class="card-body">
            <!-- Week navigation - only show when no specific date is selected -->
            <div class="week-navigation" v-if="!selectedDate && $mq.lgPlus">
                <button 
                    class="form-button form-button-secondary"
                    @click="previousWeek"
                    :disabled="isPreviousWeekInPast"
                >
                    Previous Week
                </button>
                <span class="week-display">
                    Week of {{ weekStart.toLocaleDateString() }}
                </span>
                <button 
                    class="form-button form-button-secondary"
                    @click="nextWeek"
                >
                    Next Week
                </button>
            </div>

            <button 
                v-if="selectedDate && $mq.lgPlus" 
                class="form-button form-button-secondary"
                @click="clearSelectedDate"
            >
                Back to Weekly View
            </button>

            <!-- Date selection -->
            <div class="form-group">
                <label for="date-select" class="form-label">{{ !selectedDate ? 'Or select' : 'Select' }} a date:</label>
                <input 
                    type="date" 
                    id="date-select"
                    v-model="selectedDate"
                    :min="today"
                    @change="handleDateChange"
                    class="form-input"
                >
            </div>
        </div>
    </div>

    <!-- Weekly Schedule View -->
    <div v-if="!selectedDate && $mq.lgPlus" class="schedule-view card">
        <div class="card-body">
            <WeeklyScheduleView 
                :weeklySchedule="weeklySchedule"
                :weekStartDate="weekStart"
                :isInstructorOrAdmin="isInstructorOrAdmin"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>

    <!-- Daily Schedule View -->
    <div v-if="(!$mq.lgPlus || selectedDate) && dailyScheduleLoaded" class="schedule-view card">
        <div class="card-body">
            <DailyScheduleView 
                :dailySchedule="dailySchedule"
                :selected-day="selectedDay"
                :isInstructorOrAdmin="isInstructorOrAdmin"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>

    <div v-else-if="selectedDate && dailyScheduleLoaded && Object.keys(dailySchedule).length === 0" class="form-message">
        <p>No available time slots for this date.</p>
    </div>

    <div v-else-if="selectedDate && !dailyScheduleLoaded" class="form-message">
        <p>Loading schedule...</p>
    </div>

    <div v-if="error" class="form-message error-message">{{ error }}</div>

    <BookingModal
        v-if="showBookingModal"
        :slot="selectedSlot"
        @close="showBookingModal = false"
        @booking-confirmed="handleBookingConfirmed"
    />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMq } from 'vue3-mq'
import { useUserStore } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'
import { getStartOfDay, formatTime, slotToTime } from '../utils/timeFormatting'
import BookingModal from './BookingModal.vue'

const userStore = useUserStore()

const { instructor } = defineProps({
    instructor: {
        type: Object,
        required: true
    }
})

const SLOT_DURATION = 2

const selectedDate = useMq().lgPlus ? ref('') : ref(new Date().toISOString().split('T')[0])
const weeklyScheduleData = ref([])
const dailyScheduleData = ref({})
const dailyScheduleLoaded = ref(false)
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

const handleBookingConfirmed = (newBooking) => {
    showBookingModal.value = false
    selectedSlot.value = null
    
    // Refresh the schedule data from the server instead of trying to update locally
    fetchWeeklySchedule()
    
    // Also refresh daily schedule if we're viewing a specific day
    if (selectedDate.value) {
        fetchDailySchedule()
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
        type: slot.type || slot.status || 'available', // Check 'type' first, then fall back to 'status'
        student: null,
        startTime: null,
        endTime: null,
        // Preserve Google Calendar properties for styling
        is_google_calendar: slot.is_google_calendar,
        source: slot.source
    }

    // Calculate start and end times
    const startHour = Math.floor(slot.start_slot / 4)
    const startMinute = (slot.start_slot % 4) * 15
    const endHour = Math.floor((slot.start_slot + slot.duration) / 4)
    const endMinute = ((slot.start_slot + slot.duration) % 4) * 15

    formattedSlot.startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
    formattedSlot.endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

    // Handle student information for both regular bookings and Google Calendar events
    if (slot.student_id) {
        formattedSlot.student = {
            id: slot.student_id,
            name: slot.student_name,
            email: slot.student_email
        }
    } else if (slot.is_google_calendar || slot.source === 'google_calendar') {
        // For Google Calendar events, use the formatted display info
        formattedSlot.student = {
            id: null,
            name: slot.student_name || '🗓️ ' + (slot.summary || 'Busy'),
            email: slot.student_email || 'Google Calendar'
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
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/events/${instructor.id}/${startDate}/${endDateStr}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
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
            let eventDate = new Date(event.date)
            let dayIndex
            
            // Use UTC day for all events to match backend
            dayIndex = eventDate.getUTCDay()
            
            const slotStart = event.start_slot
            
            // Make sure the slot exists in the schedule before accessing it
            if (formattedSchedule[slotStart] && formattedSchedule[slotStart][dayIndex] !== undefined) {
                formattedSchedule[slotStart][dayIndex] = formatSlot(event, eventDate)
            }
        })

        weeklyScheduleData.value = formattedSchedule
    } catch (err) {
        error.value = 'Error fetching schedule'
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
    if (!instructor.id || !selectedDate.value) {
        return
    }

    dailyScheduleLoaded.value = false

    try {
        // Fetch both availability and booked events
        
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${instructor.id}/daily/${selectedDate.value}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/dailyEvents/${instructor.id}/${selectedDate.value}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
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
        dailyScheduleLoaded.value = true
    } catch (err) {
        error.value = 'Error fetching daily schedule'
        dailyScheduleLoaded.value = false
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

// Watch for changes to selected date
watch(selectedDate, () => {
    fetchDailySchedule()
    fetchDailyBookings()
})

// Fetch data on component mount
onMounted(() => {
    fetchWeeklySchedule()
    fetchDailySchedule()
    fetchDailyBookings()
})

watch(() => instructor, async (newInstructor) => {
    if (newInstructor) {
        await fetchWeeklySchedule()
    }
}, { immediate: true })

const isInstructorOrAdmin = computed(() => {
    return userStore.isInstructor || userStore.isAdmin
})

const fetchDailyBookings = async () => {
    if (!instructor.id || !selectedDate.value) {
        dailyBookings.value = []
        return
    }

    const bookingDate = selectedDate.value

    try {
        const response = await fetch(`/api/calendar/dailyEvents/${instructor.id}/${bookingDate}`, {
            headers: { 'Authorization': `Bearer ${userStore.token}` }
        })

        if (!response.ok) { 
            throw new Error('Failed to fetch daily bookings')
        }

        const events = await response.json()
        dailyBookings.value = events.map(event => (formatSlot(event, new Date(selectedDate.value))))
    } catch (error) {
        console.error('Error fetching daily bookings:', error)
        dailyBookings.value = []
    }
}

</script>

<style scoped>
.view-controls {
    margin-bottom: var(--spacing-lg);
}

.week-navigation {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.week-display {
    font-size: var(--font-size-lg);
    color: var(--text-primary);
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

.schedule-view {
    margin-top: var(--spacing-lg);
}

@media (max-width: 768px) {
    .week-navigation {
        flex-direction: column;
        gap: var(--spacing-sm);
    }
}
</style> 