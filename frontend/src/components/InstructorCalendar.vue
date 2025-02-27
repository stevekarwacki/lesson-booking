<template>
    <!-- Date selection -->
    <div class="view-controls" v-if="props.instructor">
        <div>Viewing <strong>{{ props.instructor.name }}'s</strong> weekly schedule or <label for="date-select">select a specific date:</label></div>

        <input 
            type="date" 
            id="date-select"
            v-model="selectedDate"
            :min="today"
            @change="handleDateChange"
        >
        
        <button 
            v-if="selectedDate" 
            class="btn btn-secondary"
            @click="clearSelectedDate"
        >
            Back to Weekly View
        </button>
    </div>

    <!-- Weekly Schedule View -->
    <div v-if="props.instructor && !selectedDate" class="schedule-view">
        <WeeklyScheduleView 
            :weeklySchedule="weeklySchedule"
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
import { ref, computed, onMounted, watch } from 'vue'
import { currentUser } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'

const props = defineProps({
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

// Get today's date in YYYY-MM-DD format
const today = computed(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
})

const formatTime = (time) => {
    return time.substring(0, 5) // Format HH:MM from HH:MM:SS
}

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
    if (!props.instructor) return

    try {
        const response = await fetch(`/api/availability/${props.instructor.id}/weekly`, {
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
            `/api/availability/${props.instructor.id}/blocked?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
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

// Format weekly schedule data
const formatWeeklySchedule = (data) => {
    const schedule = {
        0: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        1: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        2: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        3: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        4: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        5: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        6: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }
    }

    data.forEach(slot => {
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

    return schedule
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
    if (!props.instructor || !selectedDate.value) return

    try {
        const response = await fetch(
            `/api/availability/${props.instructor.id}/daily/${selectedDate.value}`,
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
    if (weeklyScheduleData.value && weeklyScheduleData.value.length > 0) {
        return formatWeeklySchedule(weeklyScheduleData.value)
    }

    // Return default empty schedule structure
    return {
        0: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        1: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        2: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        3: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        4: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        5: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] },
        6: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }
    }
})

watch(() => props.instructor, async (newInstructor) => {
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

.props.instructor-info {
    margin-bottom: 20px;
}

.props.instructor-info h3 {
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
</style> 