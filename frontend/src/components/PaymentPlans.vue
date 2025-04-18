<template>
    <div class="payment-plans">
        <div v-for="plan in plans" :key="plan.id" class="plan-card">
            <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <p class="plan-type">{{ plan.type === 'package' ? 'Lesson Package' : 'Membership' }}</p>
            </div>
            
            <div class="plan-details">
                <p class="price">${{ plan.price }}</p>
                <p class="credits">{{ plan.credits }} Lesson Credits</p>
                <p v-if="plan.type === 'membership'" class="duration">
                    {{ plan.duration_days }} days
                </p>
                <p v-if="plan.description" class="description">
                    {{ plan.description }}
                </p>
            </div>

            <button 
                class="purchase-button"
                @click="purchasePlan(plan)"
                :disabled="processing"
            >
                {{ processing ? 'Processing...' : 'Purchase' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { currentUser } from '../stores/userStore'

const props = defineProps({
    plans: {
        type: Array,
        required: true
    }
})

const processing = ref(false)
const error = ref(null)

const purchasePlan = async (plan) => {
    processing.value = true
    error.value = null
    
    try {
        const response = await fetch('/api/payments/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
            },
            body: JSON.stringify({
                planId: plan.id,
                paymentMethod: 'cash' // For now
            })
        })
        
        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to process payment')
        }
        
        const data = await response.json()
        if (data.success) {
            // Emit event to parent to refresh credits and transactions
            emit('purchase-success')
        } else {
            throw new Error('Purchase was not successful')
        }
    } catch (err) {
        error.value = err.message || 'Failed to process payment'
        console.error('Payment error:', err)
    } finally {
        processing.value = false
    }
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

.plan-card {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.plan-header {
    text-align: center;
    margin-bottom: var(--spacing-md);
}

.plan-header h3 {
    margin: 0;
    color: var(--secondary-color);
    font-size: 1.5rem;
}

.plan-type {
    margin: var(--spacing-xs) 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.plan-details {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
}

.price {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
    margin: 0;
}

.credits {
    font-size: 1.2rem;
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
    font-size: 0.9rem;
}

.purchase-button {
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

.purchase-button:hover:not(:disabled) {
    opacity: 0.7;
}

.purchase-button:disabled {
    background: var(--text-secondary);
    cursor: not-allowed;
}

@media (max-width: 768px) {
    .payment-plans {
        grid-template-columns: 1fr;
    }
}
</style>
