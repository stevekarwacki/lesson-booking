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

        <div class="subscription-management card" v-if="activeSubscriptions.length > 0">
            <h2>Your Memberships</h2>
            <div v-for="subscription in activeSubscriptions" :key="subscription.id" class="subscription-item">
                <div class="subscription-info">
                    <h3>{{ subscription.PaymentPlan?.name || 'Membership' }}</h3>
                    <p class="subscription-status">Status: {{ subscription.status }}</p>
                    <p class="subscription-period">
                        Current period: {{ formatDate(subscription.current_period_start) }} - {{ formatDate(subscription.current_period_end) }}
                    </p>
                </div>
                
                <!-- Recurring Booking Management -->
                <div class="recurring-booking-section">
                    <h4>Weekly Lesson Schedule</h4>
                    <div v-if="getRecurringBooking(subscription.id)">
                        <div class="recurring-booking-info">
                            <p><strong>Day:</strong> {{ getDayName(getRecurringBooking(subscription.id).day_of_week) }}</p>
                            <p><strong>Time:</strong> {{ formatTime(slotToTime(getRecurringBooking(subscription.id).start_slot)) }} - {{ formatTime(slotToTime(getRecurringBooking(subscription.id).start_slot + getRecurringBooking(subscription.id).duration)) }}</p>
                            <p><strong>Instructor:</strong> {{ getRecurringBooking(subscription.id).Instructor?.User?.name }}</p>
                        </div>
                        <div class="recurring-booking-actions">
                            <button class="form-button form-button-secondary" @click="openRecurringModal(subscription, getRecurringBooking(subscription.id))">
                                Change Time
                            </button>
                            <button class="form-button form-button-danger" @click="deleteRecurringBooking(getRecurringBooking(subscription.id).id)">
                                Remove Weekly Schedule
                            </button>
                        </div>
                    </div>
                    <div v-else class="no-recurring-booking">
                        <p>No weekly lesson time set</p>
                        <button class="form-button" @click="openRecurringModal(subscription)">
                            Set Weekly Time
                        </button>
                    </div>
                </div>
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

        <!-- Recurring Booking Modal -->
        <RecurringBookingModal
            v-if="showRecurringModal"
            :subscription="selectedSubscription"
            :existingBooking="selectedRecurringBooking"
            @close="closeRecurringModal"
            @booking-confirmed="handleRecurringBookingConfirmed"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PaymentPlans from '../components/PaymentPlans.vue'
import RecurringBookingModal from '../components/RecurringBookingModal.vue'
import { useUserStore } from '../stores/userStore'
import { formatDate, formatTime, slotToTime } from '../utils/timeFormatting'

const userStore = useUserStore()
const userCredits = ref(0)
const nextExpiry = ref(null)
const transactions = ref([])
const allPlans = ref([])
const activeSubscriptions = ref([])
const recurringBookings = ref([])
const loading = ref(false)
const error = ref(null)

// Recurring booking modal state
const showRecurringModal = ref(false)
const selectedSubscription = ref(null)
const selectedRecurringBooking = ref(null)

const lessonPlans = computed(() => allPlans.value.filter(plan => plan.type === 'one-time'))
const membershipPlans = computed(() => allPlans.value.filter(plan => plan.type === 'membership'))

// Days of the week mapping
const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
]

const getDayName = (dayValue) => {
    const day = daysOfWeek.find(d => d.value === dayValue)
    return day ? day.label : 'Unknown'
}

const getRecurringBooking = (subscriptionId) => {
    return recurringBookings.value.find(booking => booking.subscription_id === subscriptionId)
}

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

// Fetch user's active subscriptions
const fetchSubscriptions = async () => {
    try {
        const response = await fetch(`/api/subscriptions/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch subscriptions');
        }
        
        const data = await response.json();
        // Only show active membership subscriptions
        activeSubscriptions.value = data.filter(sub => 
            sub.status === 'active' && 
            sub.PaymentPlan?.type === 'membership'
        );
    } catch (err) {
        console.error('Error fetching subscriptions:', err);
    }
};

// Fetch user's recurring bookings
const fetchRecurringBookings = async () => {
    try {
        const response = await fetch(`/api/recurring-bookings/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch recurring bookings');
        }
        
        recurringBookings.value = await response.json();
    } catch (err) {
        console.error('Error fetching recurring bookings:', err);
    }
};

// Modal management
const openRecurringModal = (subscription, existingBooking = null) => {
    selectedSubscription.value = subscription
    selectedRecurringBooking.value = existingBooking
    showRecurringModal.value = true
}

const closeRecurringModal = () => {
    showRecurringModal.value = false
    selectedSubscription.value = null
    selectedRecurringBooking.value = null
}

const handleRecurringBookingConfirmed = async (recurringBooking) => {
    closeRecurringModal()
    // Refresh recurring bookings data
    await fetchRecurringBookings()
}

// Delete recurring booking
const deleteRecurringBooking = async (recurringBookingId) => {
    if (!confirm('Are you sure you want to remove your weekly lesson schedule?')) {
        return
    }

    try {
        const response = await fetch(`/api/recurring-bookings/${recurringBookingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to delete recurring booking')
        }

        // Refresh recurring bookings data
        await fetchRecurringBookings()
    } catch (err) {
        error.value = 'Error deleting recurring booking: ' + err.message
        console.error('Error deleting recurring booking:', err)
    }
}

const refreshData = async () => {
    await Promise.all([
        fetchCredits(),
        fetchTransactions(),
        fetchSubscriptions(),
        fetchRecurringBookings()
    ]);
};

onMounted(async () => {
    await Promise.all([
        fetchCredits(),
        fetchPaymentPlans(),
        fetchTransactions(),
        fetchSubscriptions(),
        fetchRecurringBookings()
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

/* Subscription Management Styles */
.subscription-management {
    margin-bottom: var(--spacing-lg);
}

.subscription-item {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    background: var(--background-light);
}

.subscription-item:last-child {
    margin-bottom: 0;
}

.subscription-info h3 {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--primary-color);
}

.subscription-status {
    color: var(--text-secondary);
    margin: var(--spacing-xs) 0;
    text-transform: capitalize;
}

.subscription-period {
    color: var(--text-secondary);
    margin: var(--spacing-xs) 0;
}

.recurring-booking-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-color);
}

.recurring-booking-section h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--secondary-color);
}

.recurring-booking-info {
    background: white;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
    margin-bottom: var(--spacing-md);
}

.recurring-booking-info p {
    margin: var(--spacing-xs) 0;
}

.recurring-booking-actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
}

.no-recurring-booking {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.no-recurring-booking p {
    margin: 0 0 var(--spacing-md) 0;
}

.form-button {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
}

.form-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.form-button:not(.form-button-secondary):not(.form-button-danger) {
    background: var(--primary-color);
    color: white;
}

.form-button:not(.form-button-secondary):not(.form-button-danger):hover:not(:disabled) {
    background: var(--primary-color-dark, #4338ca);
}

.form-button-secondary {
    background: var(--background-light);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.form-button-secondary:hover:not(:disabled) {
    background: var(--border-color);
}

.form-button-danger {
    background: #dc2626;
    color: white;
}

.form-button-danger:hover:not(:disabled) {
    background: #b91c1c;
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
    
    .subscription-item {
        padding: var(--spacing-md);
    }
    
    .recurring-booking-actions {
        flex-direction: column;
    }
    
    .form-button {
        width: 100%;
    }
}
</style> 