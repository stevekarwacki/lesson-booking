<template v-if="instructor">

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
            :blocked-times="blockedTimes"
            @slot-selected="handleSlotSelected"
        />
    </div>

    <!-- Daily Schedule View -->
    <div v-if="selectedDate && dailySchedule.length > 0" class="schedule-view">
        <DailyScheduleView 
            :available-slots="dailySchedule"
            :selected-day="selectedDay"
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
import { currentUser } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'
import { getStartOfDay } from '../utils/timeFormatting'
import BookingModal from './BookingModal.vue'

const { instructor } = defineProps({
    instructor: {
        type: Object,
        required: true
    }
})

const selectedDate = ref('')
const weeklyScheduleData = ref([])
const dailyScheduleData = ref([])
const blockedTimes = ref([])
const error = ref('')

// Week selection state
const selectedWeek = ref(new Date())

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
        fetchDailyScheduleData()
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
        fetchDailyScheduleData()
    } else {
        fetchWeeklySchedule()
    }
}

const clearSelectedDate = () => {
    selectedDate.value = ''
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
        for (let i = 0; i < 7; i++) {
            const slotDate = new Date(`${selectedWeek.value}T00:00:00`)
            slotDate.setDate(slotDate.getDate() + i)
            formattedSchedule[i] = {
                date: slotDate, // Store date as YYYY-MM-DD
                slots: []
            }
        }

        // Add available slots
        availabilityData.forEach(slot => {
            const dayIndex = slot.day_of_week
            formattedSchedule[dayIndex].slots.push({
                start_slot: slot.start_slot,
                duration: slot.duration
            })
        })

        // Remove booked slots
        bookedEvents.forEach(event => {
            const eventDate = new Date(event.date)
            const dayIndex = eventDate.getDay() + 1
            const eventEnd = event.start_slot + event.duration
            
            // For each day's slots, check for overlaps and split as needed
            formattedSchedule[dayIndex].slots = formattedSchedule[dayIndex].slots.flatMap(slot => {
                const slotEnd = slot.start_slot + slot.duration

                // No overlap - keep slot as is
                if (slotEnd <= event.start_slot || slot.start_slot >= eventEnd) {
                    return [slot]
                }

                // Split the slot if needed
                const blocks = []
                
                // Add first block if there's space before the event
                if (slot.start_slot < event.start_slot) {
                    blocks.push({
                        start_slot: slot.start_slot,
                        duration: event.start_slot - slot.start_slot
                    })
                }

                // Add second block if there's space after the event
                if (slotEnd > eventEnd) {
                    blocks.push({
                        start_slot: eventEnd,
                        duration: slotEnd - eventEnd
                    })
                }

                return blocks
            })
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

const fetchDailyScheduleData = async () => {
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

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        // Start with available slots
        let availableSlots = availabilityData.map(slot => ({
            start_slot: slot.start_slot,
            duration: slot.duration
        }))

        // Split slots around booked events
        bookedEvents.forEach(event => {
            const eventEnd = event.start_slot + event.duration
            
            availableSlots = availableSlots.flatMap(slot => {
                const slotEnd = slot.start_slot + slot.duration

                // No overlap - keep slot as is
                if (slotEnd <= event.start_slot || slot.start_slot >= eventEnd) {
                    return [slot]
                }

                // Split the slot if needed
                const blocks = []
                
                // Add first block if there's space before the event
                if (slot.start_slot < event.start_slot) {
                    blocks.push({
                        start_slot: slot.start_slot,
                        duration: event.start_slot - slot.start_slot
                    })
                }

                // Add second block if there's space after the event
                if (slotEnd > eventEnd) {
                    blocks.push({
                        start_slot: eventEnd,
                        duration: slotEnd - eventEnd
                    })
                }

                return blocks
            })
        })

        dailyScheduleData.value = availableSlots
    } catch (err) {
        error.value = 'Error fetching daily schedule'
        console.error('Fetch error:', err)
    }
}

const weeklySchedule = computed(() => {
    // Initialize empty schedule
    let schedule = {
        0: { slots: [] },
        1: { slots: [] },
        2: { slots: [] },
        3: { slots: [] },
        4: { slots: [] },
        5: { slots: [] },
        6: { slots: [] }
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
})

watch(() => instructor, async (newInstructor) => {
    if (newInstructor) {
        await fetchWeeklySchedule()
    }
}, { immediate: true })
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
</style> 