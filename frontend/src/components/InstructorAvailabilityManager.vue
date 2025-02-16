<template>
    <div class="availability-manager">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <!-- Weekly Schedule Section -->
        <div class="schedule-section card">
            <h3>Weekly Schedule</h3>
            <WeeklyScheduleView 
                v-model:weeklySchedule="weeklySchedule"
                :blocked-times="blockedTimes"
                @save="saveWeeklySchedule"
            />
        </div>

        <!-- Blocked Times Section -->
        <div class="blocked-times-section card">
            <h3>Block Out Time</h3>
            <form @submit.prevent="addBlockedTime" class="blocked-time-form">
                <div class="form-group">
                    <label for="block-start">Start</label>
                    <input 
                        id="block-start"
                        type="datetime-local"
                        v-model="newBlockedTime.startDateTime"
                        required
                    >
                </div>
                <div class="form-group">
                    <label for="block-end">End</label>
                    <input 
                        id="block-end"
                        type="datetime-local"
                        v-model="newBlockedTime.endDateTime"
                        required
                    >
                </div>
                <div class="form-group">
                    <label for="block-reason">Reason</label>
                    <input 
                        id="block-reason"
                        type="text"
                        v-model="newBlockedTime.reason"
                        placeholder="e.g., Vacation, Personal Day"
                    >
                </div>
                <button type="submit" class="btn btn-primary">Add Blocked Time</button>
            </form>

            <!-- Existing Blocked Times -->
            <div class="blocked-times-list">
                <h4>Current Blocked Times</h4>
                <div v-if="blockedTimes.length === 0" class="no-blocks">
                    No blocked time periods set
                </div>
                <div v-else v-for="block in blockedTimes" :key="block.id" class="blocked-time-item">
                    <div class="block-details">
                        <span class="block-date">
                            {{ formatDateTime(block.start_datetime) }} - 
                            {{ formatDateTime(block.end_datetime) }}
                        </span>
                        <span class="block-reason" v-if="block.reason">
                            ({{ block.reason }})
                        </span>
                    </div>
                    <button 
                        @click="removeBlockedTime(block.id)" 
                        class="btn btn-danger btn-sm"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { currentUser } from '../stores/userStore'
import WeeklyScheduleView from './WeeklyScheduleView.vue'

const props = defineProps({
    instructorId: {
        type: String,
        required: true
    }
})

const error = ref('')
const success = ref('')

// Weekly Schedule
const weeklySchedule = ref({
    0: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Sunday
    1: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Monday
    2: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Tuesday
    3: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Wednesday
    4: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Thursday
    5: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Friday
    6: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }  // Saturday
})

// Blocked Times
const blockedTimes = ref([])
const newBlockedTime = ref({
    startDateTime: '',
    endDateTime: '',
    reason: ''
})

// Add a counter to force re-render
const scheduleUpdateCounter = ref(0)

const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString()
}

