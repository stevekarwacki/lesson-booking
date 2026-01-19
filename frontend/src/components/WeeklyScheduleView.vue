<template>
    <div class="weekly-schedule">
        <!-- Column-based layout (new approach) -->
        <div v-if="useColumnLayout" class="weekly-schedule-columns">
            <div class="time-labels-column">
                <div class="empty-corner"></div>
                <div 
                    v-for="timeSlot in timeLabels" 
                    :key="timeSlot"
                    class="time-label"
                >
                    {{ formatTime(slotToTime(timeSlot)) }}
                </div>
            </div>
            
            <DailyScheduleColumn
                v-for="(dayColumn, index) in weeklyColumns"
                :key="index"
                :slots="dayColumn.slots"
                :date="dayColumn.date"
                :day-name="dayColumn.dayName"
                :show-header="true"
                :show-time-labels="false"
                :is-instructor="userStore.canManageCalendar || userStore.canManageUsers"
                :selected-slot="selectedSlot"
                :original-slot="originalSlot"
                @slot-selected="handleSlotSelected"
            />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime, slotToTime } from '../utils/timeFormatting'
import { transformWeeklySchedule, getScheduleTimeRange, generateTimeLabels } from '../utils/scheduleTransform'
import { useUserStore } from '../stores/userStore'
import { useAppSettings } from '../composables/useAppSettings'
import DailyScheduleColumn from './DailyScheduleColumn.vue'

const userStore = useUserStore()
const { earliestOpenTime, latestCloseTime } = useAppSettings()

const props = defineProps({
    weeklySchedule: {
        type: Object,
        required: true
    },
    blockedTimes: {
        type: Array,
        default: () => []
    },
    weekStartDate: {
        type: Date,
        required: true
    },
    useColumnLayout: {
        type: Boolean,
        default: true  // Default to new layout, can be overridden for testing
    },
    selectedSlot: {
        type: Object,
        default: null
    },
    originalSlot: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['slot-selected'])

// Column-based layout computed properties
const weeklyColumns = computed(() => {
    if (!props.useColumnLayout) return []
    
    // Use business hours range to ensure alignment with time labels
    const startHour = earliestOpenTime.value || 6
    const endHour = latestCloseTime.value || 20
    const startSlot = startHour * 4
    const endSlot = endHour * 4
    
    return transformWeeklySchedule(props.weeklySchedule, props.weekStartDate, startSlot, endSlot)
})

const timeLabels = computed(() => {
    if (!props.useColumnLayout) return []
    
    // Use business hours instead of schedule data range to ensure consistent grid alignment
    const startHour = earliestOpenTime.value || 6
    const endHour = latestCloseTime.value || 20
    const startSlot = startHour * 4  // Convert hours to slots (4 slots per hour)
    const endSlot = endHour * 4
    
    // Fall back to schedule data range if business hours aren't available
    if (startSlot === 24 && endSlot === 80) {  // Check if still using defaults
        const timeRange = getScheduleTimeRange(props.weeklySchedule)
        if (timeRange) {
            return generateTimeLabels(timeRange.minSlot, timeRange.maxSlot, 2)
        }
    }
    
    return generateTimeLabels(startSlot, endSlot, 2) // 30-minute intervals
})

// Event handlers
const handleSlotSelected = (slotData) => {
    // Handler for new column-based layout
    emit('slot-selected', slotData)
}
</script>

<style scoped>
.weekly-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

/* New column-based layout styles */
.weekly-schedule-columns {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
    height: 100%;
}

.time-labels-column {
    display: flex;
    flex-direction: column;
    background: var(--background-light);
    border-right: 1px solid var(--border-color);
}

.time-labels-column .empty-corner {
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
    text-align: center;
    font-weight: 500;
    font-size: var(--font-size-sm);
    height: 50px;
}

.time-labels-column .time-label {
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

.weekly-schedule-columns :deep(.daily-schedule-column) {
    border-left: 1px solid var(--border-color);
}

.weekly-schedule-columns :deep(.daily-schedule-column:first-of-type) {
    border-left: none;
}

/* Original row-based layout styles (kept for fallback) */

.schedule-header {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
    border-bottom: 1px solid var(--border-color);
}

.empty-corner {
    border-right: 1px solid var(--border-color);
}

.day-header {
    text-align: center;
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
    font-weight: 500;
}

.day-name {
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-xs);
}

.day-date {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.time-slots {
    display: grid;
}

.time-row {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
}

.time-label {
    padding: var(--spacing-sm);
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    border-right: 1px solid var(--border-color);
}

.slot-time {
    display: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
}

.time-slot:hover .slot-time {
    display: block;
}

.blocked-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
}

.current-day::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 102, 255, 0.1); /* Semi-transparent blue */
    pointer-events: none; /* Ensures clicks go through to the cell */
}

.day-header.current-day {
    position: relative;
}

.time-slot {
    position: relative; /* Needed for absolute positioning of the overlay */
}

.past-day {
    color: var(--text-muted);
}

.time-slot.past {
    opacity: 0.6;
    cursor: not-allowed;
}

.time-slot.past .blocked-indicator {
    display: none;
}

/* Ensure the current-day overlay appears above the past styling */
.time-slot.past.current-day::after {
    z-index: 1;
}

@media (max-width: 768px) {
    .schedule-header {
        grid-template-columns: 60px repeat(7, 1fr);
    }

    .day-name {
        font-size: var(--font-size-sm);
    }

    .day-date {
        font-size: var(--font-size-xs);
    }
}
</style> 