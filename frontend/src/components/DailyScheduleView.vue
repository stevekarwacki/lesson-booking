<template>
    <div class="daily-schedule">
        <div class="schedule-header">
            {{ selectedDay.formattedDate }}
        </div>
        <div class="schedule-body">
            <div 
                v-for="[timeSlotKey, timeSlot] of Object.entries(props.dailySchedule)" 
                :key="timeSlotKey"
                class="time-row"
            >
                <div class="time-label">{{ formatTime(slotToTime(timeSlotKey)) }}</div>
            
                <button  
                    :key="timeSlotKey"
                    class="time-slot"
                    :class="{
                        'available': (timeSlot.type === 'available'),
                        'past': isPastTimeSlot(selectedDay.date, timeSlot),
                        'booked': (timeSlot.type === 'booked')
                    }"
                    @click="handleTimeSlotClick(timeSlot)"
                >
                    <span class="slot-time">{{ formatTime(slotToTime(timeSlot.start_slot)) }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { formatTime, timeToSlot, slotToTime, isPastTimeSlot } from '../utils/timeFormatting'

const props = defineProps({
    dailySchedule: {
        type: Object,
        required: true
    },
    selectedDay: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['slot-selected'])

const handleTimeSlotClick = (timeSlot) => {
    if (timeSlot.type === 'available') {
        emit('slot-selected', {
            date: props.selectedDay.date,
            startSlot: timeSlot.start_slot,
            duration: 2
        })
    }
}
</script>

<style scoped>
.daily-schedule {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: white;
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

.schedule-body {
    overflow: hidden;
}

.time-row {
    display: grid;
    grid-template-columns: 10% 90%;
}

.time-column {
    width: 80px;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

.time-label {
    height: calc(600px / 13);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 0.8em;
    color: var(--text-light);
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