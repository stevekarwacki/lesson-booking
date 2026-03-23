<template>
  <div class="daily-schedule-column">
    <!-- Optional day header for weekly view -->
    <div v-if="showHeader" class="day-header calendar-header-cell" :class="{ 
      'current-day': isCurrentDay(date),
      'past-day': isPastDay(date)
    }">
      <div class="day-name">{{ dayName }}</div>
      <div class="day-date">{{ formattedDate }}</div>
    </div>
    
    <!-- Time blocks container -->
    <div class="time-blocks-container" :class="{ 
      'current-day': isCurrentDay(date),
      'past-day': isPastDay(date)
    }">
      <Card
        v-for="block in visibleBlocks"
        :key="block.id"
        :class="cn('time-block-card', getBlockClasses(block), {
          'show-segments': block.type === 'available' && (hoveredBlockId === block.id || isMobile)
        })"
        :style="{ height: `${block.height}px` }"
        @click="block.type !== 'available' && handleBlockClick(block, $event)"
        @mouseenter="block.type === 'available' && (hoveredBlockId = block.id)"
        @mouseleave="hoveredBlockId = null"
      >
        <CardContent class="block-content">
          <!-- Available blocks: render individual slots -->
          <div v-if="block.type === 'available'" class="available-slots-container">
            <div
              v-for="slot in getAvailableSlots(block)"
              :key="`slot-${slot.startSlot}`"
              class="available-slot"
              @click="handleSlotClick(slot)"
            >
              <div class="slot-time-tooltip">
                {{ slot.startTime }}
              </div>
            </div>
          </div>
          
          <!-- Non-available blocks: show time for booked blocks -->
          <template v-else>
            <span v-if="block.type === 'booked'" class="block-time">
              {{ formatTime(slotToTime(block.startSlot)) }}
            </span>
            
            <!-- Show student name only if not a Google Calendar event, or if user is instructor/admin -->
            <span v-if="block.type === 'booked' && block.data?.student && (!block.data?.is_google_calendar || userRole !== 'student')" class="student-name">
              {{ block.data.student.name }}
            </span>
            
            <!-- Tooltip for instructors -->
            <div v-if="props.isInstructor && block.type === 'booked'" class="tooltip">
              <div class="tooltip-title">Booking Details</div>
              <div class="tooltip-content">
                <p>Duration: {{ block.duration * 15 }} minutes</p>
                <p>Time: {{ getBookingTimeRange(block) }}</p>
                <p v-if="block.data?.student">Student: {{ block.data.student.name }}</p>
              </div>
            </div>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useMq } from 'vue3-mq'
import { formatTime, slotToTime, isCurrentDay, isPastDay, isPastTimeSlot } from '../utils/timeFormatting'
import { getSegmentFromClickPosition } from '../utils/timeBlocks'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const MAX_SLOT_INDEX = 95; // 0-95 slots per day
const $mq = useMq()
const isMobile = computed(() => !$mq.lgPlus)

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
  userRole: {
    type: String,
    default: 'student' // student, instructor, admin
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

// Track hover state for available blocks to show segment lines
const hoveredBlockId = ref(null)

// Computed properties
const formattedDate = computed(() => {
  return props.date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric'
  })
})

const visibleBlocks = computed(() => {
  if (!props.slots || props.slots.length === 0) {
    return []
  }
  
  // Slots are now blocks - already sorted from transform
  return props.slots
})

// Methods
const getBookingTimeRange = (block) => {
  const startTime = formatTime(slotToTime(block.startSlot))
  const endTime = formatTime(slotToTime(Math.min(block.startSlot + block.duration, MAX_SLOT_INDEX)))
  return `${startTime} - ${endTime}`
}

// Get individual slots for available blocks
const getAvailableSlots = (block) => {
  if (block.type !== 'available') return []
  
  const slots = []
  const numSlots = Math.floor(block.duration / 2) // Each slot is 2 x 15min = 30min
  
  for (let i = 0; i < numSlots; i++) {
    const startSlot = block.startSlot + (i * 2)
    const endSlot = startSlot + 2
    slots.push({
      startSlot,
      endSlot,
      startTime: formatTime(slotToTime(startSlot)),
      endTime: formatTime(slotToTime(endSlot))
    })
  }
  
  return slots
}

const isBlockSelected = (block) => {
  if (!props.selectedSlot) return false
  
  // Check if this block overlaps with selected slot
  const selectedDate = props.selectedSlot.date
  const blockDate = props.date
  
  // Compare dates (handle both Date objects and ISO strings)
  const selectedDateStr = selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : selectedDate
  const blockDateStr = blockDate instanceof Date ? blockDate.toISOString().split('T')[0] : blockDate
  
  // Check if dates match
  if (selectedDateStr !== blockDateStr) return false
  
  // Check if block overlaps with selected range
  const selectedStartSlot = props.selectedSlot.startSlot
  const selectedDuration = props.selectedSlot.duration || 2
  const selectedEndSlot = selectedStartSlot + selectedDuration
  
  const blockEndSlot = block.startSlot + block.duration
  
  // Check for overlap
  return block.startSlot < selectedEndSlot && blockEndSlot > selectedStartSlot
}

