<template>
    <div class="weekly-schedule-view">
        <div class="schedule-header-container">
            <div class="schedule-controls">
                <button 
                    class="btn"
                    :class="{ 'btn-primary': isEditing }"
                    @click="toggleEditing"
                >
                    {{ isEditing ? 'Save Changes' : 'Edit Schedule' }}
                </button>
                <button 
                    v-if="isEditing"
                    class="btn btn-secondary"
                    @click="cancelEditing"
                >
                    Cancel
                </button>
            </div>
        </div>
        
        <div class="schedule-header">
            <div class="time-column"></div>
            <div 
                v-for="day in daysOfWeek" 
                :key="day.value" 
                class="day-column"
            >
                {{ day.label }}
            </div>
        </div>
        
        <div class="schedule-body">
            <div class="time-slots">
                <div 
                    v-for="hour in timeSlots" 
                    :key="hour.value"
                    class="time-row"
                >
                    <div class="time-label">{{ hour.label }}</div>
                    <div 
                        v-for="day in daysOfWeek" 
                        :key="day.value"
                        class="schedule-cell"
                        :class="{
                            'available': isTimeAvailable(day.value, hour.value),
                            'unavailable': !isTimeAvailable(day.value, hour.value),
                            'editable': isEditing
                        }"
                        @mousedown="startDrag(day.value, hour.value, $event)"
                        @mouseenter="handleDrag(day.value, hour.value)"
                        @mouseup="endDrag"
                    >
                        <div 
                            v-if="getBlockedReason(day.value, hour.value)"
                            class="blocked-indicator"
                            :title="getBlockedReason(day.value, hour.value)"
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
import { ref, computed, watch } from 'vue'
import { timeToSlot, slotToTime } from '../utils/slotHelpers'

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

const emit = defineEmits(['update:weeklySchedule', 'save'])

const isEditing = ref(false)
const editingSchedule = ref(props.weeklySchedule)
const isDragging = ref(false)
const currentDayColumn = ref(null)
const dragStartValue = ref(null)

// Add this helper function
const expandSlotToBlocks = (slot) => {
    const blocks = []
    for (let i = 0; i < slot.duration; i += 2) {  // increment by 2 for 30-min blocks
        blocks.push({
            startSlot: slot.startSlot + i,
            duration: 2
        })
    }
    return blocks
}

// When weeklySchedule changes, break down the slots into 30-minute blocks
watch(() => props.weeklySchedule, (newSchedule) => {
    const expanded = {}
    
    // Initialize empty arrays for each day
    for (let i = 0; i < 7; i++) {
        expanded[i] = []
    }
    
    // Break down each slot into 30-minute blocks
    Object.entries(newSchedule).forEach(([day, slots]) => {
        slots.forEach(slot => {
            expanded[day].push(...expandSlotToBlocks(slot))
        })
        // Sort the expanded blocks
        expanded[day].sort((a, b) => a.startSlot - b.startSlot)
    })
    
    editingSchedule.value = expanded
}, { immediate: true, deep: true })

const isTimeAvailable = (dayOfWeek, hour) => {
    const schedule = editingSchedule.value[dayOfWeek]
    const timeSlot = timeToSlot(`${hour}:00`)
    return schedule?.some(slot => 
        timeSlot >= slot.startSlot && 
        timeSlot < (slot.startSlot + slot.duration)
    )
}

const toggleTimeSlot = (dayOfWeek, hour) => {
    if (!Array.isArray(editingSchedule.value[dayOfWeek])) {
        editingSchedule.value[dayOfWeek] = []
    }
    
    const schedule = editingSchedule.value[dayOfWeek]
    const startSlot = timeToSlot(`${hour}:00`)
    const duration = 2  // 30 minutes = 2 fifteen-minute slots
    
    // Find if this half-hour block exists
    const existingSlotIndex = schedule.findIndex(slot => 
        slot.startSlot === startSlot && slot.duration === duration
    )

    if (existingSlotIndex !== -1) {
        // Remove the slot
        schedule.splice(existingSlotIndex, 1)
    } else {
        // Add new half-hour slot
        schedule.push({
            startSlot,
            duration
        })
    }
    
    // Sort slots by start time
    schedule.sort((a, b) => a.startSlot - b.startSlot)

    // Update the editing schedule
    editingSchedule.value = { ...editingSchedule.value }
    emit('update:weeklySchedule', editingSchedule.value)
}

