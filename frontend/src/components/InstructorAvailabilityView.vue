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

// Editing state
const isEditing = ref(false)
const editingSchedule = ref({})
const isDragging = ref(false)
const dragStartValue = ref(null)
const currentDayColumn = ref(null)

// Initialize editing schedule when editing starts
watch(isEditing, (newValue) => {
    if (newValue) {
        // Deep clone the weeklySchedule when starting to edit
        editingSchedule.value = JSON.parse(JSON.stringify(props.weeklySchedule))
    }
})

const toggleTimeSlot = (dayOfWeek, hour) => {
    if (!isEditing.value) return

    // Create a deep copy of the current schedule
    const newSchedule = JSON.parse(JSON.stringify(editingSchedule.value))
    
    if (!newSchedule[dayOfWeek]) {
        newSchedule[dayOfWeek] = {
            isAvailable: false,
            startTime: '09:00',
            endTime: '17:00',
            ranges: []
        }
    }

    const schedule = newSchedule[dayOfWeek]
    const currentlyAvailable = isTimeAvailable(dayOfWeek, hour)

    // If day is not yet available, create first time block
    if (!schedule.isAvailable) {
        schedule.isAvailable = true
        schedule.startTime = formatTime(hour)
        schedule.endTime = formatTime(hour + 0.5)
        schedule.ranges = []
    } 
    // If clicking on an available slot, make it unavailable
    else if (currentlyAvailable) {
        const mainStart = parseTime(schedule.startTime)
        const mainEnd = parseTime(schedule.endTime)

        // If clicking in main range
        if (hour >= mainStart && hour < mainEnd) {
            if (hour === mainStart) {
                // Clicking at start of main range
                schedule.startTime = formatTime(hour + 0.5)
            } else if (hour + 0.5 === mainEnd) {
                // Clicking at end of main range
                schedule.endTime = formatTime(hour)
            } else {
                // Clicking in middle of main range - split it
                const newRange = {
                    startTime: formatTime(hour + 0.5),
                    endTime: schedule.endTime
                }
                schedule.endTime = formatTime(hour)
                schedule.ranges.push(newRange)
            }
        } else {
            // Check additional ranges
            for (let i = 0; i < schedule.ranges.length; i++) {
                const range = schedule.ranges[i]
                const rangeStart = parseTime(range.startTime)
                const rangeEnd = parseTime(range.endTime)

                if (hour >= rangeStart && hour < rangeEnd) {
                    if (hour === rangeStart) {
                        range.startTime = formatTime(hour + 0.5)
                    } else if (hour + 0.5 === rangeEnd) {
                        range.endTime = formatTime(hour)
                    } else {
                        const newRange = {
                            startTime: formatTime(hour + 0.5),
                            endTime: range.endTime
                        }
                        range.endTime = formatTime(hour)
                        schedule.ranges.splice(i + 1, 0, newRange)
                    }
                    break
                }
            }
        }

        // Clean up empty ranges
        schedule.ranges = schedule.ranges.filter(range => 
            parseTime(range.startTime) < parseTime(range.endTime)
        )

        // If main range is empty and we have ranges, promote first range to main
        if (parseTime(schedule.startTime) >= parseTime(schedule.endTime) && schedule.ranges.length > 0) {
            const firstRange = schedule.ranges.shift()
            schedule.startTime = firstRange.startTime
            schedule.endTime = firstRange.endTime
        }

        // If no valid ranges left, mark as unavailable
        if (parseTime(schedule.startTime) >= parseTime(schedule.endTime) && schedule.ranges.length === 0) {
            schedule.isAvailable = false
        }
    } 
    // If clicking on an unavailable slot, try to make it available
    else {
        // Try to extend existing ranges
        let added = false

        // Check if we can extend the main range
        if (hour + 0.5 === parseTime(schedule.startTime)) {
            schedule.startTime = formatTime(hour)
            added = true
        } else if (hour === parseTime(schedule.endTime)) {
            schedule.endTime = formatTime(hour + 0.5)
            added = true
        }

        // Check if we can extend any additional range
        if (!added && schedule.ranges) {
            for (const range of schedule.ranges) {
                if (hour + 0.5 === parseTime(range.startTime)) {
                    range.startTime = formatTime(hour)
                    added = true
                    break
                } else if (hour === parseTime(range.endTime)) {
                    range.endTime = formatTime(hour + 0.5)
                    added = true
                    break
                }
            }
        }

        // If we couldn't extend any range, create a new one
        if (!added) {
            const newRange = {
                startTime: formatTime(hour),
                endTime: formatTime(hour + 0.5)
            }
            schedule.ranges.push(newRange)
        }

        // Ensure the day is marked as available
        schedule.isAvailable = true
    }

    // Sort ranges by start time
    if (schedule.ranges) {
        schedule.ranges.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))
    }

    // Update the editing schedule
    editingSchedule.value = newSchedule
    emit('update:weeklySchedule', newSchedule)
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
    isEditing.value = false
    editingSchedule.value = JSON.parse(JSON.stringify(props.weeklySchedule))
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

const isTimeAvailable = (dayOfWeek, hour) => {
    const schedule = isEditing.value 
        ? editingSchedule.value[dayOfWeek]
        : props.weeklySchedule[dayOfWeek]
        
    if (!schedule?.isAvailable) return false

    // Check main range
    const startHour = parseTime(schedule.startTime)
    const endHour = parseTime(schedule.endTime)

    if (hour >= startHour && hour < endHour && !isTimeBlocked(dayOfWeek, hour)) {
        return true
    }

    // Check additional ranges
    if (schedule.ranges) {
        for (const range of schedule.ranges) {
            const rangeStart = parseTime(range.startTime)
            const rangeEnd = parseTime(range.endTime)
            if (hour >= rangeStart && hour < rangeEnd && !isTimeBlocked(dayOfWeek, hour)) {
                return true
            }
        }
    }

    return false
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