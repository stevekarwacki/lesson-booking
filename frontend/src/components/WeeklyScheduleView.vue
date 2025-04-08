<template>
    <div class="weekly-schedule">
        <div class="schedule-header">
            <div class="empty-corner"></div>
            <div 
                v-for="(day, index) in daysOfWeek" 
                :key="day.value"
                class="day-header"
                :class="{ 
                    'current-day': isCurrentDay(day.date),
                    'past-day': isPastDay(day.date)
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
                        v-for="(day) in daysOfWeek" 
                        :key="day.value"
                        class="time-slot"
                        :class="{
                            'available': isTimeAvailable(day.value, timeSlot.value),
                            /* 'blocked': isTimeBlocked(day.value, timeSlot.value), */
                            'current-day': isCurrentDay(day.date),
                            'past': isPastTimeSlot(day.date, timeSlot.value),
                            'booked': isBooked(day.value, timeSlot.value)
                        }"
                        @click="handleTimeSlotClick({
                            date: day.date,
                            time: timeSlot.value,
                            dayOfWeek: day.value
                        })"
                    >
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { timeToSlot, isSlotBooked, isSlotAvailable, formatSlotTime, generateTimeSlots, isCurrentDay, isPastDay, isPastTimeSlot } from '../utils/timeFormatting'

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

const daysOfWeek = computed(() => {
    const days = [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' }
    ]

    const startDate = new Date(props.weekStartDate)
    days.forEach((day, index) => {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + index)
        day.date = date
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

const isBooked = (dayOfWeek, timeStr) => {
    const events = props.weeklySchedule[dayOfWeek].slots
    return isSlotBooked(timeStr, events)
}

const isTimeAvailable = (dayOfWeek, timeStr) => {
    const events = props.weeklySchedule[dayOfWeek].slots
    return isSlotAvailable(timeStr, events)
}

const handleTimeSlotClick = (cellData) => {
    const { date, time, dayOfWeek } = cellData
    
    // Prevent clicks on past time slots
    if (isPastTimeSlot(date, time)) {
        return
    }
    
    if (isTimeAvailable(dayOfWeek, time)) {
        emit('slot-selected', {
            date,
            startSlot: timeToSlot(time),
            duration: 2, // 30 minutes
            formatted: `${time} on ${daysOfWeek.value.find(day => day.value === dayOfWeek).label}`
        })
    }
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

.time-slot {
    border-bottom: 1px solid var(--border-color);
    border-right: 1px solid var(--border-color);
    min-height: 40px;
    position: relative;
    transition: all 0.2s ease;
    background-color: var(--error-color);
    opacity: 0.3;
    cursor: not-allowed;
}

.time-slot.available {
    background-color: var(--success-color);
    opacity: 0.5;
    cursor: pointer;
}

.time-slot.booked {
    background-color: var(--blue-color);
    opacity: 0.5;
    cursor: pointer;
}

.time-slot.blocked {
    background-color: var(--warning-color);
    opacity: 0.5;
}

.time-slot:hover {
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

.time-slot {
    position: relative; /* Needed for absolute positioning of the overlay */
}

/* Remove the previous current-day background styles */
.time-slot.current-day {
    opacity: 0.7;
}

.time-slot.current-day.available {
    opacity: 0.7;
}

.time-slot.current-day.blocked {
    opacity: 0.7;
}

.past-day {
    color: var(--text-muted);
}

.time-slot.past {
    opacity: 0.1;
    cursor: not-allowed;
}

.time-slot.past.current-day.available {
    opacity: 0.3;
}

.time-slot.past .blocked-indicator {
    display: none;
}

/* Ensure the current-day overlay appears above the past styling */
.time-slot.past.current-day::after {
    z-index: 1;
}
</style> 