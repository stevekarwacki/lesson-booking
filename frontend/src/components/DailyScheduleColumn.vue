<template>
  <div class="daily-schedule-column">
    <!-- Optional day header for weekly view -->
    <div v-if="showHeader" class="day-header" :class="{ 
      'current-day': isCurrentDay(date),
      'past-day': isPastDay(date)
    }">
      <div class="day-name">{{ dayName }}</div>
      <div class="day-date">{{ formattedDate }}</div>
    </div>
    
    <!-- Time slots container -->
    <div class="time-slots-container">
      <div 
        v-for="slot in visibleSlots" 
        :key="`slot-${slot.startSlot}`"
        class="time-slot"
        :class="getSlotClasses(slot)"
        @click="handleSlotClick(slot)"
      >
        <!-- Time label (shown when showTimeLabels is true or for available/unavailable slots) -->
        <span class="slot-time" :class="{ 'always-visible': slot.isOwnBooking}">
          {{ formatTime(slotToTime(slot.startSlot)) }}
        </span>

        <!-- Booked slot content -->
        <div v-if="slot.type === 'booked'" 
          class="booked-slot-content"
          :class="{ 'show-details': props.isInstructor }"
        >
          <span v-if="props.isInstructor" class="student-name">
            <span class="student-name-text">{{ slot.student?.name }}</span>
          </span>
          
          <!-- Tooltip for instructors -->
          <div v-if="props.isInstructor" class="tooltip">
            <div class="tooltip-title">Booking Details</div>
            <div class="tooltip-content">
              <p v-if="slot.isMultiSlot && !slot.is_google_calendar">
                Duration: {{ slot.totalSlots * 30 }} minutes
              </p>
              <p>Time: {{ formatTime(slotToTime(slot.startSlot)) }} - {{ formatTime(slotToTime(Math.min(slot.startSlot + slot.duration, MAX_SLOT_INDEX))) }}</p>
              <p>Student: {{ slot.student?.name }}</p>
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

const MAX_SLOT_INDEX = 95; // 0-95 slots per day

const props = defineProps({
  // Data
  slots: {
    type: Array,
    required: true,
    default: () => []
  },
  date: {
    type: Date,
    required: true
  },
  
  // Display options
  showHeader: {
    type: Boolean,
    default: false
  },
  showTimeLabels: {
    type: Boolean,
    default: false
  },
  dayName: {
    type: String,
    default: ''
  },
  
  // Interaction
  isInstructor: {
    type: Boolean,
    default: false
  },
  isRescheduling: {
    type: Boolean,
    default: false
  },
  
  // Selection state
  selectedSlot: {
    type: Object,
    default: null
  },
  
  // Original slot being rescheduled (shows as unselectable)
  originalSlot: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['slot-selected'])

// Computed properties
const formattedDate = computed(() => {
  return props.date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric'
  })
})

const visibleSlots = computed(() => {
  if (!props.slots || props.slots.length === 0) {
    return []
  }
  
  // Sort slots by start_slot to ensure proper order
  return [...props.slots].sort((a, b) => a.startSlot - b.startSlot)
})

// Methods
const isSlotSelected = (slot) => {
  if (!props.selectedSlot) return false
  
  // Check if this slot matches the selected slot
  // Compare by date and startSlot
  const selectedDate = props.selectedSlot.date
  const slotDate = props.date
  
  // Compare dates (handle both Date objects and ISO strings)
  const selectedDateStr = selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate
  const slotDateStr = slotDate instanceof Date ? slotDate.toISOString().split('T')[0] : slotDate
  
  // Check if dates match
  if (selectedDateStr !== slotDateStr) return false
  
  // Check if this slot is within the selected duration range
  const selectedStartSlot = props.selectedSlot.startSlot
  const selectedDuration = props.selectedSlot.duration || 2
  const selectedEndSlot = selectedStartSlot + selectedDuration
  
  return slot.startSlot >= selectedStartSlot && slot.startSlot < selectedEndSlot
}

const isOriginalSlot = (slot) => {
  if (!props.originalSlot) return false
  
  // Check if this slot matches the original slot being rescheduled
  const originalDate = props.originalSlot.date
  const slotDate = props.date
  
  // Compare dates (handle both Date objects and ISO strings)
  const originalDateStr = originalDate instanceof Date ? originalDate.toISOString().split('T')[0] : originalDate
  const slotDateStr = slotDate instanceof Date ? slotDate.toISOString().split('T')[0] : slotDate
  
  // Check if dates match
  if (originalDateStr !== slotDateStr) return false
  
  // Check if this slot is within the original booking's duration range
  const originalStartSlot = props.originalSlot.start_slot
  const originalDuration = props.originalSlot.duration || 2
  const originalEndSlot = originalStartSlot + originalDuration
  
  return slot.startSlot >= originalStartSlot && slot.startSlot < originalEndSlot
}

