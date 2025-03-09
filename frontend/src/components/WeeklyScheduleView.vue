<template>
    <div class="weekly-schedule">
        <div class="schedule-header">
            <div class="empty-corner"></div>
            <div 
                v-for="(day, index) in daysOfWeek" 
                :key="day.value"
                class="day-header"
                :class="{ 
                    'current-day': isCurrentDay(index),
                    'past-day': isPastDay(index)
                }"
            >
                <div class="day-name">{{ day.label }}</div>
                <div class="day-date">{{ formatDayDate(index) }}</div>
            </div>
        </div>

        <div class="schedule-body">
            <div class="time-slots">
                <div 
                    v-for="timeSlot in timeSlots" 
                    :key="timeSlot.value"
                    class="time-row"
                >
                    <div class="time-label">{{ timeSlot.label }}</div>
                    <div 
                        v-for="(day, index) in daysOfWeek" 
                        :key="day.value"
                        class="schedule-cell"
                        :class="{
                            'available': isTimeAvailable(day.value, timeSlot.value),
                            'unavailable': !isTimeAvailable(day.value, timeSlot.value),
                            /* 'blocked': isTimeBlocked(day.value, timeSlot.value), */
                            'current-day': isCurrentDay(index),
                            'past': isPastTimeSlot(index, timeSlot.value)
                        }"
                        @click="handleCellClick(day.value, timeSlot.value)"
                    >
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatSlotTime, generateTimeSlots, isSameDay, getStartOfDay } from '../utils/timeFormatting'
import { slotToTime, timeToSlot, isSlotAvailable } from '../utils/slotHelpers'

const props = defineProps({
    weeklySchedule: {
        type: Object,
        required: true
    },
    blockedTimes: {
        type: Array,
        default: () => []
    },
    isInstructor: {
        type: Boolean,
        default: false
    },
    weekStartDate: {
        type: Date,
        required: true
    }
})

const emit = defineEmits(['slot-selected'])

const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
]

const eventsByDay = computed(() => {
    const days = {}
    daysOfWeek.forEach((_, index) => {
        days[index] = []
    })

    // weeklySchedule contains days with slots arrays
    Object.entries(props.weeklySchedule).forEach(([dayIndex, dayData]) => {
        if (!dayData?.slots?.length) return
        
        dayData.slots.forEach(slot => {
            days[dayIndex].push({
                startTime: slotToTime(slot.start_slot),
                endTime: slotToTime(slot.start_slot + slot.duration),
                start_slot: slot.start_slot,
                duration: slot.duration
            })
        })
    })

    return days
})

const formatDayDate = (dayIndex) => {
    const date = new Date(props.weekStartDate)
    date.setDate(date.getDate() + dayIndex)
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    })
}

const timeSlots = computed(() => {
    // Use generateTimeSlots but transform the output for our needs
    return generateTimeSlots().map(slot => ({
        value: slot.time,
        label: formatSlotTime(slot.time)
    }))
})

const isTimeAvailable = (dayOfWeek, timeStr) => {
    const events = eventsByDay.value[dayOfWeek]
    return isSlotAvailable(timeStr, events)
}

const handleCellClick = (dayValue, timeSlot) => {
    // Prevent clicks on past time slots
    if (isPastTimeSlot(daysOfWeek.findIndex(d => d.value === dayValue), timeSlot)) {
        return
    }
    
    if (isTimeAvailable(dayValue, timeSlot)) {
        emit('slot-selected', {
            dayOfWeek: dayValue,
            startSlot: timeToSlot(timeSlot),
            duration: 2, // 30 minutes
            formatted: `${timeSlot} on ${daysOfWeek.find(day => day.value === dayValue).label}`
        })
    } else {
        console.log('nope')
    }
}

const isCurrentDay = (dayIndex) => {
    const today = new Date()
    const dayDate = new Date(props.weekStartDate)
    dayDate.setDate(dayDate.getDate() + dayIndex)
    return isSameDay(today, dayDate)
}

const isPastDay = (dayIndex) => {
    const today = getStartOfDay(new Date())
    const dayDate = getStartOfDay(new Date(props.weekStartDate))
    dayDate.setDate(dayDate.getDate() + dayIndex)
    return dayDate < today
}

const isPastTimeSlot = (dayIndex, timeStr) => {
    if (isPastDay(dayIndex)) return true
    
    if (isCurrentDay(dayIndex)) {
        const now = new Date()
        const timeSlot = timeToSlot(timeStr)
        const currentSlot = timeToSlot(`${now.getUTCHours()}:${now.getUTCMinutes()}`)

        return timeSlot > currentSlot
    }
    
    return false
}
</script>

<style scoped>
.weekly-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: white;
}

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
    font-size: 1rem;
    margin-bottom: 0.25rem;
}

.day-date {
    font-size: 0.875rem;
    color: var(--text-muted);
}

.schedule-body {
    overflow-x: auto;
}

.time-slots {
    display: grid;
}

.time-row {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
}

.time-label {
    padding: 10px;
    text-align: right;
    font-size: 0.8em;
    color: var(--text-light);
    border-right: 1px solid var(--border-color);
}

.schedule-cell {
    border-bottom: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    min-height: 40px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
}

.schedule-cell.available {
    background-color: var(--success-color);
    opacity: 0.5;
}

.schedule-cell.unavailable {
    background-color: var(--error-color);
    opacity: 0.3;
    cursor: not-allowed;
}

.schedule-cell.blocked {
    background-color: var(--warning-color);
    opacity: 0.5;
    cursor: not-allowed;
}

.schedule-cell:hover {
    opacity: 0.9 !important;
}

.blocked-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.8em;
    color: var(--text-dark);
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

.schedule-cell {
    position: relative; /* Needed for absolute positioning of the overlay */
}

/* Remove the previous current-day background styles */
.schedule-cell.current-day {
    opacity: 0.7;
}

.schedule-cell.current-day.available {
    opacity: 0.7;
}

.schedule-cell.current-day.blocked {
    opacity: 0.7;
}

.past-day {
    color: var(--text-muted);
}

.schedule-cell.past {
    opacity: 0.1;
    cursor: not-allowed;
}

.schedule-cell.past.current-day.available {
    opacity: 0.3;
}

.schedule-cell.past .blocked-indicator {
    display: none;
}

/* Ensure the current-day overlay appears above the past styling */
.schedule-cell.past.current-day::after {
    z-index: 1;
}
</style> 