const isOriginalBlock = (block) => {
  if (!props.originalSlot) return false
  
  // Check if this block matches the original slot being rescheduled
  const originalDate = props.originalSlot.date
  const blockDate = props.date
  
  // Compare dates (handle both Date objects and ISO strings)
  const originalDateStr = originalDate instanceof Date ? originalDate.toISOString().split('T')[0] : originalDate
  const blockDateStr = blockDate instanceof Date ? blockDate.toISOString().split('T')[0] : blockDate
  
  // Check if dates match
  if (originalDateStr !== blockDateStr) return false
  
  // Check if block overlaps with original booking
  const originalStartSlot = props.originalSlot.start_slot
  const originalDuration = props.originalSlot.duration || 2
  const originalEndSlot = originalStartSlot + originalDuration
  
  const blockEndSlot = block.startSlot + block.duration
  
  return block.startSlot < originalEndSlot && blockEndSlot > originalStartSlot
}

const getBlockClasses = (block) => {
  const isStudent = props.userRole === 'student'
  const isGoogleCalendar = block.data?.is_google_calendar
  
  return {
    'available': block.type === 'available',
    'unavailable': block.type === 'unavailable',
    'blocked': block.type === 'blocked',
    'current-day': isCurrentDay(props.date),
    'past': isPastTimeSlot(block.startSlot, props.date.toISOString()),
    'booked': block.type === 'booked',
    'own-booking': block.type === 'booked' && block.data?.isOwnBooking,
    'recurring-booking': block.data?.is_recurring,
    'rescheduling': block.type === 'rescheduling',
    'google-calendar': isGoogleCalendar && !isStudent, // Striped only for instructors/admins
    'google-calendar-student': isGoogleCalendar && isStudent, // Plain red for students
    'instructor-view-available': block.type === 'available' && props.isInstructor && !props.isRescheduling,
    'instructor-view-booked': block.type === 'booked' && props.isInstructor,
    'selected': isBlockSelected(block),
    'original-block': isOriginalBlock(block) && block.type !== 'rescheduling'
  }
}

const handleBlockClick = (block, event) => {
  // Prevent clicks on past time slots
  if (isPastTimeSlot(block.startSlot, props.date.toISOString())) {
    return
  }
  
  // Prevent clicks on recurring subscription bookings
  if (block.data?.is_recurring) {
    return
  }
  
  // Prevent clicks on rescheduling blocks (the original time being rescheduled)
  if (block.type === 'rescheduling') {
    return
  }
  
  // Prevent clicks on other original blocks
  if (isOriginalBlock(block)) {
    return
  }
  
  // For available blocks, calculate which 30-minute segment was clicked
  if (block.type === 'available' && block.segments) {
    const cardElement = event.currentTarget
    const rect = cardElement.getBoundingClientRect()
    const clickY = event.clientY - rect.top // Y position relative to block top
    const segment = getSegmentFromClickPosition(clickY, block.segments)
    
    emit('slot-selected', {
      date: props.date,
      startSlot: segment.startSlot, // Precise 30-minute slot
      duration: props.isRescheduling && props.originalSlot ? props.originalSlot.duration : 2,
      type: 'available'
    })
    return
  }
  
  // For booked blocks, emit the whole block
  if (block.type === 'booked') {
    emit('slot-selected', {
      ...block.data,
      date: props.date,
      startSlot: block.startSlot,
      duration: block.duration,
      type: 'booked'
    })
    return
  }
}

// Handle click on individual slot element
const handleSlotClick = (slot) => {
  // Prevent clicks on past time slots
  if (isPastTimeSlot(slot.startSlot, props.date.toISOString())) {
    return
  }
  
  emit('slot-selected', {
    date: props.date,
    startSlot: slot.startSlot,
    duration: props.isRescheduling && props.originalSlot ? props.originalSlot.duration : 2,
    type: 'available'
  })
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
  font-weight: 500;
  background: var(--background-light);
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

.time-blocks-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Highlight current day's time blocks - same color as header */
.time-blocks-container.current-day {
  background: rgba(0, 102, 255, 0.1);
}

/* Grey background for past days */
.time-blocks-container.past-day:not(.current-day) {
  background: rgba(128, 128, 128, 0.1); /* Light grey */
}

/* Override Card component defaults for calendar blocks */
.time-block-card {
  border-radius: 0;
  transition: all 0.2s ease;
  cursor: pointer;
  margin: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Segment dividers for available blocks - MOBILE-FIRST */
.segment-dividers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.segment-divider {
  position: absolute;
  left: 8%;
  right: 8%;
  height: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

/* Main line with pronounced taper and dual-tone effect */
.segment-divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  top: 0;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(170, 170, 170, 0.15) 3%,
    rgba(170, 170, 170, 0.35) 10%,
    rgba(170, 170, 170, 0.5) 50%,
    rgba(170, 170, 170, 0.35) 90%,
    rgba(170, 170, 170, 0.15) 97%,
    transparent 100%
  );
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
}

/* Highlight glow on top */
.segment-divider::after {
  content: '';
  position: absolute;
  left: 15%;
  right: 15%;
  height: 1px;
  top: -1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 20%,
    rgba(255, 255, 255, 0.8) 50%,
    rgba(255, 255, 255, 0.5) 80%,
    transparent 100%
  );
  filter: blur(0.5px);
}

