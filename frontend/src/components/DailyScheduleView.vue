<template>
    <div class="daily-schedule">
        <div class="schedule-header">
            {{ selectedDay.formattedDate }}
        </div>
        <div class="schedule-grid">
            <div class="time-column">
                <div 
                    v-for="hour in timeRange" 
                    :key="hour"
                    class="time-cell"
                >
                    {{ formatHour(hour) }}
                </div>
            </div>
            <div class="slots-column">
                <button 
                    v-for="timeSlot in timeSlots" 
                    :key="timeSlot.value"
                    class="time-slot"
                    :class="{
                        'available': isTimeAvailable(timeSlot.value),
                        'past': isPastTimeSlot(selectedDay.date, timeSlot.value),
                        'booked': isBooked(timeSlot.value)
                    }"
                    @click="handleTimeSlotClick(timeSlot)"
                >
                    <span class="slot-time">{{ timeSlot.label }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { timeToSlot, isSlotBooked, isSlotAvailable, formatHour, formatSlotTime, generateTimeSlots, isPastTimeSlot } from '../utils/timeFormatting'

const props = defineProps({
    dailySchedule: {
        type: Array,
        required: true
    },
    selectedDay: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['slot-selected'])

const timeRange = computed(() => {
    return Array.from({ length: 13 }, (_, i) => i + 7)
})

const timeSlots = computed(() => {
    return generateTimeSlots().map(slot => ({
        value: slot.time,
        label: formatSlotTime(slot.time)
    }))
})

const isBooked = (timeStr) => {
    return isSlotBooked(timeStr, props.dailySchedule)
}

const isTimeAvailable = (timeStr) => {
    return isSlotAvailable(timeStr, props.dailySchedule)
}

const handleTimeSlotClick = (timeSlot) => {
    if (isTimeAvailable(timeSlot.value)) {
        emit('slot-selected', {
            date: props.selectedDay.date,
            startSlot: timeToSlot(timeSlot.value),
            duration: 2,
            formatted: `${timeSlot.value} on ${props.selectedDay.formattedDate}`
        })
    }
}
</script>

<style scoped>
.daily-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: white;
    height: 600px;
    display: flex;
    flex-direction: column;
}

.schedule-header {
    padding: 10px;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
    background: var(--background-light);
    font-weight: bold;
}

.schedule-grid {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.time-column {
    width: 80px;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

.time-cell {
    height: calc(600px / 13);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 0.8em;
    color: var(--text-light);
}

.slots-column {
    flex: 1;
    display: grid;
    grid-template-rows: repeat(24, 1fr);
}

.time-slot {
    border: none;
    border-bottom: 1px solid var(--border-color);
    padding: 0;
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

.time-slot.past {
    opacity: 0.1;
    cursor: not-allowed;
}

.time-slot:hover {
    opacity: 0.7;
}

.time-slot.available:active {
    opacity: 0.8;
    transform: scale(0.99);
}

.slot-time {
    display: none;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 0.8em;
    color: var(--text-dark);
}

.time-slot:hover .slot-time {
    display: block;
}
</style> 