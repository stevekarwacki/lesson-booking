// frontend/src/components/StripePaymentForm.vue
<template>
    <div class="stripe-payment-form">
        <div v-if="error" class="error-message">
            {{ error }}
        </div>

        <div v-if="loading" class="loading-state">
            Processing payment...
        </div>

        <div v-else-if="paymentSuccess" class="success-state">
            <div class="success-icon">✓</div>
            <h3>Payment Successful!</h3>
            <p>Your payment has been processed successfully.</p>
        </div>

        <div v-else>
            <div ref="paymentElement" class="payment-element"></div>
            
            <button 
                class="submit-button"
                @click="handleSubmit"
                :disabled="processing || !stripe || !elements"
            >
                {{ processing ? 'Processing...' : 'Pay Now' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useStripe } from '../composables/useStripe'

const props = defineProps({
    amount: {
        type: Number,
        required: true
    },
    planId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['payment-success', 'payment-error'])
const paymentElement = ref(null)
const processing = ref(false)
const paymentSuccess = ref(false)

const { 
    stripe, 
    elements, 
    loading, 
    error, 
    initializeStripe, 
    createPaymentIntent, 
    mountPaymentElement 
} = useStripe()

onMounted(async () => {
    try {
        // Initialize Stripe
        await initializeStripe()
        
        // Create payment intent
        const { clientSecret } = await createPaymentIntent(props.amount, props.planId)
        
        // Mount payment element
        await mountPaymentElement(paymentElement.value, clientSecret)
    } catch (err) {
        emit('payment-error', err)
    }
})

onUnmounted(() => {
    if (elements.value) {
        const paymentElement = elements.value.getElement('payment')
        if (paymentElement) {
            paymentElement.unmount()
        }
    }
})

const handleSubmit = async () => {
    try {
        processing.value = true
        error.value = null

        const { error: submitError } = await stripe.value.confirmPayment({
            elements: elements.value,
            redirect: 'if_required'
        })

        if (submitError) {
            throw new Error(submitError.message)
        }

        paymentSuccess.value = true
        emit('payment-success')
    } catch (err) {
        error.value = err.message || 'Payment failed'
        emit('payment-error', err)
    } finally {
        processing.value = false
    }
}
</script>

<style scoped>
.stripe-payment-form {
    max-width: 500px;
    margin: 0 auto;
    padding: var(--spacing-md);
}

.payment-element {
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    background: white;
    min-height: 200px; /* Ensure the element has space to render */
    max-height: 400px;
    overflow-y: scroll;
}

.submit-button {
    width: 100%;
    padding: var(--spacing-md);
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.submit-button:hover:not(:disabled) {
    opacity: 0.9;
}

.submit-button:disabled {
    background: var(--text-secondary);
    cursor: not-allowed;
}

.error-message {
    color: var(--error-color);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background: rgba(255, 0, 0, 0.1);
    border-radius: var(--border-radius);
}

.loading-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.success-state {
    text-align: center;
    padding: var(--spacing-lg);
    background: rgba(0, 255, 0, 0.1);
    border-radius: var(--border-radius);
    margin: var(--spacing-md) 0;
}

.success-icon {
    font-size: 2rem;
    color: var(--success-color);
    margin-bottom: var(--spacing-sm);
}

.success-state h3 {
    color: var(--success-color);
    margin-bottom: var(--spacing-sm);
}

.success-state p {
    color: var(--text-secondary);
}
</style> 