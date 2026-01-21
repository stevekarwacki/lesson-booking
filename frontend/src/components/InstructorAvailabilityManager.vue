<template>
    <div class="availability-manager">
        <!-- Weekly Schedule Section -->
        <div class="schedule-section card">
            <h3>Weekly Schedule</h3>
            <InstructorAvailabilityView 
                v-model:weeklySchedule="weeklySchedule"
                :blocked-times="blockedTimes"
                @save="handleSaveWeeklySchedule"
            />
        </div>

        <!-- Blocked Times Section -->
        <div class="blocked-times-section card">
            <h3>Block Out Time</h3>
            <p class="timezone-note">
                Enter times in your local timezone ({{ timezoneStore.timezoneDisplayName }}). 
                They will be stored correctly in UTC.
            </p>
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
                <Button type="submit">Add Blocked Time</Button>
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
                    <Button 
                        @click="removeBlockedTime(block.id)" 
                        variant="destructive"
                        size="sm"
                    >
                        Remove
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useTimezoneStore } from '../stores/timezoneStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useAvailability } from '../composables/useAvailability'
import InstructorAvailabilityView from './InstructorAvailabilityView.vue'
import { Button } from '@/components/ui/button'

const userStore = useUserStore()
const timezoneStore = useTimezoneStore()
const { showSuccess, showError } = useFormFeedback()
const loading = ref(false)

const props = defineProps({
    instructorId: {
        type: String,
        required: true
    }
})

// Date range for blocked times query (next 3 months)
const blockedStartDate = computed(() => {
    const date = new Date()
    return date.toISOString()
})
const blockedEndDate = computed(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + 3)
    return date.toISOString()
})

// Initialize availability composable
const {
    weeklyAvailability,
    isLoadingWeeklyAvailability,
    saveWeeklyAvailability,
    isSavingWeeklyAvailability,
    blockedSlots,
    isLoadingBlockedSlots,
    createBlockedSlot,
    isCreatingBlockedSlot,
    deleteBlockedSlot,
    isDeletingBlockedSlot,
} = useAvailability(props.instructorId, null, blockedStartDate, blockedEndDate)

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

// Watch for weekly availability changes
watch(weeklyAvailability, (newAvailability) => {
    if (newAvailability) {
        // Reset schedule
        for (let i = 0; i < 7; i++) {
            weeklySchedule.value[i] = []
        }
        
        // Group slots by day
        newAvailability.forEach(slot => {
            weeklySchedule.value[slot.day_of_week].push({
                startSlot: slot.start_slot,
                duration: slot.duration
            })
        })
    }
})

// Watch for blocked slots changes
// Note: Blocked times feature is currently disabled due to incomplete backend implementation
watch(blockedSlots, (newBlockedSlots) => {
    if (newBlockedSlots) {
        blockedTimes.value = newBlockedSlots
    }
}, { immediate: true })

const formatDateTime = (datetime) => {
    // Convert datetime to user's timezone for display
    const date = new Date(datetime)
          return date.toLocaleString(undefined, {
        timeZone: timezoneStore.userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: timezoneStore.use12HourFormat
    })
}

const handleSaveWeeklySchedule = async () => {
    try {
        loading.value = true;
        
        const slots = [];
        
        // Convert weeklySchedule format to new timezone-aware format
        Object.entries(weeklySchedule.value).forEach(([dayOfWeek, daySlots]) => {
            if (!daySlots.length) return;
            
            // Sort slots by start time
            daySlots.sort((a, b) => a.startSlot - b.startSlot);
            
            // Convert slots to time ranges
            let currentStartSlot = daySlots[0].startSlot;
            let currentEndSlot = daySlots[0].startSlot + daySlots[0].duration;
            
            // Combine consecutive slots
            for (let i = 1; i < daySlots.length; i++) {
                const slot = daySlots[i];
                if (currentEndSlot === slot.startSlot) {
                    // Slots are consecutive, extend end time
                    currentEndSlot = slot.startSlot + slot.duration;
                } else {
                    // Gap between slots, save current range and start new
                    const startTime = slotToLocalTime(currentStartSlot);
                    const endTime = slotToLocalTime(currentEndSlot);
                    
                    slots.push({
                        dayOfWeek: parseInt(dayOfWeek),
                        startTime: startTime,
                        endTime: endTime
                    });
                    
                    currentStartSlot = slot.startSlot;
                    currentEndSlot = slot.startSlot + slot.duration;
                }
            }
            
            // Push the last range
            const startTime = slotToLocalTime(currentStartSlot);
            const endTime = slotToLocalTime(currentEndSlot);
            
            slots.push({
                dayOfWeek: parseInt(dayOfWeek),
                startTime: startTime,
                endTime: endTime
            });
        });

        await saveWeeklyAvailability({ 
            slots,
            instructorTimezone: timezoneStore.userTimezone
        })
        
        showSuccess('Schedule saved successfully');
    } catch (err) {
        showError('Error saving schedule: ' + err.message);
        console.error('Error saving schedule:', err);
    } finally {
        loading.value = false;
    }
};

// Helper function to convert slot to local time
const slotToLocalTime = (slot) => {
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const addBlockedTime = async () => {
    try {
        // Convert local datetime-local input to UTC for storage
        const startDateTime = newBlockedTime.value.startDateTime
        const endDateTime = newBlockedTime.value.endDateTime
        
        // Create Date objects from the datetime-local input (which is in local timezone)
        const startDate = new Date(startDateTime)
        const endDate = new Date(endDateTime)
        
        // Convert to ISO strings (UTC) for sending to server
        const utcStartDateTime = startDate.toISOString()
        const utcEndDateTime = endDate.toISOString()
        
        await createBlockedSlot({
            startDateTime: utcStartDateTime,
            endDateTime: utcEndDateTime,
            reason: newBlockedTime.value.reason
        })
        
        showSuccess('Blocked time added successfully');
        newBlockedTime.value = { startDateTime: '', endDateTime: '', reason: '' };
        
        // Increment counter to force re-render of InstructorAvailabilityView
        scheduleUpdateCounter.value++;
    } catch (err) {
        showError('Failed to add blocked time');
        console.error(err);
    }
};

const removeBlockedTime = async (blockId) => {
    try {
        await deleteBlockedSlot(blockId)
        
        showSuccess('Blocked time removed successfully');
        
        // Increment counter to force re-render of InstructorAvailabilityView
        scheduleUpdateCounter.value++;
    } catch (err) {
        showError('Failed to remove blocked time');
        console.error(err);
    }
};

const resetAndFetch = async () => {
    // Reset all local state
    for (let i = 0; i < 7; i++) {
        weeklySchedule.value[i] = []
    }
    blockedTimes.value = []
    
    // Data will be refetched automatically by Vue Query
}

defineExpose({ resetAndFetch })

// No need for onMounted - watch handles initialization
</script>

<style scoped>
.availability-manager {
    padding: 0;
    max-width: 100%;
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
    background-color: var(--calendar-blocked);
    color: var(--calendar-text-dark);
    border: 1px solid #dc3545;
}

.no-blocks {
    color: var(--text-muted);
    text-align: center;
    padding: var(--spacing-md);
}

.timezone-note {
    background: #f8f9fa;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--primary-color);
    margin-bottom: var(--spacing-md);
    font-size: 0.875rem;
    color: var(--text-muted);
}
</style> 