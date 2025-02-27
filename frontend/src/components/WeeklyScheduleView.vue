<template>
    <div class="weekly-schedule">
        <div class="schedule-header">
            <div class="empty-corner"></div>
            <div 
                v-for="day in daysOfWeek" 
                :key="day.value"
                class="day-header"
            >
                {{ day.label }}
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
                        v-for="day in daysOfWeek" 
                        :key="day.value"
                        class="schedule-cell"
                        :class="{
                            'available': isTimeAvailable(day.value, timeSlot.value),
                            'unavailable': !isTimeAvailable(day.value, timeSlot.value),
                            'blocked': isTimeBlocked(day.value, timeSlot.value)
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

const props = defineProps({
    weeklySchedule: {
        type: Object,
        required: true
    },
    blockedTimes: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['slot-selected'])

const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
]

const timeSlots = computed(() => {
    const slots = []
    // Generate time slots from 7 AM to 7 PM in 30-minute increments
    for (let hour = 7; hour <= 19; hour++) {
        for (let minute of [0, 30]) {
            // Skip 7:30 PM
            if (hour === 19 && minute === 30) continue;
            
            const period = hour >= 12 ? 'PM' : 'AM'
            let displayHour = hour > 12 ? hour - 12 : hour
            if (displayHour === 0) displayHour = 12
            
            slots.push({
                value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                label: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
            })
        }
    }
    return slots
})

const isTimeAvailable = (dayOfWeek, timeStr) => {
    const daySchedule = props.weeklySchedule[dayOfWeek]
    if (!daySchedule || !daySchedule.isAvailable) {
        return false
    }

    const [hour, minute] = timeStr.split(':').map(Number)
    const timeInMinutes = hour * 60 + minute
    
    // Check main availability
    const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number)
    const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number)
    const startInMinutes = startHour * 60 + startMinute
    const endInMinutes = endHour * 60 + endMinute

    if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
        return true
    }

    // Check additional ranges
    return daySchedule.ranges.some(range => {
        const [rangeStartHour, rangeStartMinute] = range.startTime.split(':').map(Number)
        const [rangeEndHour, rangeEndMinute] = range.endTime.split(':').map(Number)
        const rangeStartInMinutes = rangeStartHour * 60 + rangeStartMinute
        const rangeEndInMinutes = rangeEndHour * 60 + rangeEndMinute
        
        return timeInMinutes >= rangeStartInMinutes && timeInMinutes < rangeEndInMinutes
    })
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

const handleCellClick = (dayOfWeek, timeStr) => {
    if (isTimeAvailable(dayOfWeek, timeStr) && !isTimeBlocked(dayOfWeek, timeStr)) {
        emit('slot-selected', {
            dayOfWeek,
            time: timeStr,
            formatted: `${timeSlots.value.find(slot => slot.value === timeStr).label} on ${daysOfWeek.find(day => day.value === dayOfWeek).label}`
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
    padding: 10px;
    text-align: center;
    font-weight: bold;
    background: var(--background-light);
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
    opacity: 0.7;
}

.blocked-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.8em;
    color: var(--text-dark);
}
</style> 