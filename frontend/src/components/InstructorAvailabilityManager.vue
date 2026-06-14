<template>
    <InstructorAvailabilityView
        v-model:weeklySchedule="weeklySchedule"
        :blocked-times="[]"
        @save="handleSaveWeeklySchedule"
    />
</template>

<script setup>
import { ref, watch } from 'vue'
import { useTimezoneStore } from '../stores/timezoneStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useAvailability } from '../composables/useAvailability'
import InstructorAvailabilityView from './InstructorAvailabilityView.vue'

const timezoneStore = useTimezoneStore()
const { showSuccess, showError } = useFormFeedback()
const loading = ref(false)

const props = defineProps({
    instructorId: {
        type: String,
        required: true
    }
})

const {
    weeklyAvailability,
    saveWeeklyAvailability,
} = useAvailability(props.instructorId)

const weeklySchedule = ref({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
})

// immediate: true ensures cached Vue Query data is processed on mount
watch(weeklyAvailability, (newAvailability) => {
    if (newAvailability) {
        for (let i = 0; i < 7; i++) {
            weeklySchedule.value[i] = []
        }
        newAvailability.forEach(slot => {
            weeklySchedule.value[slot.day_of_week].push({
                startSlot: slot.start_slot,
                duration: slot.duration
            })
        })
    }
}, { immediate: true })

const slotToLocalTime = (slot) => {
    const hours = Math.floor(slot / 4)
    const minutes = (slot % 4) * 15
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const handleSaveWeeklySchedule = async () => {
    try {
        loading.value = true

        const slots = []

        Object.entries(weeklySchedule.value).forEach(([dayOfWeek, daySlots]) => {
            if (!daySlots.length) return

            daySlots.sort((a, b) => a.startSlot - b.startSlot)

            let currentStartSlot = daySlots[0].startSlot
            let currentEndSlot = daySlots[0].startSlot + daySlots[0].duration

            for (let i = 1; i < daySlots.length; i++) {
                const slot = daySlots[i]
                if (currentEndSlot === slot.startSlot) {
                    currentEndSlot = slot.startSlot + slot.duration
                } else {
                    slots.push({
                        dayOfWeek: parseInt(dayOfWeek),
                        startTime: slotToLocalTime(currentStartSlot),
                        endTime: slotToLocalTime(currentEndSlot)
                    })
                    currentStartSlot = slot.startSlot
                    currentEndSlot = slot.startSlot + slot.duration
                }
            }

            slots.push({
                dayOfWeek: parseInt(dayOfWeek),
                startTime: slotToLocalTime(currentStartSlot),
                endTime: slotToLocalTime(currentEndSlot)
            })
        })

        await saveWeeklyAvailability({
            slots,
            instructorTimezone: timezoneStore.userTimezone
        })

        showSuccess('Schedule saved successfully')
    } catch (err) {
        showError('Error saving schedule: ' + err.message)
        console.error('Error saving schedule:', err)
    } finally {
        loading.value = false
    }
}

const resetAndFetch = () => {
    for (let i = 0; i < 7; i++) {
        weeklySchedule.value[i] = []
    }
}

defineExpose({ resetAndFetch })
</script>

