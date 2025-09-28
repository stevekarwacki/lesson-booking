<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Booking</h2>
            </div>
            
            <div class="modal-body">
                <div class="booking-details">
                    <p>Date: {{ currentSlot.date.toISOString().split('T')[0] }}</p>
                    <p>Time: {{ slotToTime(currentSlot.startSlot) }} - {{ displayEndTime }}</p>
                </div>

                <div class="duration-selection">
                    <h3>Lesson Duration</h3>
                    <div class="form-group">
                        <div class="form-input-group">
                            <div class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="duration30" 
                                    v-model="selectedDuration" 
                                    value="30"
                                    class="form-input"
                                >
                                <label for="duration30" class="form-radio-label">
                                    30 minutes
                                </label>
                            </div>
                            <div class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="duration60" 
                                    v-model="selectedDuration" 
                                    value="60"
                                    class="form-input"
                                >
                                <label for="duration60" class="form-radio-label">
                                    60 minutes
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="booking-options">
                    <h3>Single Lesson</h3>
                    <p>{{ selectedDuration }} minutes - ${{ lessonPrice }}</p>
                </div>

                <!-- Conflict Warning -->
                <div v-if="hasTimeConflict" class="conflict-warning">
                    <h3>Time Conflict</h3>
                    <p>{{ conflictMessage }}</p>
                    <p><strong>Please select a different time or choose 30 minutes instead.</strong></p>
                </div>

                <div v-if="showPaymentOptions && !hasTimeConflict" class="payment-options">
                    <h3>Payment Method</h3>
                    <div class="form-group">
                        <div class="form-input-group">
                            <div v-if="userCredits > 0" class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="useCredits" 
                                    v-model="paymentMethod" 
                                    value="credits"
                                    class="form-input"
                                >
                                <label for="useCredits" class="form-radio-label">
                                    Use Lesson Credits ({{ userCredits }} remaining)
                                </label>
                            </div>
                            <div class="form-radio-group">
                                <input 
                                    type="radio" 
                                    id="payNow" 
                                    v-model="paymentMethod" 
                                    value="direct"
                                    class="form-input"
                                >
                                <label for="payNow" class="form-radio-label">Pay Now (${{ lessonPrice }})</label>
                            </div>
                        </div>
                    </div>

                    <!-- Stripe Payment Form -->
                    <div v-if="paymentMethod === 'direct'" class="stripe-form-container">
                        <StripePaymentForm
                            :amount="lessonPrice"
                            @payment-success="handleStripeSuccess"
                            @payment-error="handleStripeError"
                        />
                    </div>
                </div>

                <div v-if="error" class="form-message error-message">
                    {{ error }}
                </div>
            </div>

            <div class="modal-footer">
                <button 
                    class="form-button form-button-cancel"
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    Cancel
                </button>
                <button 
                    v-if="paymentMethod !== 'direct'"
                    class="form-button" 
                    @click="confirmBooking"
                    :disabled="loading || hasTimeConflict"
                >
                    {{ loading ? 'Processing...' : hasTimeConflict ? 'Booking Conflict' : 'Confirm Booking' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useTimezoneStore } from '../stores/timezoneStore'
import { slotToTimeUTC, slotToTime, formatDateUTC, createUTCDateFromSlot } from '../utils/timeFormatting'
import StripePaymentForm from './StripePaymentForm.vue'

const props = defineProps({
    slot: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const userStore = useUserStore()
const timezoneStore = useTimezoneStore()

const loading = ref(false)
const error = ref(null)
const paymentMethod = ref('credits')
const showPaymentOptions = ref(true)
const userCredits = ref(0)
const currentSlot = ref(props.slot) // Create a reactive reference to the slot
const selectedDuration = ref('30') // Default to 30 minutes for backward compatibility
const instructorHourlyRate = ref(50) // Default rate, will be fetched from database

// Computed property for the displayed end time based on selected duration
const displayEndTime = computed(() => {
    const durationInSlots = parseInt(selectedDuration.value) / 15;
    return slotToTime(parseInt(currentSlot.value.startSlot) + durationInSlots);
})

// Reactive properties for conflict checking
const hasTimeConflict = ref(false)
const conflictMessage = ref('')

// Function to check for time conflicts when duration changes
const checkTimeConflicts = async () => {
    if (selectedDuration.value === '30') {
        // 30-minute slots are pre-validated as available
        hasTimeConflict.value = false
        conflictMessage.value = ''
        return
    }

    try {
        // For 60-minute lessons, fetch availability and booked events to check conflicts
        const formattedDate = currentSlot.value.date.toISOString().split('T')[0]
        
        const [availabilityResponse, eventsResponse] = await Promise.all([
            fetch(`/api/availability/${currentSlot.value.instructorId}/daily/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            }),
            fetch(`/api/calendar/dailyEvents/${currentSlot.value.instructorId}/${formattedDate}`, {
                headers: { 'Authorization': `Bearer ${userStore.token}` }
            })
        ])

        if (!availabilityResponse.ok || !eventsResponse.ok) {
            hasTimeConflict.value = true
            conflictMessage.value = 'Unable to check availability'
            return
        }

        const [availabilityData, bookedEvents] = await Promise.all([
            availabilityResponse.json(),
            eventsResponse.json()
        ])

        // Check if the extended duration (60 minutes = 4 slots) would conflict
        const startSlot = currentSlot.value.startSlot
        const durationInSlots = parseInt(selectedDuration.value) / 15
        const endSlot = startSlot + durationInSlots

        // Check for conflicts with existing bookings
        const hasBookingConflict = bookedEvents.some(event => {
            const eventStart = event.start_slot
            const eventEnd = event.start_slot + event.duration
            return startSlot < eventEnd && endSlot > eventStart
        })

        if (hasBookingConflict) {
            hasTimeConflict.value = true
            conflictMessage.value = 'The requested 60-minute time slot conflicts with existing bookings. Please select a different time or try a 30-minute lesson.'
            return
        }

        // Check if instructor has availability for the full duration
        const hasAvailability = availabilityData.some(slot => {
            return startSlot >= slot.start_slot && 
                   endSlot <= slot.start_slot + slot.duration
        })

        if (!hasAvailability) {
            hasTimeConflict.value = true
            conflictMessage.value = 'Instructor is not available for the full 60 minutes requested. Please check availability or select a shorter duration.'
            return
        }

        // No conflicts found
        hasTimeConflict.value = false
        conflictMessage.value = ''

    } catch (err) {
        hasTimeConflict.value = true
        conflictMessage.value = 'Unable to validate booking availability'
    }
}

// Watch for duration changes and validate
watch(selectedDuration, () => {
    checkTimeConflicts()
})

// Computed property for pricing based on selected duration and instructor's hourly rate
const lessonPrice = computed(() => {
    const rate = instructorHourlyRate.value || 50; // Fallback to $50 if no rate set
    return parseInt(selectedDuration.value) === 30 ? rate / 2 : rate;
})

// Fetch instructor's hourly rate
const fetchInstructorRate = async () => {
    try {
        const response = await fetch(`/api/instructors/${currentSlot.value.instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const instructor = await response.json()
            if (instructor.hourly_rate) {
                instructorHourlyRate.value = parseFloat(instructor.hourly_rate)
            }
        }
    } catch (err) {
        console.error('Error fetching instructor rate:', err)
    }
}

// Fetch user credits and instructor rate when modal opens
onMounted(async () => {
    // Fetch both credits and instructor rate in parallel
    await Promise.all([
        (async () => {
            try {
                const response = await fetch('/api/payments/credits', {
                    headers: {
                        'Authorization': `Bearer ${userStore.token}`
                    }
                })
                
                if (!response.ok) {
                    throw new Error('Failed to fetch credits')
                }
                
                const data = await response.json()
                userCredits.value = data.total_credits || 0
                
                // If user has credits, default to using them
                if (userCredits.value > 0) {
                    paymentMethod.value = 'credits'
                } else {
                    paymentMethod.value = 'direct'
                    showPaymentOptions.value = true
                }
            } catch (err) {
                console.error('Error fetching credits:', err)
                // Default to direct payment if we can't fetch credits
                paymentMethod.value = 'direct'
                showPaymentOptions.value = true
            }
        })(),
        fetchInstructorRate()
    ])
    
    // Check for conflicts on initial load
    await checkTimeConflicts()
})

const handleStripeSuccess = async () => {
    // Ensure payment method is set to direct for Stripe payments
    paymentMethod.value = 'direct'
    
    try {
        loading.value = true
        error.value = null
        await confirmBooking()
    } catch (err) {
        console.error('Payment success error:', err)
        error.value = err.message || 'Failed to process payment'
    } finally {
        loading.value = false
    }
}

const handleStripeError = (err) => {
    error.value = err.message || 'Payment failed'
    console.error('Stripe payment error:', err)
}

const confirmBooking = async () => {
    try {
        loading.value = true;
        error.value = null;

        // Get the date in UTC using utility functions
        const utcDate = formatDateUTC(currentSlot.value.date);
        
        // Convert slot times to UTC using utility functions
        const startTime = slotToTimeUTC(currentSlot.value.startSlot);
        // Calculate duration in slots (15-minute increments): 30min=2 slots, 60min=4 slots
        const durationInSlots = parseInt(selectedDuration.value) / 15;
        const endTime = slotToTimeUTC(parseInt(currentSlot.value.startSlot) + durationInSlots);
        
        // Create UTC dates using utility functions
        const startDate = createUTCDateFromSlot(utcDate, currentSlot.value.startSlot);
        const endSlot = parseInt(currentSlot.value.startSlot) + durationInSlots;
        const endDate = createUTCDateFromSlot(utcDate, endSlot);

        const requestBody = {
            instructorId: currentSlot.value.instructorId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            paymentMethod: paymentMethod.value,
            studentTimezone: timezoneStore.userTimezone
        }

        const response = await fetch('/api/calendar/addEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const data = await response.json()
            
            if (data.error === 'INSUFFICIENT_CREDITS') {
                showPaymentOptions.value = true
                error.value = 'Insufficient credits. Please choose a payment method.'
                return
            }
            throw new Error(data.error || 'Failed to book lesson')
        }

        const result = await response.json()
        emit('booking-confirmed', result.booking)
    } catch (err) {
        console.error('confirmBooking error:', err)
        error.value = err.message
    } finally {
        loading.value = false
    }
}

// Watch for slot changes
watch(() => props.slot, (newSlot) => {
    currentSlot.value = newSlot
}, { immediate: true })
</script>

<style scoped>
.booking-details {
    margin: var(--spacing-md) 0;
}

.duration-selection {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.duration-selection h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.booking-options {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.payment-options {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.payment-options h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
}

.form-radio-group {
    margin: var(--spacing-sm) 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.form-radio-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    cursor: pointer;
}

.form-input[type="radio"] {
    width: auto;
    margin: 0;
}

.stripe-form-container {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-color);
}

.form-message {
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}

.conflict-warning {
    margin: var(--spacing-md) 0;
    padding: var(--spacing-md);
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid #ffc107;
    border-radius: var(--border-radius);
    color: #856404;
}

.conflict-warning h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: #856404;
}

.conflict-warning p {
    margin: var(--spacing-sm) 0 0 0;
}

.modal-footer {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
    justify-content: flex-end;
}

/* Remove old button styles since we're using form-button classes */
.modal-button,
.modal-button-secondary,
.modal-button-primary {
    display: none;
}
</style> 