<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reschedule Lesson</h2>
            </div>
            
            <div class="modal-body">
                <EditBooking 
                    :booking="booking"
                    @close="$emit('close')"
                    @booking-updated="$emit('booking-updated')"
                    @booking-cancelled="$emit('booking-cancelled')"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import EditBooking from './EditBooking.vue'

const props = defineProps({
    booking: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-updated', 'booking-cancelled'])
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
    z-index: 10000;
}

.modal-content {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}
</style> 