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
                    <span v-if="timeSlot.type !== 'booked' || !isInstructorOrAdmin" class="slot-time">{{ formatTime(slotToTime(timeSlot.start_slot)) }}</span>
                    
                    <div v-if="timeSlot.type === 'booked'" 
                        class="booked-slot-content"
                        :class="{ 'show-details': isInstructorOrAdmin }"
                    >
                        <span v-if="isInstructorOrAdmin" class="student-name">
                            {{ timeSlot.student?.name }}
                        </span>
                        <div v-if="isInstructorOrAdmin" class="tooltip">
                            <div class="tooltip-title">Booking Details</div>
                            <div class="tooltip-content">
                                <p>Time: {{ formatTime(slotToTime(timeSlot.start_slot)) }} - {{ formatTime(slotToTime(timeSlot.start_slot + timeSlot.duration)) }}</p>
                                <p>Student: {{ timeSlot.student?.name }}</p>
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { formatTime, slotToTime, isPastTimeSlot } from '../utils/timeFormatting'

const props = defineProps({
    dailySchedule: {
        type: Object,
        required: true
    },
    selectedDay: {
        type: Object,
        required: true
    },
    isInstructorOrAdmin: {
        type: Boolean,
        default: false
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

.booked-slot-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    font-size: 0.7rem;
    color: var(--text-primary);
    white-space: nowrap;
    text-overflow: ellipsis;
}

.booked-slot-content.show-details {
    position: relative;
}

.booked-slot-content.show-details:hover .tooltip {
    display: block;
}

.tooltip {
    display: none;
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 8px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 200px;
    font-size: 0.9rem;
    margin-top: 4px;
}

.tooltip-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.tooltip-content {
    color: var(--text-secondary);
}

.tooltip-content p {
    margin: 4px 0;
}
</style> 