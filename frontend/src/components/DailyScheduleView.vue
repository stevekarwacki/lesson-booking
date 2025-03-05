<template>
    <div class="daily-schedule">
        <div class="schedule-header">
            {{ selectedDay }}
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
                    :key="timeSlot.time"
                    class="time-slot"
                    :class="{ 'available': isTimeAvailable(timeSlot.time) }"
                    @click="handleTimeSlotClick(timeSlot)"
                >
                    <span class="slot-time">{{ formatSlotTime(timeSlot.time) }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatHour, formatSlotTime, generateTimeSlots, isTimeSlotAvailable } from '../utils/timeFormatting'

const props = defineProps({
    availableSlots: {
        type: Array,
        required: true
    },
    selectedDay: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['slot-selected'])

const timeRange = computed(() => {
    return Array.from({ length: 13 }, (_, i) => i + 7)
})

const timeSlots = computed(() => {
    return generateTimeSlots()
})

const isTimeAvailable = (slotTime) => {
    return isTimeSlotAvailable(slotTime, props.availableSlots)
}

const handleTimeSlotClick = (timeSlot) => {
    if (isTimeAvailable(timeSlot.time)) {
        emit('slot-selected', timeSlot)
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
    background-color: var(--error-color);
    opacity: 0.3;
    cursor: not-allowed;
    padding: 0;
    position: relative;
    transition: all 0.2s ease;
}

.time-slot.available {
    background-color: var(--success-color);
    opacity: 0.5;
    cursor: pointer;
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