const startDrag = (dayOfWeek, hour, event) => {
    if (!isEditing.value) return
    event.preventDefault()
    isDragging.value = true
    currentDayColumn.value = dayOfWeek
    dragStartValue.value = isTimeAvailable(dayOfWeek, hour)
    toggleTimeSlot(dayOfWeek, hour)
}

const handleDrag = (dayOfWeek, hour) => {
    if (!isDragging.value || !isEditing.value || dayOfWeek !== currentDayColumn.value) return
    
    // Toggle if the current cell's availability is the same as the drag start value
    const currentAvailable = isTimeAvailable(dayOfWeek, hour)
    if (currentAvailable === dragStartValue.value) {
        toggleTimeSlot(dayOfWeek, hour)
    }
}

const endDrag = () => {
    isDragging.value = false
    currentDayColumn.value = null
    dragStartValue.value = null
}

const toggleEditing = () => {
    if (isEditing.value) {
        // Save changes
        emit('update:weeklySchedule', editingSchedule.value)
        emit('save')
    }
    isEditing.value = !isEditing.value
}

const cancelEditing = () => {
    editingSchedule.value = JSON.parse(JSON.stringify(props.weeklySchedule))
    isEditing.value = false
}

const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
]

const timeSlots = computed(() => {
    const slots = []
    for (let hour = 7; hour < 19; hour++) {
        // Add hour slot
        slots.push({
            value: hour,
            label: `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`
        })
        // Add half hour slot
        slots.push({
            value: hour + 0.5,
            label: `${hour % 12 || 12}:30${hour < 12 ? 'am' : 'pm'}`
        })
    }
    return slots
})

const parseTime = (timeStr) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + (minutes / 60)
}

const formatTime = (timeValue) => {
    const hours = Math.floor(timeValue)
    const minutes = Math.round((timeValue - hours) * 60)
    return `${hours}:${minutes.toString().padStart(2, '0')}`
}

const isTimeBlocked = (dayOfWeek, hour) => {
    if (!props.blockedTimes.length) return false

    const today = new Date()
    today.setHours(hour, 0, 0, 0)
    today.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7))

    return props.blockedTimes.some(block => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)
        return today >= blockStart && today < blockEnd
    })
}

const getBlockedReason = (dayOfWeek, hour) => {
    if (!props.blockedTimes.length) return null

    const today = new Date()
    today.setHours(hour, 0, 0, 0)
    today.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7))

    const block = props.blockedTimes.find(block => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)
        return today >= blockStart && today < blockEnd
    })

    return block?.reason
}
</script>

<style scoped>
.weekly-schedule-view {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    margin-top: var(--spacing-lg);
}

.schedule-header-container {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.schedule-controls {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.btn:hover {
    opacity: 0.9;
}

.btn-primary {
    background: #007bff;
    color: white;
    border-color: #0056b3;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border-color: #545b62;
}

.schedule-header {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
    background: var(--primary-color);
    color: white;
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
}

.day-column {
    padding: var(--spacing-md);
    text-align: center;
    font-weight: bold;
    border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.schedule-body {
    overflow-y: auto;
    max-height: 600px;
}

.time-slots {
    display: grid;
}

.time-row {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
    border-bottom: 1px solid var(--border-color);
}

.time-label {
    padding: var(--spacing-sm);
    text-align: right;
    color: var(--text-muted);
    font-size: 0.875rem;
    border-right: 1px solid var(--border-color);
}

.schedule-cell {
    height: 50px;
    border-left: 1px solid var(--border-color);
    padding: var(--spacing-xs);
    user-select: none; /* Prevent text selection while dragging */
}

.schedule-cell.editable {
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.schedule-cell.editable:hover {
    opacity: 0.8;
}

.schedule-cell.available {
    background-color: #e6ffe6;
}

.schedule-cell.unavailable {
    background-color: #ffe6e6;
}

.schedule-cell.editable.available {
    background-color: #b3ffb3;
}

.schedule-cell.editable.unavailable {
    background-color: #ffb3b3;
}

.blocked-indicator {
    background: var(--warning-color);
    color: white;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius);
    font-size: 0.75rem;
    display: inline-block;
    cursor: help;
}
</style> 