const fetchWeeklySchedule = async () => {
    try {
        const response = await fetch(`/api/availability/${props.instructorId}/weekly`, {
            headers: {
                'user-id': currentUser.value.id,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch schedule');
        }

        const dbSchedule = await response.json();

        const newSchedule = Array(7).fill().map(() => ({
            isAvailable: false,
            startTime: '09:00',
            endTime: '17:00',
            ranges: []
        }));

        const schedulesByDay = dbSchedule.reduce((acc, slot) => {
            if (!acc[slot.day_of_week]) {
                acc[slot.day_of_week] = [];
            }
            acc[slot.day_of_week].push(slot);
            return acc;
        }, {});

        Object.entries(schedulesByDay).forEach(([dayIndex, slots]) => {
            if (slots.length > 0) {
                const day = newSchedule[dayIndex];
                day.isAvailable = true;
                day.startTime = slots[0].start_time;
                day.endTime = slots[0].end_time;
                
                if (slots.length > 1) {
                    day.ranges = slots.slice(1).map(slot => ({
                        startTime: slot.start_time,
                        endTime: slot.end_time
                    }));
                }
            }
        });

        weeklySchedule.value = newSchedule;
    } catch (err) {
        if (err.message !== 'Failed to fetch schedule') {
            error.value = 'Failed to load weekly schedule: ' + err.message;
        }
    }
}

const saveWeeklySchedule = async () => {
    try {
        const schedulesToSave = weeklySchedule.value
            .map((day, index) => ({ day, index }))
            .filter(({ day }) => day.isAvailable)
            .flatMap(({ day, index }) => {
                const ranges = [];
                
                if (day.startTime && day.endTime) {
                    ranges.push({
                        day_of_week: index,
                        start_time: day.startTime,
                        end_time: day.endTime
                    });
                }
                
                if (day.ranges && day.ranges.length > 0) {
                    day.ranges.forEach(range => {
                        ranges.push({
                            day_of_week: index,
                            start_time: range.startTime,
                            end_time: range.endTime
                        });
                    });
                }
                
                return ranges;
            });

        const response = await fetch(`/api/availability/${props.instructorId}/weekly`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
            },
            body: JSON.stringify(schedulesToSave)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save schedule');
        }

        success.value = 'Weekly schedule updated successfully';
        await fetchWeeklySchedule();
    } catch (err) {
        error.value = 'Failed to save weekly schedule: ' + err.message;
    }
}

const fetchBlockedTimes = async () => {
    try {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 3) // Get next 3 months

        const response = await fetch(
            `/api/availability/${props.instructorId}/blocked?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
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

const addBlockedTime = async () => {
    try {
        const response = await fetch(`/api/availability/${props.instructorId}/blocked`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
            },
            body: JSON.stringify(newBlockedTime.value)
        })

        if (!response.ok) throw new Error('Failed to add blocked time')
        
        success.value = 'Blocked time added successfully'
        newBlockedTime.value = { startDateTime: '', endDateTime: '', reason: '' }
        await fetchBlockedTimes()
        
        // Increment counter to force re-render of WeeklyScheduleView
        scheduleUpdateCounter.value++
    } catch (err) {
        error.value = 'Failed to add blocked time'
        console.error(err)
    }
}

const removeBlockedTime = async (blockId) => {
    try {
        const response = await fetch(`/api/availability/blocked/${blockId}`, {
            method: 'DELETE',
            headers: {
                'user-id': currentUser.value.id
            }
        })

        if (!response.ok) throw new Error('Failed to remove blocked time')
        
        success.value = 'Blocked time removed successfully'
        await fetchBlockedTimes()
        
        // Increment counter to force re-render of WeeklyScheduleView
        scheduleUpdateCounter.value++
    } catch (err) {
        error.value = 'Failed to remove blocked time'
        console.error(err)
    }
}

const resetAndFetch = async () => {
    // Reset all local state
    weeklySchedule.value = {
        0: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Sunday
        1: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Monday
        2: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Tuesday
        3: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Wednesday
        4: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Thursday
        5: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }, // Friday
        6: { isAvailable: false, startTime: '09:00', endTime: '17:00', ranges: [] }  // Saturday
    }
    blockedTimes.value = []
    
    // Fetch fresh data
    await fetchWeeklySchedule()
    await fetchBlockedTimes()
}

defineExpose({ resetAndFetch })

onMounted(async () => {
    await fetchWeeklySchedule()
    await fetchBlockedTimes()
})
</script>

<style scoped>
.availability-manager {
    padding: var(--spacing-lg);
    max-width: 1200px;
    margin: 0 auto;
}

.card {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    margin-bottom: var(--spacing-lg);
}

.weekly-schedule {
    display: grid;
    gap: var(--spacing-md);
}

.day-schedule {
    border: 1px solid var(--border-color);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
}

.time-inputs {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
}

.blocked-time-form {
    display: grid;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
}

.blocked-time-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-sm);
}

.duration-inputs {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.duration-input {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.duration-controls {
    display: flex;
    gap: var(--spacing-md);
}

.btn-sm {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.875rem;
}

.btn-danger {
    background-color: var(--error-color);
    color: white;
}

.no-blocks {
    color: var(--text-muted);
    text-align: center;
    padding: var(--spacing-md);
}
</style> 