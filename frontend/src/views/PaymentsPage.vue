<template>
    <div class="payments-page">
        <h1>Payments & Credits</h1>
        
        <div class="credit-balance card">
            <h2>Your Credit Balance</h2>
            <div class="balance-info">
                <p class="credits-amount">{{ userCredits }} Lesson Credits</p>
                <p v-if="nextExpiry" class="expiry-info">
                    Next expiry: {{ formatDate(nextExpiry) }}
                </p>
            </div>
        </div>

        <div class="payment-options">
            <h2>Purchase Options</h2>
            
            <div class="plans-section">
                <h3>Lesson Packages</h3>
                <PaymentPlans :plans="lessonPlans" @purchase-success="refreshData" />
            </div>

            <div class="plans-section">
                <h3>Memberships</h3>
                <PaymentPlans :plans="membershipPlans" @purchase-success="refreshData" />
            </div>
        </div>

        <div class="transaction-history card">
            <h2>Transaction History</h2>
            <div v-if="transactions.length === 0" class="empty-state">
                <p>No transactions yet</p>
            </div>
            <div v-else class="transactions-list">
                <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item">
                    <span class="transaction-date">{{ formatDate(transaction.created_at) }}</span>
                    <span class="transaction-name">{{ transaction.plan_name }}</span>
                    <span class="transaction-amount">${{ transaction.amount }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PaymentPlans from '../components/PaymentPlans.vue'
import { useUserStore } from '../stores/userStore'
import { formatDate } from '../utils/timeFormatting'

const userStore = useUserStore()
const userCredits = ref(0)
const nextExpiry = ref(null)
const transactions = ref([])
const allPlans = ref([])
const loading = ref(false)
const error = ref(null)

const lessonPlans = computed(() => allPlans.value.filter(plan => plan.type === 'package'))
const membershipPlans = computed(() => allPlans.value.filter(plan => plan.type === 'membership'))

const fetchCredits = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/payments/credits', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch credits');
        }
        
        const data = await response.json();
        userCredits.value = data.total_credits || 0
        nextExpiry.value = data.next_expiry
    } catch (err) {
        error.value = 'Error fetching credits: ' + err.message;
        console.error('Error fetching credits:', err);
    } finally {
        loading.value = false;
    }
};

const fetchPaymentPlans = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/payments/plans', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch payment plans');
        }
        
        const data = await response.json();
        allPlans.value = data;
    } catch (err) {
        error.value = 'Error fetching payment plans: ' + err.message;
        console.error('Error fetching payment plans:', err);
    } finally {
        loading.value = false;
    }
};

const fetchTransactions = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/payments/transactions', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        transactions.value = data;
    } catch (err) {
        error.value = 'Error fetching transactions: ' + err.message;
        console.error('Error fetching transactions:', err);
    } finally {
        loading.value = false;
    }
};

const refreshData = async () => {
    await Promise.all([
        fetchCredits(),
        fetchTransactions()
    ]);
};

onMounted(async () => {
    await Promise.all([
        fetchCredits(),
        fetchPaymentPlans(),
        fetchTransactions()
    ])
})
</script>

<style scoped>
.payments-page {
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    margin-bottom: var(--spacing-lg);
    color: var(--secondary-color);
}

h2 {
    margin-top: 0;
    margin-bottom: var(--spacing-lg);
    color: var(--secondary-color);
}

h3 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--secondary-color);
}

.credit-balance {
    margin-bottom: var(--spacing-lg);
}

.balance-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
}

.credits-amount {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
    margin: 0;
}

.expiry-info {
    color: var(--text-secondary);
    margin: 0;
}

.payment-options {
    margin-bottom: var(--spacing-lg);
}

.plans-section {
    margin-bottom: var(--spacing-lg);
}

.transaction-history {
    margin-top: var(--spacing-lg);
}

.transactions-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.transaction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.transaction-name {
    font-weight: 500;
}

.transaction-date {
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.transaction-amount {
    color: var(--text-secondary);
}

.empty-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

@media (max-width: 768px) {   
    .balance-info {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
    
    .transaction-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }
}
</style> 