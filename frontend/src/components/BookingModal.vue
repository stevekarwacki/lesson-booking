<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Booking</h2>
            </div>
            
            <div class="modal-body">
                <div class="booking-details">
                    <p>Date: {{ currentSlot.date.toISOString().split('T')[0] }}</p>
                    <p>Time: {{ slotToTime(currentSlot.startSlot) }} - {{ slotToTime(parseInt(currentSlot.startSlot) + parseInt(currentSlot.duration)) }}</p>
                </div>

                <div class="booking-options">
                    <h3>Single Lesson</h3>
                    <p>30 minutes - $50</p>
                </div>

                <div v-if="showPaymentOptions" class="payment-options">
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
                                <label for="payNow" class="form-radio-label">Pay Now ($50)</label>
                            </div>
                        </div>
                    </div>

                    <!-- Stripe Payment Form -->
                    <div v-if="paymentMethod === 'direct'" class="stripe-form-container">
                        <StripePaymentForm
                            :amount="50.00"
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
                    :disabled="loading"
                >
                    {{ loading ? 'Processing...' : 'Confirm Booking' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTime } from '../utils/timeFormatting'
import StripePaymentForm from './StripePaymentForm.vue'
import { useRoute } from 'vue-router'

const props = defineProps({
    slot: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const userStore = useUserStore()
const route = useRoute()

const loading = ref(false)
const error = ref(null)
const paymentMethod = ref('credits')
const showPaymentOptions = ref(true)
const userCredits = ref(0)
const currentSlot = ref(props.slot) // Create a reactive reference to the slot

// Fetch user credits when modal opens
onMounted(async () => {
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

        // Get the date in UTC
        const date = new Date(currentSlot.value.date);
        date.setUTCHours(0, 0, 0, 0);
        const utcDate = date.toISOString().split('T')[0];
        
        // Convert slot times to UTC
        const startTime = slotToTime(currentSlot.value.startSlot);
        const endTime = slotToTime(parseInt(currentSlot.value.startSlot) + parseInt(currentSlot.value.duration));
        
        // Create UTC dates
        const startDate = new Date(`${utcDate}T${startTime}:00.000Z`);
        const endDate = new Date(`${utcDate}T${endTime}:00.000Z`);

        const requestBody = {
            instructorId: currentSlot.value.instructorId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            paymentMethod: paymentMethod.value
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

// Watch for payment method changes
watch(paymentMethod, (newValue, oldValue) => {
    // Payment method changed
})

// Watch for slot changes
watch(() => props.slot, (newSlot) => {
    currentSlot.value = newSlot
}, { immediate: true })
</script>

<style scoped>
.booking-details {
    margin: var(--spacing-md) 0;
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