<template>
    <div class="daily-schedule">
        <div class="schedule-header">
            {{ selectedDay.formattedDate }}
        </div>
        
        <div class="daily-schedule-grid">
            <div class="time-labels-column">
                <div 
                    v-for="timeSlot in timeLabels" 
                    :key="timeSlot"
                    class="time-label"
                >
                    {{ formatTime(slotToTime(timeSlot)) }}
                </div>
            </div>
            
            <DailyScheduleColumn
                :slots="dailySlots"
                :date="selectedDay.date"
                :day-name="selectedDay.formattedDate"
                :show-header="false"
                :show-time-labels="false"
                :is-instructor="userStore.canManageCalendar || userStore.canManageUsers"
                :is-rescheduling="isRescheduling"
                :layout="'daily'"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime, slotToTime } from '../utils/timeFormatting'
import { transformDailySchedule, getScheduleTimeRange, generateTimeLabels } from '../utils/scheduleTransform'
import { useUserStore } from '../stores/userStore'
import DailyScheduleColumn from './DailyScheduleColumn.vue'

const userStore = useUserStore()

const props = defineProps({
    dailySchedule: {
        type: Object,
        required: true
    },
    selectedDay: {
        type: Object,
        required: true
    },
    isRescheduling: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['slot-selected'])

// Transform daily schedule data for DailyScheduleColumn component
const dailySlots = computed(() => {
    return transformDailySchedule(props.dailySchedule, props.selectedDay.date)
})

// Generate time labels for the daily view
const timeLabels = computed(() => {
    const timeRange = getScheduleTimeRange(props.dailySchedule)
    if (!timeRange) return []
    
    return generateTimeLabels(timeRange.minSlot, timeRange.maxSlot, 2) // 30-minute intervals
})

// Event handler for slot selection
const handleSlotSelected = (slotData) => {
    emit('slot-selected', slotData)
}
</script>

<style scoped>
.daily-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.daily-schedule-grid {
    display: grid;
    grid-template-columns: 120px 1fr;
    height: 100%;
}

.time-labels-column {
    display: flex;
    flex-direction: column;
    background: var(--background-light);
    border-right: 1px solid var(--border-color);
}

.schedule-header {
    padding: var(--spacing-md);
    font-weight: 500;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
}

.time-label {
    padding: var(--spacing-xs) var(--spacing-sm);
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    box-sizing: border-box;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .daily-schedule-grid {
        grid-template-columns: 100px 1fr;
    }
    
    .schedule-header {
        font-size: var(--font-size-base);
    }

    .time-label {
        font-size: var(--font-size-xs);
        padding: var(--spacing-xs) var(--spacing-xs);
    }
}
</style> 