/* MOBILE: Always show segments on available blocks */
@media (max-width: 768px) {
  .time-block-card.available .segment-divider {
    opacity: 1;
  }
}

/* DESKTOP: Show segments only on hover */
@media (min-width: 769px) {
  .time-block-card.show-segments .segment-divider {
    opacity: 1;
  }
}

/* Override shadcn Card default background - must be specific to beat Tailwind */
.time-block-card.rounded-lg.border {
  background: none;
  border-radius: 8px !important; /* Rounded corners */
  margin: 2px 4px; /* Gaps between blocks */
  box-sizing: border-box !important; /* Include border in height calculation */
}

/* State-based Card styling - Green for available */
.time-block-card.available.rounded-lg {
  background-color: #d4edda !important; /* Light green */
}

/* Blue for own bookings */
.time-block-card.own-booking.rounded-lg {
  background-color: #cce5ff !important; /* Light blue */
}

/* Blue for all bookings when in instructor view */
.time-block-card.instructor-view-booked.rounded-lg {
  background-color: #cce5ff !important; /* Light blue */
  cursor: pointer !important; /* Override not-allowed */
}

/* Red for booked slots that aren't yours (only for non-instructor views) */
.time-block-card.booked.rounded-lg:not(.own-booking):not(.instructor-view-booked) {
  background-color: #f8d7da !important; /* Light red */
  cursor: not-allowed;
}

/* Red for unavailable */
.time-block-card.unavailable.rounded-lg {
  background-color: #f8d7da !important; /* Light red */
  cursor: not-allowed;
}

/* Red striped for blocked/Google Calendar (instructors and admins) */
.time-block-card.google-calendar.rounded-lg {
  background-color: #f8d7da !important; /* Light red base */
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 8px,
    rgba(220, 53, 69, 0.3) 8px, /* Darker red stripes */
    rgba(220, 53, 69, 0.3) 16px
  );
  color: #000;
}

/* Plain red for Google Calendar events (students) */
.time-block-card.google-calendar-student.rounded-lg {
  background-color: #f8d7da !important; /* Same as unavailable */
  cursor: not-allowed;
}

.time-block-card.rescheduling.rounded-lg {
  background-color: #fff3cd !important; /* Light yellow */
  cursor: not-allowed;
}

.time-block-card.past {
  cursor: not-allowed;
}

.time-block-card:hover:not(.unavailable):not(.past) {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.time-block-card.past.rounded-lg {
  cursor: not-allowed;
}

.time-block-card.original-block.rounded-lg {
  background-color: var(--calendar-booked, #e3f2fd) !important;
  cursor: not-allowed;
  opacity: 0.7;
}

.block-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
}

.block-time {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: 500;
}

/* Available slots container */
.available-slots-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.available-slot {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid rgba(170, 170, 170, 0.3);
}

/* Remove border from last slot */
.available-slot:last-child {
  border-bottom: none;
}

.available-slot:hover {
  background-color: rgba(34, 197, 94, 0.15);
}

.available-slot:hover .slot-time-tooltip {
  opacity: 1;
}

/* Hide borders by default on desktop, show on hover */
@media (min-width: 1025px) {
  .available-slot {
    border-bottom-color: transparent;
    transition: background-color 0.15s ease, border-bottom-color 0.2s ease;
  }
  
  .time-block-card:hover .available-slot {
    border-bottom-color: rgba(170, 170, 170, 0.3);
  }
  
  .time-block-card:hover .available-slot:last-child {
    border-bottom-color: transparent;
  }
}

/* Always show borders on mobile */
@media (max-width: 1024px) {
  .available-slot {
    border-bottom-color: rgba(170, 170, 170, 0.3);
  }
  
  .available-slot:last-child {
    border-bottom-color: transparent;
  }
}

/* Slot time tooltip */
.slot-time-tooltip {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  pointer-events: none;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.student-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin-top: var(--spacing-xs);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
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

.time-block-card:hover .tooltip {
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
</style>