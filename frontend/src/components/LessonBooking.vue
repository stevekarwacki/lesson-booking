<template>
    <div class="lesson-booking card">
        <!-- Instructor selection -->
        <div class="form-group" v-if="instructors.length > 1">
            <label for="instructor-select">Select Instructor:</label>
            <select 
                id="instructor-select"
                v-model="selectedInstructorId"
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

        <div v-else-if="instructors.length === 1" class="instructor-info">
            <h3>Booking with {{ instructors[0].name }}</h3>
        </div>

        <!-- Date selection -->
        <div class="view-controls" v-if="effectiveInstructorId">
            <div>Viewing <strong>{{ instructors[0].name }}'s</strong> weekly schedule or <label for="date-select">select a specific date:</label></div>

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
        <div v-if="effectiveInstructorId && !selectedDate" class="schedule-view">
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
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { currentUser } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'
import DailyScheduleView from './DailyScheduleView.vue'

const instructors = ref([])
const selectedInstructorId = ref('')
const selectedDate = ref('')
const dailyAvailability = ref([])
const weeklySchedule = ref({})
const blockedTimes = ref([])
const error = ref('')

// Get effective instructor ID (selected or only instructor)
const effectiveInstructorId = computed(() => {
    if (instructors.value.length === 1) {
        return instructors.value[0].id
    }
    return selectedInstructorId.value
})

// Get today's date in YYYY-MM-DD format
const today = computed(() => {
    const date = new Date()
    return date.toISOString().split('T')[0]
})

const formatTime = (time) => {
    return time.substring(0, 5) // Format HH:MM from HH:MM:SS
}

const handleInstructorChange = () => {
    selectedDate.value = ''
    dailyAvailability.value = []
    fetchWeeklySchedule()
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

// Fetch instructors
const fetchInstructors = async () => {
    try {
        const response = await fetch('/api/instructors', {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch instructors')
        
        instructors.value = await response.json()
        
        if (instructors.value.length === 1) {
            selectedInstructorId.value = instructors.value[0].id
            fetchWeeklySchedule()
        }
    } catch (err) {
        error.value = 'Error fetching instructors'
        console.error(err)
    }
}

// Fetch weekly schedule
const fetchWeeklySchedule = async () => {
    if (!effectiveInstructorId.value) return

    try {
        const response = await fetch(`/api/availability/${effectiveInstructorId.value}/weekly`, {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch weekly schedule')
        
        const data = await response.json()
        weeklySchedule.value = formatWeeklySchedule(data)
        
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
            `/api/availability/${effectiveInstructorId.value}/blocked?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
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
    if (!effectiveInstructorId.value || !selectedDate.value) return

    try {
        const response = await fetch(
            `/api/availability/${effectiveInstructorId.value}/daily/${selectedDate.value}`,
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

onMounted(fetchInstructors)
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
</style> 