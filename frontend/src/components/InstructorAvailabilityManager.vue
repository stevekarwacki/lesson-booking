<template>
    <div class="availability-manager">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <!-- Weekly Schedule Section -->
        <div class="schedule-section card">
            <h3>Weekly Schedule</h3>
            <InstructorAvailabilityView 
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
import { ref, onMounted } from 'vue'
import { currentUser } from '../stores/userStore'
import InstructorAvailabilityView from './InstructorAvailabilityView.vue'

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
    0: [], // Sunday
    1: [], // Monday
    2: [], // Tuesday
    3: [], // Wednesday
    4: [], // Thursday
    5: [], // Friday
    6: []  // Saturday
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

const loadSchedule = async () => {
    try {
        const response = await fetch(`/api/availability/${props.instructorId}/weekly`)
        if (!response.ok) throw new Error('Failed to fetch schedule')
        
        const slots = await response.json()
        
        // Reset schedule
        for (let i = 0; i < 7; i++) {
            weeklySchedule.value[i] = []
        }
        
        // Group slots by day
        slots.forEach(slot => {
            weeklySchedule.value[slot.day_of_week].push({
                startSlot: slot.start_slot,
                duration: slot.duration
            })
        })
    } catch (error) {
        console.error('Error loading schedule:', error)
    }
}

const saveWeeklySchedule = async () => {
    try {
        const slots = []
        
        // Convert weeklySchedule format to array of slots
        Object.entries(weeklySchedule.value).forEach(([dayOfWeek, daySlots]) => {
            if (!daySlots.length) return
            
            // Sort slots by start time
            daySlots.sort((a, b) => a.startSlot - b.startSlot)
            
            let currentSlot = {
                dayOfWeek: parseInt(dayOfWeek),
                startSlot: daySlots[0].startSlot,
                duration: daySlots[0].duration
            }
            
            // Combine consecutive slots
            for (let i = 1; i < daySlots.length; i++) {
                const slot = daySlots[i]
                if (currentSlot.startSlot + currentSlot.duration === slot.startSlot) {
                    // Slots are consecutive, extend duration
                    currentSlot.duration += slot.duration
                } else {
                    // Gap between slots, save current and start new
                    slots.push(currentSlot)
                    currentSlot = {
                        dayOfWeek: parseInt(dayOfWeek),
                        startSlot: slot.startSlot,
                        duration: slot.duration
                    }
                }
            }
            // Push the last slot
            slots.push(currentSlot)
        })

        const response = await fetch(`/api/availability/${props.instructorId}/weekly`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slots })
        })

        if (!response.ok) throw new Error('Failed to save schedule')
    } catch (error) {
        console.error('Error saving schedule:', error)
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
        // await fetchBlockedTimes()
        
        // Increment counter to force re-render of InstructorAvailabilityView
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
        // await fetchBlockedTimes()
        
        // Increment counter to force re-render of InstructorAvailabilityView
        scheduleUpdateCounter.value++
    } catch (err) {
        error.value = 'Failed to remove blocked time'
        console.error(err)
    }
}

const resetAndFetch = async () => {
    // Reset all local state
    for (let i = 0; i < 7; i++) {
        weeklySchedule.value[i] = []
    }
    blockedTimes.value = []
    
    // Fetch fresh data
    await loadSchedule()
    // await fetchBlockedTimes()
}

defineExpose({ resetAndFetch })

onMounted(async () => {
    await loadSchedule()
    // await fetchBlockedTimes()
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