const getSlotClasses = (slot) => {
  return {
    'available': slot.type === 'available',
    'current-day': isCurrentDay(props.date),
    'past': isPastTimeSlot(slot.startSlot, props.date.toISOString()),
    'booked': slot.type === 'booked',
    'own-booking': slot.type === 'booked' && slot.isOwnBooking,
    'rescheduling': slot.type === 'rescheduling',
    'google-calendar': slot.is_google_calendar,
    'multi-slot-booking': slot.isMultiSlot && !slot.is_google_calendar,
    'first-slot': slot.isMultiSlot && !slot.is_google_calendar && slot.slotPosition === 0,
    'last-slot': slot.isMultiSlot && !slot.is_google_calendar && slot.slotPosition === slot.totalSlots - 1,
    'sixty-minute': slot.isMultiSlot && !slot.is_google_calendar && slot.totalSlots === 2,
    'instructor-view-available': slot.type === 'available' && props.isInstructor && !props.isRescheduling,
    'instructor-view-booked': slot.type === 'booked' && props.isInstructor,
    'selected': isSlotSelected(slot),
    'original-slot': isOriginalSlot(slot) && slot.type !== 'rescheduling' // Don't apply to rescheduling slots
  }
}

const handleSlotClick = (slot) => {
  // Prevent clicks on past time slots
  if (isPastTimeSlot(slot.startSlot, props.date.toISOString())) {
    return
  }
  
  // Allow clicks on rescheduling slots, prevent clicks on other original slots
  if (slot.type === 'rescheduling') {
    // Always allow rescheduling slots to be clicked
  } else if (isOriginalSlot(slot)) {
    // Prevent clicks on original slots that aren't rescheduling type
    return
  }
  
  // Emit slot-selected for both available and booked slots
  // The parent component (InstructorCalendar) will handle the logic
  if (slot.type === 'available') {
    // In rescheduling mode, always allow selection of available slots
    // In normal instructor view, prevent selection (unless rescheduling)
    if (props.isRescheduling || !props.isInstructor) {
      emit('slot-selected', {
        date: props.date,
        startSlot: slot.startSlot,
        duration: props.isRescheduling && props.originalSlot ? props.originalSlot.duration : 2, // Use original duration when rescheduling
        type: 'available'
      })
    }
  } else if (slot.type === 'booked') {
    emit('slot-selected', {
      ...slot,
      date: props.date,
      type: 'booked'
    })
  } else if (slot.type === 'rescheduling') {
    // Allow selection of rescheduling slots (current booking being moved)
    emit('slot-selected', {
      date: props.date,
      startSlot: slot.startSlot,
      duration: props.originalSlot ? props.originalSlot.duration : 2, // Use original duration
      type: 'available' // Emit as available so parent handles it correctly
    })
  }
}
</script>

<style scoped>
.daily-schedule-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100%;
  min-width: 0;
}

.day-header {
  text-align: center;
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
  font-weight: 500;
  background: var(--background-light);
  height: 50px;
}

.day-name {
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-xs);
}

.day-date {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.day-header.current-day {
  background: rgba(0, 102, 255, 0.1);
}

.day-header.past-day {
  color: var(--text-muted);
}

.time-slots-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.time-slot {
  border-bottom: 1px solid var(--border-color);
  min-height: 40px;
  position: relative;
  transition: all 0.2s ease;
  background-color: var(--calendar-unavailable);
  cursor: not-allowed;
  padding: var(--spacing-xs);
  box-sizing: border-box;
  text-align: center;
}

.time-slot.available {
  background-color: var(--calendar-available);
  cursor: pointer;
}

.time-slot.booked {
  background-color: var(--calendar-booked);
}

.time-slot.booked.own-booking,
.time-slot.instructor-view-booked {
  background-color: var(--calendar-booked-self);
  cursor: pointer;
}

.time-slot.rescheduling {
  background-color: var(--calendar-rescheduling-original);
  cursor: pointer;
  border: 2px solid var(--calendar-rescheduling-original);
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
  opacity: 0.6;
  cursor: not-allowed;
}

.time-slot:hover {
  filter: brightness(1.1);
}

.time-slot.selected {
  background-color: var(--calendar-rescheduling-selected);
  color: white;
}

.time-slot.original-slot {
  background-color: var(--calendar-booked, #e3f2fd);
  cursor: not-allowed;
  opacity: 0.7;
}

.slot-time {
  font-size: var(--font-size-sm);
  vertical-align: middle;
  color: var(--text-primary);
  display: none;
}

.slot-time.always-visible {
  display: inline-block;
}

.booked-slot-content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.student-name {
  overflow: hidden;
}

.student-name-text {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  white-space: nowrap;
}

.tooltip {
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
  display: none;
  border: 1px solid var(--border-color);
  pointer-events: none;
}

.time-slot:hover .tooltip {
  display: block;
}

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

/* Multi-slot booking styles */
.time-slot.multi-slot-booking {
  position: relative;
}

.time-slot.sixty-minute.first-slot {
  border-bottom: 0;
}

.time-slot.sixty-minute.last-slot {
  border-top: 0;
}
</style>