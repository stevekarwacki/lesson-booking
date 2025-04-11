<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <h2>Confirm Booking</h2>
            
            <div class="booking-details">
                <p>Date: {{ slot.date.toISOString().split('T')[0] }}</p>
                <p>Time: {{ slotToTime(slot.startSlot) }} - {{ slotToTime(parseInt(slot.startSlot) + parseInt(slot.duration)) }}</p>
            </div>

            <div class="booking-options">
                <h3>Single Lesson</h3>
                <p>30 minutes - $50</p>
            </div>

            <div class="action-buttons">
                <button 
                    class="btn-cancel" 
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    Cancel
                </button>
                <button 
                    class="btn-confirm" 
                    @click="confirmBooking"
                    :disabled="loading"
                >
                    {{ loading ? 'Checking availability...' : 'Confirm Booking' }}
                </button>
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { currentUser } from '../stores/userStore'
import { slotToTime } from '../utils/timeFormatting'

const props = defineProps({
    slot: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const loading = ref(false)
const error = ref(null)

const confirmBooking = async () => {
    loading.value = true
    error.value = null

    try {
        const date = new Date(props.slot.date)
        date.setHours(0, 0, 0, 0)
        const localizedDate = date.toISOString().split('T')[0]
        
        const startTime = slotToTime(props.slot.startSlot)
        const endTime = slotToTime(parseInt(props.slot.startSlot) + parseInt(props.slot.duration)) 
        const startDate = new Date(`${localizedDate}T${startTime}Z`)
        const endDate = new Date(`${localizedDate}T${endTime}Z`)

        const response = await fetch('/api/calendar/addEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
            },
            body: JSON.stringify({
                instructorId: props.slot.instructorId,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString()
            })
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to book lesson')
        }

        emit('booking-confirmed')
    } catch (err) {
        error.value = err.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    max-width: 400px;
    width: 100%;
}

.booking-details {
    margin: var(--spacing-md) 0;
}

.booking-options {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.action-buttons {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
}

.error-message {
    color: var(--error-color);
    margin-top: var(--spacing-md);
}
</style> 