// frontend/src/components/StripePaymentForm.vue
<template>
    <div class="form-container">
        <div v-if="error" class="form-message error-message">
            {{ error }}
        </div>

        <div v-if="loading" class="loading-state">
            Processing payment...
        </div>

        <div v-else-if="paymentSuccess" class="form-message success-message">
            <div class="success-icon">✓</div>
            <h3>{{ isSubscription ? 'Subscription Active!' : 'Payment Successful!' }}</h3>
            <p>{{ isSubscription ? 'Your subscription has been successfully activated. You can now start using your credits.' : 'Your payment has been processed successfully.' }}</p>
        </div>

        <div v-else class="payment-form">
            <div v-if="processing" class="spinner-overlay">
                <div class="spinner"></div>
                <p>Processing your payment...</p>
            </div>
            
            <div ref="paymentElement" class="payment-element"></div>
            
            <button 
                type="submit"
                class="form-button"
                @click="handleSubmit"
                :disabled="processing || !stripe || !elements"
            >
                {{ processing ? 'Processing...' : 'Pay Now' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useStripe } from '../composables/useStripe'
import { useUserStore } from '../stores/userStore'

const props = defineProps({
    amount: {
        type: Number,
        required: true
    },
    planId: {
        type: String,
        required: false
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

// Determine if this is a subscription payment
const isSubscription = computed(() => !!props.planId)

onMounted(async () => {
    try {
        // Initialize Stripe
        await initializeStripe()
        
        // Mount card element with appropriate mode
        const mode = isSubscription.value ? 'subscription' : 'payment'
        await mountPaymentElement(paymentElement.value, props.amount, mode)
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

        if (isSubscription.value) {
            // Handle subscription payment
            
            // Create payment method for subscription
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
        } else {
            // Handle individual lesson payment
            const response = await fetch('/api/payments/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userStore.token}`
                },
                body: JSON.stringify({
                    amount: props.amount,
                    planId: null // Individual lesson payment
                })
            });

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create payment intent')
            }

            const { clientSecret } = await response.json()

            // Create payment method manually to avoid redirects
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

            // Confirm the payment intent without redirect
            const { error: confirmError, paymentIntent } = await stripe.value.confirmCardPayment(clientSecret, {
                payment_method: paymentMethod.id
            });

            if (confirmError) {
                throw new Error(confirmError.message);
            }

            // Check if payment was successful
            if (paymentIntent && paymentIntent.status === 'succeeded') {
                paymentSuccess.value = true
                emit('payment-success')
            } else {
                throw new Error('Payment was not successful')
            }
        }
    } catch (err) {
        console.error('Payment error:', err)
        error.value = err.message || 'Payment failed'
        emit('payment-error', err)
    } finally {
        processing.value = false
    }
}
</script>

<style scoped>
.payment-form {
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
    color: var(--secondary-color);
    margin: 0;
    font-size: var(--font-size-base);
}

.payment-element {
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    background: var(--background-light);
    min-height: 300px;
    max-height: 500px;
    overflow-y: auto;
}

.loading-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--secondary-color);
}

.success-icon {
    font-size: var(--font-size-2xl);
    color: var(--success-color);
    margin-bottom: var(--spacing-md);
}
</style> 