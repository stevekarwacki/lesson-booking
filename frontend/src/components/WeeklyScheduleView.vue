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
                    v-for="[timeSlotKey, days] of Object.entries(props.weeklySchedule)" 
                    :key="timeSlotKey"
                    class="time-row"
                >
                    <div class="time-label">{{ formatTime(slotToTime(timeSlotKey)) }}</div>
                    <div 
                        v-for="[dayIndex, slot] of Object.entries(days)" 
                        :key="dayIndex"
                        class="time-slot"
                        :class="{
                            'available': (slot.type === 'available'),
                            /* 'blocked': isTimeBlocked(day.value, timeSlot.value), */
                            'current-day': isCurrentDay(slot.date),
                            'past': isPastTimeSlot(slot.date, timeSlotKey),
                            'booked': (slot.type === 'booked')
                        }"
                        @click="handleTimeSlotClick({
                            date: slot.date,
                            time: timeSlotKey,
                            type: slot.type
                        })"
                    >
                        <span v-if="slot.type !== 'booked' || !isInstructorOrAdmin" class="slot-time">{{ formatTime(slotToTime(timeSlotKey)) }}</span>

                        <div v-if="slot.type === 'booked'" 
                            class="booked-slot-content"
                            :class="{ 'show-details': isInstructorOrAdmin }"
                        >
                            <span v-if="isInstructorOrAdmin" class="student-name">
                                {{ slot.student?.name }}
                            </span>
                            <div v-if="isInstructorOrAdmin" class="tooltip">
                                <div class="tooltip-title">Booking Details</div>
                                <div class="tooltip-content">
                                    <p>Time: {{ formatTime(slot.startTime) }} - {{ formatTime(slot.endTime) }}</p>
                                    <p>Student: {{ slot.student?.name }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime, slotToTime, isCurrentDay, isPastDay, isPastTimeSlot } from '../utils/timeFormatting'

const props = defineProps({
    weeklySchedule: {
        type: Object,
        required: true
    },
    blockedTimes: {
        type: Array,
        default: () => []
    },
    isInstructorOrAdmin: {
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

const handleTimeSlotClick = (cellData) => {
    const { date, time, type } = cellData
    
    // Prevent clicks on past time slots
    if (isPastTimeSlot(date, time)) {
        return
    }
    
    if (type === 'available') {
        emit('slot-selected', {
            date,
            startSlot: time,
            duration: 2 // 30 minutes
        })
    }
}
</script>

<style scoped>
.weekly-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
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
    font-size: var(--font-size-base);
    margin-bottom: var(--spacing-xs);
}

.day-date {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
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
    padding: var(--spacing-sm);
    text-align: right;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
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
    background-color: var(--primary-color);
    cursor: pointer;
}

.time-slot.blocked {
    background-color: var(--warning-color);
    opacity: 0.5;
}

.time-slot:hover {
    opacity: 0.9 !important;
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

.booked-slot-content {
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.student-name {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
}

.tooltip {
    position: absolute;
    background: var(--background-light);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    z-index: 1000;
    min-width: 200px;
    font-size: var(--font-size-sm);
    display: none;
}

.booked-slot-content:hover .tooltip {
    display: block;
}

.tooltip-title {
    font-weight: 500;
    margin-bottom: var(--spacing-xs);
    color: var(--text-primary);
}

.tooltip-content {
    color: var(--text-secondary);
}

.tooltip-content p {
    margin: var(--spacing-xs) 0;
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