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
        />
    </div>

    <!-- Daily Schedule View -->
    <div v-if="selectedDate && formattedAvailability.length > 0" class="schedule-view">
        <DailyScheduleView 
            :available-slots="formattedAvailability"
            :selected-day="selectedDay"
            @slot-selected="handleSlotSelected"
        />
    </div>

    <div v-else-if="selectedDate && formattedAvailability.length === 0" class="no-availability">
        <p>No available time slots for this date.</p>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { currentUser } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'
import { formatTime, getStartOfDay } from '../utils/timeFormatting'

const { instructor } = defineProps({
    instructor: {
        type: Object,
        required: true
    }
})

const selectedDate = ref('')
const weeklyScheduleData = ref([])
const dailyAvailability = ref([])
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
        fetchDailyAvailability()
    }
}

const handleSlotSelected = (slot) => {
    console.log('Selected slot:', slot)
    // We'll implement booking functionality here later
}

const clearSelectedDate = () => {
    selectedDate.value = ''
}

// Fetch weekly schedule
const fetchWeeklySchedule = async () => {
    if (!instructor.id) return

    try {
        const response = await fetch(`/api/availability/${instructor.id}/weekly`, {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch weekly schedule')
        
        weeklyScheduleData.value = await response.json()
        
        // Also fetch blocked times
        await fetchBlockedTimes()
    } catch (err) {
        error.value = 'Error fetching weekly schedule'
        console.error(err)
    }
}

// Fetch blocked times
const fetchBlockedTimes = async () => {
    try {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)

        const response = await fetch(
            `/api/availability/${instructor.id}/blocked?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
            {
                headers: {
                    'user-id': currentUser.value.id
                }
            }
        )
        if (!response.ok) throw new Error('Failed to fetch blocked times')
        blockedTimes.value = await response.json()
    } catch (err) {
        error.value = 'Failed to load blocked times'
        console.error(err)
    }
}

const formattedAvailability = computed(() => {
    return dailyAvailability.value.map(slot => ({
        startTime: formatTime(slot.start_time),
        endTime: formatTime(slot.end_time),
        id: `${slot.start_time}-${slot.end_time}`
    }))
})

const selectedDay = computed(() => {
    if (!selectedDate.value) return ''
    const date = new Date(`${selectedDate.value}T00:00:00`)
    return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric' 
    })
})

const fetchDailyAvailability = async () => {
    if (!instructor.id || !selectedDate.value) return

    try {
        const response = await fetch(
            `/api/availability/${instructor.id}/daily/${selectedDate.value}`,
            {
                headers: {
                    'user-id': currentUser.value.id
                }
            }
        )
        if (!response.ok) throw new Error('Failed to fetch daily availability')
        
        dailyAvailability.value = await response.json()
    } catch (err) {
        error.value = 'Error fetching daily availability'
        console.error(err)
    }
}

const weeklySchedule = computed(() => {
    const schedule = {
        0: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        1: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        2: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        3: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        4: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        5: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        6: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }
    }

    if (weeklyScheduleData.value && weeklyScheduleData.value.length > 0) {
        weeklyScheduleData.value.forEach(slot => {
            const day = schedule[slot.day_of_week]
            if (!day.isAvailable) {
                day.isAvailable = true
                day.startTime = formatTime(slot.start_time)
                day.endTime = formatTime(slot.end_time)
            } else {
                day.ranges.push({
                    startTime: formatTime(slot.start_time),
                    endTime: formatTime(slot.end_time)
                })
            }
        })
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