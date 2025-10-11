<template>
    <div class="payments-page">
        <h1>Payments & Credits</h1>
        
        <div class="credit-balance card">
            <h2>Your Pre-paid Lessons</h2>
            <div class="balance-info">
                <div v-if="creditBreakdown[30].credits > 0" class="credit-type">
                    <p class="credits-amount">{{ creditBreakdown[30].credits }} Pre-paid 30-Minute Lessons</p>
                    <p v-if="creditBreakdown[30].next_expiry" class="expiry-info">
                        Next expiry: {{ formatDate(creditBreakdown[30].next_expiry) }}
                    </p>
                </div>
                <div v-if="creditBreakdown[60].credits > 0" class="credit-type">
                    <p class="credits-amount">{{ creditBreakdown[60].credits }} Pre-paid 60-Minute Lessons</p>
                    <p v-if="creditBreakdown[60].next_expiry" class="expiry-info">
                        Next expiry: {{ formatDate(creditBreakdown[60].next_expiry) }}
                    </p>
                </div>
                <div v-if="creditBreakdown[30].credits === 0 && creditBreakdown[60].credits === 0" class="no-credits">
                    <p class="credits-amount">No Pre-paid Lessons</p>
                    <p class="expiry-info">Purchase a lesson package below to get started</p>
                </div>
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
                
                <!-- Subscription Management Actions -->
                <div class="subscription-actions">
                    <button class="form-button form-button-danger" @click="openCancellationModal(subscription)">
                        Cancel Subscription
                    </button>
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
                    <div class="transaction-info">
                        <span class="transaction-date">{{ formatDate(transaction.created_at) }}</span>
                        <span class="transaction-name">{{ transaction.plan_name || 'Payment' }}</span>
                        <div class="transaction-payment-info">
                            <span class="payment-method" :class="`payment-method-${transaction.payment_method}`">
                                {{ formatPaymentMethod(transaction.payment_method) }}
                            </span>
                            <span v-if="transaction.payment_method === 'in-person'" 
                                  class="payment-status" 
                                  :class="`payment-status-${transaction.status}`"
                                  :style="{ color: getPaymentStatusColor(transaction) }">
                                {{ formatPaymentStatus(transaction.status) }}
                            </span>
                        </div>
                    </div>
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

        <!-- Subscription Cancellation Modal -->
        <div v-if="showCancellationModal" class="modal-overlay" @click="closeCancellationModal">
            <div class="modal-content" @click.stop>
                <div class="modal-header">
                    <h3>Cancel Subscription</h3>
                    <button class="modal-close" @click="closeCancellationModal">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div v-if="!cancellationPreview" class="loading-state">
                        <p>Loading cancellation details...</p>
                    </div>
                    
                    <div v-else-if="!cancellationPreview.cancellationPreview.creditCalculation.eligible" class="cancellation-ineligible">
                        <p class="error-message">{{ cancellationPreview.cancellationPreview.creditCalculation.reason }}</p>
                    </div>
                    
                    <div v-else class="cancellation-details">
                        <div class="subscription-summary">
                            <h4>{{ cancellationPreview.subscription.plan.name }}</h4>
                            <p>Monthly cost: ${{ cancellationPreview.subscription.plan.price }}</p>
                            <p>Current period: {{ formatDate(cancellationPreview.subscription.current_period_start) }} - {{ formatDate(cancellationPreview.subscription.current_period_end) }}</p>
                        </div>
                        
                        <div class="credit-compensation">
                            <h4>Credit Compensation</h4>
                            <p>Current credits: {{ cancellationPreview.currentCredits.total }}</p>
                            <p>Credits to be awarded: <strong>{{ cancellationPreview.cancellationPreview.creditsToBeAwarded }}</strong></p>
                            <p>Total credits after cancellation: <strong>{{ cancellationPreview.cancellationPreview.creditsAfterCancellation }}</strong></p>
                        </div>
                        
                        <div v-if="cancellationPreview.cancellationPreview.hasRecurringBooking" class="warning-section">
                            <h4>⚠️ Important Notice</h4>
                            <p>Your weekly recurring lesson will be canceled:</p>
                            <p><strong>{{ getDayName(cancellationPreview.cancellationPreview.recurringBookingDetails.dayOfWeek) }}</strong> at <strong>{{ formatTime(slotToTime(cancellationPreview.cancellationPreview.recurringBookingDetails.startSlot)) }}</strong></p>
                        </div>
                        
                        <div class="cancellation-warnings">
                            <ul>
                                <li>Subscription will be canceled immediately</li>
                                <li>No refunds will be issued to your payment method</li>
                                <li>You will receive lesson credits as compensation</li>
                                <li v-if="cancellationPreview.cancellationPreview.hasRecurringBooking">Your weekly lesson schedule will be removed</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="form-button form-button-secondary" @click="closeCancellationModal" :disabled="cancelling">
                        {{ cancellationPreview?.cancellationPreview?.creditCalculation?.alreadyCancelled ? 'Close' : 'Keep Subscription' }}
                    </button>
                    <button 
                        v-if="cancellationPreview?.cancellationPreview?.creditCalculation?.eligible"
                        class="form-button form-button-danger" 
                        @click="confirmCancellation"
                        :disabled="cancelling"
                    >
                        {{ cancelling ? 'Cancelling...' : 'Confirm Cancellation' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PaymentPlans from '../components/PaymentPlans.vue'
import RecurringBookingModal from '../components/RecurringBookingModal.vue'
import { useUserStore } from '../stores/userStore'
import { useCredits } from '../composables/useCredits'
import { formatDate, formatTime, slotToTime } from '../utils/timeFormatting'
import { getPaymentStatusColor, formatPaymentMethod, formatPaymentStatus } from '../utils/paymentUtils'

const userStore = useUserStore()

// Use credits composable for credit state management
const { 
    userCredits, 
    creditBreakdown, 
    nextExpiry,
    fetchCredits 
} = useCredits()
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

// Cancellation modal state
const showCancellationModal = ref(false)
const cancellationPreview = ref(null)
const cancelling = ref(false)

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

// fetchCredits is now provided by the useCredits composable

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

// Cancellation modal management
const openCancellationModal = async (subscription) => {
    cancelling.value = false;
    showCancellationModal.value = true;
    try {
        const response = await fetch(`/api/subscriptions/preview-cancellation/${subscription.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch cancellation preview');
        }

        cancellationPreview.value = await response.json();
        
        // Handle automatic sync during preview
        if (cancellationPreview.value?.cancellationPreview?.creditCalculation?.wasSynced) {
            // Sync happened automatically during preview - close modal and refresh
            alert('Your subscription status has been synchronized. It was already cancelled in Stripe.');
            closeCancellationModal();
            await refreshData(); // Refresh all data to show updated status
            return;
        }
    } catch (err) {
        error.value = 'Error fetching cancellation preview: ' + err.message;
        console.error('Error fetching cancellation preview:', err);
        cancellationPreview.value = null;
    }
};

const closeCancellationModal = () => {
    showCancellationModal.value = false;
    cancellationPreview.value = null;
};

const confirmCancellation = async () => {
    if (!cancellationPreview.value?.cancellationPreview?.creditCalculation?.eligible) {
        alert('Cancellation is not eligible based on your current plan and credits.');
        return;
    }

    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
        return;
    }

    cancelling.value = true;
    try {
        const response = await fetch('/api/subscriptions/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                subscriptionId: cancellationPreview.value.subscription.id
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to cancel subscription');
        }

        const result = await response.json();
        
        // Handle different success scenarios
        if (result.cancellation.wasSyncIssue) {
            alert('Your subscription status has been synchronized. It was already cancelled in Stripe.');
        } else if (result.credits.awarded > 0) {
            alert(`Your subscription has been cancelled successfully! You received ${result.credits.awarded} lesson credits as compensation.`);
        } else {
            alert('Your subscription has been cancelled successfully!');
        }
        
        closeCancellationModal();
        await refreshData(); // Refresh all data
    } catch (err) {
        error.value = 'Error cancelling subscription: ' + err.message;
        console.error('Error cancelling subscription:', err);
    } finally {
        cancelling.value = false;
    }
};

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
    flex-direction: column;
    gap: var(--spacing-md);
}

.credit-type {
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
}

.no-credits {
    padding: var(--spacing-md);
    border: 1px dashed var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
    text-align: center;
    opacity: 0.7;
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

.transaction-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.transaction-payment-info {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
}

.payment-method {
    font-size: 0.85rem;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.payment-method-stripe {
    background-color: #e3f2fd;
    color: #1976d2;
}

.payment-method-credits {
    background-color: #f3e5f5;
    color: #7b1fa2;
}

.payment-method-in-person {
    background-color: #fff3e0;
    color: #f57c00;
}

.payment-status {
    font-size: 0.85rem;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.payment-status-outstanding {
    background-color: #fff8e1;
}

.payment-status-completed {
    background-color: #e8f5e8;
}

.payment-status-pending {
    background-color: #f5f5f5;
}

.payment-status-failed {
    background-color: #ffebee;
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

.subscription-actions {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-color);
    text-align: right;
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

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    width: 90%;
    max-width: 600px;
    max-height: 90%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
    background: var(--background-light);
}

.modal-header h3 {
    margin: 0;
    color: var(--secondary-color);
}

.modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-secondary);
    transition: color 0.2s ease;
}

.modal-close:hover {
    color: var(--text-primary);
}

.modal-body {
    padding: var(--spacing-md);
    overflow-y: auto;
    flex-grow: 1;
}

.loading-state, .cancellation-ineligible, .cancellation-details, .credit-compensation, .warning-section, .cancellation-warnings {
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background: var(--background-light);
    margin-bottom: var(--spacing-md);
}

.error-message {
    color: #dc2626;
    font-weight: bold;
    margin-bottom: var(--spacing-sm);
}

.cancellation-details h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    color: var(--primary-color);
}

.cancellation-details p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
}

.credit-compensation h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    color: var(--primary-color);
}

.credit-compensation p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
}

.warning-section h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    color: #f59e0b; /* Warning color */
}

.warning-section p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
}

.cancellation-warnings ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.cancellation-warnings li {
    margin-bottom: var(--spacing-xs);
    color: var(--text-secondary);
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--border-color);
    background: var(--background-light);
}

.modal-footer .form-button {
    padding: var(--spacing-sm) var(--spacing-md);
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
    
    .transaction-info {
        width: 100%;
    }
    
    .transaction-payment-info {
        flex-wrap: wrap;
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

    .subscription-actions {
        text-align: center;
        margin-top: var(--spacing-md);
    }

    .modal-content {
        width: 95%;
        margin: var(--spacing-sm);
    }

    .modal-footer {
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .modal-footer .form-button {
        width: 100%;
    }
}
</style> 