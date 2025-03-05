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
                            'blocked': isTimeBlocked(day.value, timeSlot.value),
                            'current-day': isCurrentDay(index),
                            'past': isPastTimeSlot(index, timeSlot.value)
                        }"
                        @click="handleCellClick(day.value, timeSlot.value)"
                    >
                        <div 
                            v-if="getBlockedReason(day.value, timeSlot.value)"
                            class="blocked-indicator"
                            :title="getBlockedReason(day.value, timeSlot.value)"
                        >
                            Blocked
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatSlotTime, generateTimeSlots, isSameDay, getStartOfDay, isTimeSlotAvailable } from '../utils/timeFormatting'

const props = defineProps({
    weeklySchedule: {
        type: Object,
        required: true
    },
    weekStartDate: {
        type: Date,
        required: true
    },
    blockedTimes: {
        type: Array,
        default: () => []
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
    return isTimeSlotAvailable(timeStr, props.weeklySchedule, dayOfWeek)
}

const isTimeBlocked = (dayOfWeek, timeStr) => {
    if (!isTimeAvailable(dayOfWeek, timeStr)) return false
    return !!getBlockedReason(dayOfWeek, timeStr)
}

const getBlockedReason = (dayOfWeek, timeStr) => {
    const today = new Date()
    const targetDate = new Date()
    const daysToAdd = (dayOfWeek - today.getDay() + 7) % 7
    targetDate.setDate(today.getDate() + daysToAdd)
    
    const [hour, minute] = timeStr.split(':').map(Number)
    targetDate.setHours(hour, minute, 0, 0)

    const blocked = props.blockedTimes.find(block => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)
        return targetDate >= blockStart && targetDate < blockEnd
    })

    return blocked?.reason
}

const handleCellClick = (dayValue, timeStr) => {
    // Prevent clicks on past time slots
    if (isPastTimeSlot(daysOfWeek.findIndex(d => d.value === dayValue), timeStr)) {
        return
    }
    
    if (isTimeAvailable(dayValue, timeStr) && !isTimeBlocked(dayValue, timeStr)) {
        emit('slot-selected', {
            dayOfWeek: dayValue,
            time: timeStr,
            formatted: `${timeSlots.value.find(slot => slot.value === timeStr).label} on ${daysOfWeek.find(day => day.value === dayValue).label}`
        })
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
        const [hours, minutes] = timeStr.split(':').map(Number)
        const slotTime = new Date()
        slotTime.setHours(hours, minutes, 0, 0)
        
        return slotTime < now
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