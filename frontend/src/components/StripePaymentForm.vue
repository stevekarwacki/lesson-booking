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
            <h3>Subscription Active!</h3>
            <p>Your subscription has been successfully activated. You can now start using your credits.</p>
        </div>

        <div v-else class="form-container">
            <div v-if="processing" class="spinner-overlay">
                <div class="spinner"></div>
                <p>Processing your payment...</p>
            </div>
            
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
import { useUserStore } from '../stores/userStore'

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

const userStore = useUserStore()

onMounted(async () => {
    try {
        // Initialize Stripe
        await initializeStripe()
        
        // Mount card element
        await mountPaymentElement(paymentElement.value, props.amount)
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

        // Submit the payment element first
        const { error: submitError } = await elements.value.submit();
        if (submitError) {
            throw new Error(submitError.message);
        }

        // Create payment method from payment element
        const { error: paymentMethodError, paymentMethod } = await stripe.value.createPaymentMethod({
            elements: elements.value,
            params: {
                billing_details: {
                    email: userStore.user?.email
                }
            }
        });

        if (paymentMethodError) {
            throw new Error(paymentMethodError.message);
        }

        // Create subscription with payment method
        const response = await fetch('/api/subscriptions/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                planId: props.planId,
                paymentMethodId: paymentMethod.id
            })
        });

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create subscription')
        }

        const { subscriptionId, status } = await response.json()

        if (status === 'active') {
            paymentSuccess.value = true
            emit('payment-success')
        } else {
            throw new Error('Subscription creation failed')
        }
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
    position: relative;
}

.form-container {
    position: relative;
}

.spinner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border-radius: var(--border-radius);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-md);
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.spinner-overlay p {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1rem;
}

.payment-element {
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    background: white;
    min-height: 300px;
    max-height: 500px;
    overflow-y: auto;
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
    border: 1px solid var(--success-color);
}

.success-icon {
    font-size: 2.5rem;
    color: var(--success-color);
    margin-bottom: var(--spacing-sm);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(0, 255, 0, 0.1);
    margin: 0 auto var(--spacing-md);
}

.success-state h3 {
    color: var(--success-color);
    margin-bottom: var(--spacing-sm);
    font-size: 1.5rem;
}

.success-state p {
    color: var(--text-secondary);
    margin: 0;
    font-size: 1.1rem;
}

/* Add styles for the payment element tabs */
:deep(.ElementsApp) {
    font-family: system-ui, -apple-system, sans-serif;
}

:deep(.Tab) {
    padding: 12px 16px;
    font-size: 16px;
}

:deep(.Tab--selected) {
    color: var(--primary-color);
    border-color: var(--primary-color);
}

:deep(.Input) {
    padding: 12px;
    font-size: 16px;
    border-radius: var(--border-radius);
}

:deep(.Input:focus) {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}
</style> 