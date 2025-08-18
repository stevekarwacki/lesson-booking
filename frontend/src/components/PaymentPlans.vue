<template>
    <div class="payment-plans">
        <div v-for="plan in plans" :key="plan.id" class="card">
            <div class="card-header">
                <h3>{{ plan.name }}</h3>
                <p class="plan-type">{{ plan.type === 'membership' ? 'Membership' : 'Lesson Package' }}</p>
            </div>
            
            <div class="card-body">
                <p class="price">${{ plan.price }}{{ plan.type === 'membership' ? ' / month' : '' }}</p>
                <p v-if="plan.type === 'one-time'" class="credits">{{ plan.credits }} Lesson Credits</p>
                <p v-if="plan.type === 'membership'" class="membership-benefit">Enables weekly recurring lessons</p>
                <p v-if="plan.description" class="description">
                    {{ plan.description }}
                </p>
            </div>

            <div v-if="selectedPlan?.id === plan.id" class="card-footer">
                <StripePaymentForm
                    :amount="plan.price"
                    :planId="plan.id"
                    @payment-success="handlePaymentSuccess"
                    @payment-error="handlePaymentError"
                />
            </div>

            <button 
                v-else
                class="form-button"
                @click="selectPlan(plan)"
                :disabled="processing"
            >
                {{ processing ? 'Processing...' : 'Purchase' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import StripePaymentForm from './StripePaymentForm.vue'

const processing = ref(false)
const error = ref(null)
const selectedPlan = ref(null)

const props = defineProps({
    plans: {
        type: Array,
        required: true
    }
})

const selectPlan = (plan) => {
    selectedPlan.value = plan
}

const handlePaymentSuccess = async () => {
    try {
        processing.value = true
        error.value = null

        // The StripePaymentForm already handles the purchase for lesson packages
        // For memberships, the subscription is handled by the subscription endpoint
        // So we don't need to call the purchase endpoint here
        
        // Wait a moment to show the success message before resetting
        setTimeout(() => {
            emit('purchase-success')
            selectedPlan.value = null
        }, 7000)
    } catch (err) {
        error.value = err.message || 'Failed to process payment'
        console.error('Payment error:', err)
    } finally {
        processing.value = false
    }
}

const handlePaymentError = (err) => {
    error.value = err.message || 'Payment failed'
    console.error('Payment error:', err)
    selectedPlan.value = null
}

const emit = defineEmits(['purchase-success'])
</script>

<style scoped>
.payment-plans {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    margin-top: var(--spacing-md);
}

.card {
    background: var(--background-light);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.card-header {
    text-align: center;
    margin-bottom: var(--spacing-md);
}

.card-header h3 {
    margin: 0;
    color: var(--secondary-color);
    font-size: var(--font-size-xl);
}

.plan-type {
    margin: var(--spacing-sm) 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.card-body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
}

.price {
    font-size: var(--font-size-2xl);
    font-weight: bold;
    color: var(--primary-color);
    margin: 0;
}

.credits {
    font-size: var(--font-size-lg);
    color: var(--text-primary);
    margin: 0;
}

.membership-benefit {
    font-size: var(--font-size-lg);
    color: var(--text-primary);
    margin: 0;
}

.duration {
    color: var(--text-secondary);
    margin: 0;
}

.description {
    color: var(--text-secondary);
    margin: var(--spacing-sm) 0 0;
    font-size: var(--font-size-sm);
}

.card-footer {
    margin-top: var(--spacing-md);
}

@media (max-width: 768px) {
    .payment-plans {
        grid-template-columns: 1fr;
    }
}
</style>
