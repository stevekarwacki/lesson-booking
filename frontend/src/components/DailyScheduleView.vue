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
    background: var(--background-light);
    display: flex;
    flex-direction: column;
}

.schedule-header {
    padding: var(--spacing-sm);
    text-align: center;
    border-bottom: 1px solid var(--border-color);
    background: var(--background-light);
    font-weight: 500;
    font-size: var(--font-size-lg);
    color: var(--text-primary);
}

.schedule-body {
    overflow: hidden;
}

.time-row {
    display: grid;
    grid-template-columns: max-content auto;
}

.time-label {
    height: calc(600px / 13);
    min-width: 85px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
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
    background-color: var(--primary-color);
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
    font-size: var(--font-size-sm);
    color: var(--text-primary);
}

.time-slot:hover .slot-time {
    display: block;
}

.booked-slot-content {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--spacing-xs);
    font-size: var(--font-size-sm);
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
    background: var(--background-light);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    z-index: 1000;
    min-width: 200px;
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-xs);
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
        font-size: var(--font-size-base);
    }

    .time-label {
        font-size: var(--font-size-xs);
    }
}
</style> 