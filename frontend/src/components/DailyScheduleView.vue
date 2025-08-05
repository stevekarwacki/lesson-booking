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
                    'booked': (timeSlot.type === 'booked'),
                    'own-booking': (timeSlot.type === 'booked' && timeSlot.isOwnBooking),
                    'google-calendar': (timeSlot.is_google_calendar),
                    'multi-slot-booking': timeSlot.isMultiSlot && !timeSlot.is_google_calendar,
                    'first-slot': timeSlot.isMultiSlot && !timeSlot.is_google_calendar && timeSlot.slotPosition === 0,
                    'middle-slot': timeSlot.isMultiSlot && !timeSlot.is_google_calendar && timeSlot.slotPosition > 0 && timeSlot.slotPosition < timeSlot.totalSlots - 1,
                    'last-slot': timeSlot.isMultiSlot && !timeSlot.is_google_calendar && timeSlot.slotPosition === timeSlot.totalSlots - 1,
                    'sixty-minute': timeSlot.isMultiSlot && !timeSlot.is_google_calendar && timeSlot.totalSlots === 2
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
                        
                        <!-- Duration indicator for 60-minute lessons -->
                        <div v-if="timeSlot.isMultiSlot && !timeSlot.is_google_calendar && timeSlot.slotPosition === 0" class="duration-indicator">
                            {{ timeSlot.totalSlots * 30 }}min
                        </div>
                        
                        <div v-if="isInstructorOrAdmin" class="tooltip">
                            <div class="tooltip-title">Booking Details</div>
                            <div class="tooltip-content">
                                <p v-if="timeSlot.isMultiSlot && !timeSlot.is_google_calendar">Duration: {{ timeSlot.totalSlots * 30 }} minutes</p>
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
    background-color: var(--calendar-unavailable);
    cursor: not-allowed;
}

.time-slot.available {
    background-color: var(--calendar-available);
    cursor: pointer;
}

.time-slot.booked {
    background-color: var( --calendar-booked);
    cursor: pointer;
}

.time-slot.booked.own-booking {
    background-color: var(--calendar-booked-self);
}

.time-slot.google-calendar {
    background-color: var(--calendar-blocked);
    background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(255, 255, 255, 0.3) 4px,
        rgba(255, 255, 255, 0.3) 8px
    );
    border-left: 4px solid #dc3545;
    color: white;
}

.time-slot.blocked {
    background-color: var(--calendar-blocked);
    background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(255, 255, 255, 0.3) 4px,
        rgba(255, 255, 255, 0.3) 8px
    );
    color: white;
}

.time-slot.past {
    background-color: var(--calendar-past);
    cursor: not-allowed;
}

.time-slot:hover {
    filter: brightness(0.9);
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
    top: -8px;
    right: -8px;
    transform: translateY(-100%);
    background: var(--background-light);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    z-index: 1000;
    min-width: 200px;
    font-size: var(--font-size-sm);
    border: 1px solid var(--border-color);
    pointer-events: none;
}

.booked-slot-content {
    z-index: 1;
}

/* Ensure tooltip stays visible when cursor moves to it */
.tooltip:hover {
    display: block;
    pointer-events: auto;
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

/* Multi-slot booking styles for 60-minute lessons */
.time-slot.multi-slot-booking {
    position: relative;
}

.time-slot.sixty-minute.first-slot {
    border-bottom: 0;
}

.time-slot.sixty-minute.last-slot {
    border-top: 0; /* Overlap border */
}

.duration-indicator {
    position: absolute;
    top: 2px;
    right: 4px;
    background: rgba(255, 255, 255, 0.9);
    color: var(--primary-color);
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    line-height: 1;
    z-index: 2;
}

/* Enhanced visual connection for 60-minute bookings */
.time-slot.sixty-minute.booked {
    background-color: var( --calendar-booked);
}

.time-slot.sixty-minute.first-slot.booked {
    background-color: var( --calendar-booked);
}

.time-slot.sixty-minute.last-slot.booked {
    background-color: var( --calendar-booked);
}

@media (max-width: 768px) {
    .schedule-header {
        font-size: var(--font-size-base);
    }

    .time-label {
        font-size: var(--font-size-xs);
    }
    
    .duration-indicator {
        font-size: var(--font-size-xs);
        padding: 1px 2px;
    }
}
</style> 