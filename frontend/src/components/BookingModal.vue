<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Confirm Booking</h2>
            </div>
            
            <div class="modal-body">
                <div class="booking-details">
                    <p>Date: {{ slot.date.toISOString().split('T')[0] }}</p>
                    <p>Time: {{ slotToTime(slot.startSlot) }} - {{ slotToTime(parseInt(slot.startSlot) + parseInt(slot.duration)) }}</p>
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
                    class="form-button form-button-secondary" 
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
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { slotToTime } from '../utils/timeFormatting'
import StripePaymentForm from './StripePaymentForm.vue'

const props = defineProps({
    slot: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['close', 'booking-confirmed'])

const userStore = useUserStore()

const loading = ref(false)
const error = ref(null)
const paymentMethod = ref('credits')
const showPaymentOptions = ref(true)
const userCredits = ref(0)

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
    try {
        loading.value = true
        error.value = null
        await confirmBooking()
    } catch (err) {
        error.value = err.message || 'Failed to process payment'
        console.error('Payment success error:', err)
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
        const date = new Date(props.slot.date);
        date.setUTCHours(0, 0, 0, 0);
        const utcDate = date.toISOString().split('T')[0];
        
        // Convert slot times to UTC
        const startTime = slotToTime(props.slot.startSlot);
        const endTime = slotToTime(parseInt(props.slot.startSlot) + parseInt(props.slot.duration));
        
        // Create UTC dates
        const startDate = new Date(`${utcDate}T${startTime}:00.000Z`);
        const endDate = new Date(`${utcDate}T${endTime}:00.000Z`);

        const response = await fetch('/api/calendar/addEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                instructorId: props.slot.instructorId,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                paymentMethod: paymentMethod.value
            })
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
    z-index: 10000;
}

.modal-content {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    max-width: 500px;
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
    margin-top: var(--spacing-lg);
    justify-content: flex-end;
}

/* Remove old button styles since we're using form-button classes */
.modal-button,
.modal-button-secondary,
.modal-button-primary {
    display: none;
}
</style> 