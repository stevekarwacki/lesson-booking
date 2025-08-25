<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import TabbedModal from './TabbedModal.vue'
import TabbedModalTab from './TabbedModalTab.vue'
import BookingList from './BookingList.vue'

const userStore = useUserStore()
const users = ref([])
const error = ref('')
const success = ref('')
const showAddForm = ref(false)
const showEditModal = ref(false)
const editingUser = ref(null)
const userSubscription = ref(null)
const subscriptionLoading = ref(false)
const loading = ref(true)
const showCreateSubscriptionModal = ref(false)
const availablePlans = ref([])
const selectedPlan = ref('')
const adminNote = ref('')
const creatingSubscription = ref(false)

// User bookings data
const userBookings = ref([])
const loadingUserBookings = ref(false)

// Computed property to safely get current user ID
const currentUserId = computed(() => userStore.user?.id)

// New user form data
const newUser = ref({
    name: '',
    email: '',
    password: '',
    role: 'student'
})

const resetNewUser = () => {
    newUser.value = {
        name: '',
        email: '',
        password: '',
        role: 'student'
    }
}

const addUser = async () => {
    if (!newUser.value.name || !newUser.value.email || !newUser.value.password) {
        error.value = 'All fields are required'
        return
    }

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(newUser.value)
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create user')
        }

        success.value = 'User created successfully'
        showAddForm.value = false
        resetNewUser()
        await fetchUsers()
    } catch (err) {
        error.value = 'Error creating user: ' + err.message
    }
}

const fetchUsers = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        users.value = data;
    } catch (err) {
        error.value = 'Error fetching users: ' + err.message;
        console.error('Error fetching users:', err);
    } finally {
        loading.value = false;
    }
};

const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        await fetchUsers();
        success.value = 'User deleted successfully';
    } catch (err) {
        error.value = 'Error deleting user: ' + err.message;
        console.error('Error deleting user:', err);
    } finally {
        loading.value = false;
    }
};

const deleteUserFromModal = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will permanently remove all associated data.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${editingUser.value.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        success.value = 'User deleted successfully';
        closeEditModal();
        await fetchUsers();
    } catch (err) {
        error.value = 'Error deleting user: ' + err.message;
        console.error('Error deleting user:', err);
    }
};

const fetchUserSubscription = async (userId) => {
    try {
        subscriptionLoading.value = true
        const response = await fetch(`/api/admin/users/${userId}/subscription`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            userSubscription.value = await response.json()
        } else {
            userSubscription.value = null
        }
    } catch (err) {
        console.error('Error fetching user subscription:', err)
        userSubscription.value = null
    } finally {
        subscriptionLoading.value = false
    }
}

const openEditModal = (user) => {
    editingUser.value = { ...user }
    showEditModal.value = true
    fetchUserSubscription(user.id)
    fetchUserBookings(user.id)
}

const closeEditModal = () => {
    editingUser.value = null
    userSubscription.value = null
    userBookings.value = []
    showEditModal.value = false
}

const saveUserEdit = async () => {
    try {
        // Update role
        const roleResponse = await fetch(`/api/admin/users/${editingUser.value.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({ role: editingUser.value.role })
        });
        
        if (!roleResponse.ok) throw new Error('Failed to update user role');

        // Update approval status
        const approvalResponse = await fetch(`/api/users/${editingUser.value.id}/approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({ isApproved: editingUser.value.is_approved })
        });

        if (!approvalResponse.ok) throw new Error('Failed to update approval status');
        
        success.value = 'User updated successfully';
        closeEditModal();
        await fetchUsers();
    } catch (err) {
        error.value = 'Error updating user: ' + err.message;
    }
}

const cancelUserSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this user\'s subscription?')) {
        return
    }
    
    try {
        const response = await fetch(`/api/admin/subscriptions/${userSubscription.value.id}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const result = await response.json()
            
            // Handle different success scenarios
            if (result.cancellation.wasSyncIssue) {
                success.value = 'Subscription status synchronized - was already cancelled in Stripe'
            } else if (result.credits.awarded > 0) {
                success.value = `Subscription cancelled successfully. User received ${result.credits.awarded} lesson credits as compensation.`
            } else {
                success.value = 'Subscription cancelled successfully'
            }
            
            await fetchUserSubscription(editingUser.value.id)
        } else {
            const errorData = await response.json()
            error.value = errorData.error || errorData.message || 'Failed to cancel subscription'
        }
    } catch (err) {
        error.value = 'Error cancelling subscription: ' + err.message
    }
}

const reactivateUserSubscription = async () => {
    if (!confirm('Are you sure you want to reactivate this user\'s subscription?')) {
        return
    }
    
    try {
        const response = await fetch(`/api/admin/subscriptions/${userSubscription.value.id}/reactivate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const result = await response.json()
            
            // Handle different success scenarios
            if (result.reactivation.reactivationType === 'removed_cancel_at_period_end') {
                success.value = 'Subscription reactivated successfully - removed scheduled cancellation'
            } else if (result.reactivation.reactivationType === 'already_active') {
                success.value = 'Subscription is already active'
            } else {
                success.value = 'Subscription reactivated successfully'
            }
            
            await fetchUserSubscription(editingUser.value.id)
        } else {
            const errorData = await response.json()
            error.value = errorData.error || errorData.message || 'Failed to reactivate subscription'
            
            // Show helpful suggestions for common issues
            if (errorData.suggestion) {
                error.value += ` Suggestion: ${errorData.suggestion}`
            }
        }
    } catch (err) {
        error.value = 'Error reactivating subscription: ' + err.message
    }
}

const createUserSubscription = async () => {
    // Fetch available membership plans
    try {
        const response = await fetch('/api/payments/plans', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const plans = await response.json()
            availablePlans.value = plans.filter(plan => plan.type === 'membership')
            
            if (availablePlans.value.length === 0) {
                error.value = 'No membership plans available for subscription creation'
                return
            }
            
            // Reset form
            selectedPlan.value = ''
            adminNote.value = ''
            showCreateSubscriptionModal.value = true
        } else {
            error.value = 'Failed to fetch available plans'
        }
    } catch (err) {
        error.value = 'Error fetching plans: ' + err.message
    }
}

const closeCreateSubscriptionModal = () => {
    showCreateSubscriptionModal.value = false
    selectedPlan.value = ''
    adminNote.value = ''
}

const confirmCreateSubscription = async () => {
    if (!selectedPlan.value) {
        error.value = 'Please select a plan'
        return
    }
    
    if (!confirm('Are you sure you want to create this subscription for the user?')) {
        return
    }
    
    creatingSubscription.value = true
    
    try {
        const response = await fetch(`/api/admin/users/${editingUser.value.id}/subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                planId: selectedPlan.value,
                note: adminNote.value
            })
        })
        
        if (response.ok) {
            const result = await response.json()
            success.value = `Subscription created successfully for ${editingUser.value.name}`
            closeCreateSubscriptionModal()
            await fetchUserSubscription(editingUser.value.id)
        } else {
            const errorData = await response.json()
            error.value = errorData.error || 'Failed to create subscription'
            
            // Show helpful suggestions for common issues
            if (errorData.suggestion) {
                error.value += ` Suggestion: ${errorData.suggestion}`
            }
        }
    } catch (err) {
        error.value = 'Error creating subscription: ' + err.message
    } finally {
        creatingSubscription.value = false
    }
}

// User booking management functions
const fetchUserBookings = async (userId) => {
    try {
        loadingUserBookings.value = true
        const response = await fetch(`/api/calendar/student/${userId}?includeAll=true`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch user bookings')
        }
        
        const bookings = await response.json()
        
        // Transform bookings for BookingList component
        userBookings.value = bookings.map(booking => ({
            id: booking.id,
            date: booking.date,
            startTime: formatTime(slotToTime(booking.start_slot)),
            endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
            instructorName: booking.Instructor.User.name,
            status: booking.status || 'booked',
            isRecurring: false,
            originalBooking: booking
        }))
    } catch (err) {
        console.error('Error fetching user bookings:', err)
        userBookings.value = []
    } finally {
        loadingUserBookings.value = false
    }
}

const handleEditUserBooking = (booking) => {
    console.log('Edit user booking:', booking)
    // TODO: Implement booking editing for admin/instructor
    alert('Admin booking editing will be implemented here')
}

const handleCancelUserBooking = (booking) => {
    console.log('Cancel user booking:', booking)
    // TODO: Implement booking cancellation for admin/instructor
    alert('Admin booking cancellation will be implemented here')
}

const handleViewUserBooking = (booking) => {
    console.log('View user booking:', booking)
    // TODO: Implement booking viewing for admin/instructor
    alert('Admin booking viewing will be implemented here')
}

// Utility functions for time formatting (matching UserBookings component)
const slotToTime = (slot) => {
    const hours = Math.floor(slot / 4)
    const minutes = (slot % 4) * 15
    return { hours, minutes }
}

const formatTime = (timeObj) => {
    const date = new Date()
    date.setHours(timeObj.hours, timeObj.minutes)
            return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}

onMounted(async () => {
    await fetchUsers()
})
</script>

<template>
    <div class="user-manager card">
        <div class="header-actions">
            <button 
                class="form-button"
                @click="showAddForm = true"
            >
                Add New User
            </button>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <!-- Add User Modal -->
        <div v-if="showAddForm" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New User</h3>
                    <button class="modal-close" @click="showAddForm = false">&times;</button>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="addUser">
                        <div class="form-group">
                            <label class="form-label">Name:</label>
                            <input 
                                v-model="newUser.name"
                                type="text"
                                class="form-input"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Email:</label>
                            <input 
                                v-model="newUser.email"
                                type="email"
                                class="form-input"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Password:</label>
                            <input 
                                v-model="newUser.password"
                                type="password"
                                class="form-input"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Role:</label>
                            <select 
                                v-model="newUser.role"
                                class="form-input"
                            >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div class="modal-footer">
                            <button 
                                type="button"
                                class="form-button form-button-cancel"
                                @click="showAddForm = false"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                class="form-button"
                            >
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div v-if="loading" class="loading">Loading users...</div>

        <div v-else class="users-table">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th v-if="$mq.lgPlus">Email</th>
                        <th v-if="$mq.lgPlus">Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id">
                        <td>{{ user.name }}</td>
                        <td v-if="$mq.lgPlus">{{ user.email }}</td>
                        <td v-if="$mq.lgPlus">{{ user.role }}</td>
                        <td class="user-actions">
                            <button 
                                class="form-button form-button-edit"
                                @click="openEditModal(user)"
                            >
                                Manage
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Edit Modal -->
        <TabbedModal :show="showEditModal" title="Edit User" @close="closeEditModal">
            
            <TabbedModalTab label="Profile" default>
                <form @submit.prevent="saveUserEdit">
                    <div class="form-group">
                        <label class="form-label">Name:</label>
                        <div class="form-input">
                            <input type="text" :value="editingUser?.name" disabled class="form-input" />
                            <small class="form-text">Name cannot be changed from this interface</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Email:</label>
                        <div class="form-input">
                            <input type="email" :value="editingUser?.email" disabled class="form-input" />
                            <small class="form-text">Email cannot be changed from this interface</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="editRole">Role:</label>
                        <div class="form-input">
                            <select 
                                id="editRole"
                                v-model="editingUser.role"
                                class="form-input"
                            >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <input 
                                type="checkbox"
                                v-model="editingUser.is_approved"
                                class="form-input"
                            >
                            Account Approved
                        </label>
                    </div>

                    <div v-if="error" class="form-message error-message">
                        {{ error }}
                    </div>

                    <div v-if="success" class="form-message success-message">
                        {{ success }}
                    </div>
                    
                    <div class="form-actions">
                        <button 
                            type="button"
                            class="form-button form-button-cancel"
                            @click="closeEditModal"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            class="form-button"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </TabbedModalTab>

            <TabbedModalTab label="Memberships">
                <div class="memberships-tab">
                    <div v-if="subscriptionLoading" class="loading-message">
                        Loading subscription information...
                    </div>
                    
                    <div v-else-if="userSubscription" class="subscription-info">                       
                        <div class="subscription-details">
                            <div class="info-group">
                                <label class="info-label">Plan:</label>
                                <span class="info-value">{{ userSubscription.plan_name }}</span>
                            </div>
                            
                            <div class="info-group">
                                <label class="info-label">Status:</label>
                                <span :class="['status-badge', `status-${userSubscription.status}`]">
                                    {{ userSubscription.status }}
                                </span>
                            </div>
                            
                            <div class="info-group">
                                <label class="info-label">Next Billing:</label>
                                <span class="info-value">
                                    {{ new Date(userSubscription.current_period_end).toLocaleDateString() }}
                                </span>
                            </div>
                            
                            <div class="info-group">
                                <label class="info-label">Amount:</label>
                                <span class="info-value">
                                    ${{ (userSubscription.amount / 100).toFixed(2) }} / {{ userSubscription.interval }}
                                </span>
                            </div>
                            
                            <div v-if="userSubscription.cancel_at_period_end" class="info-group">
                                <label class="info-label">Cancellation:</label>
                                <span class="info-value warning">
                                    Will cancel at end of current period
                                </span>
                            </div>
                            

                        </div>
                        
                        <div class="subscription-actions">
                            <button 
                                v-if="!userSubscription.cancel_at_period_end && (userSubscription.status === 'active' || userSubscription.status === 'trialing')"
                                type="button"
                                class="form-button form-button-cancel"
                                @click="cancelUserSubscription"
                            >
                                Cancel Subscription
                            </button>
                            
                            <button 
                                v-if="userSubscription.cancel_at_period_end"
                                type="button"
                                class="form-button"
                                @click="reactivateUserSubscription"
                            >
                                Reactivate Subscription
                            </button>
                            
                            <button 
                                v-if="userSubscription.status === 'cancelled' || userSubscription.status === 'canceled'"
                                type="button"
                                class="form-button"
                                @click="createUserSubscription"
                            >
                                Create New Subscription
                            </button>
                        </div>
                    </div>
                    
                    <div v-else class="no-subscription">
                        <p>This user does not have a membership.</p>
                        
                        <div class="subscription-actions">
                            <button 
                                type="button"
                                class="form-button"
                                @click="createUserSubscription"
                            >
                                Create Subscription
                            </button>
                        </div>
                    </div>
                </div>
            </TabbedModalTab>

            <TabbedModalTab label="Actions">
                <div class="actions-tab">
                    <div class="actions-section">
                        <h4>User Management</h4>
                        <p>Perform administrative actions on this user account.</p>
                        
                        <div class="action-group">
                            <h5>Account Information</h5>
                            <div class="action-item">
                                <div class="action-info">
                                    <strong>User ID:</strong> {{ editingUser?.id }}
                                </div>
                                <div class="action-info">
                                    <strong>Account Status:</strong> 
                                    <span :class="['status-badge', editingUser?.is_approved ? 'status-active' : 'status-inactive']">
                                        {{ editingUser?.is_approved ? 'Approved' : 'Pending Approval' }}
                                    </span>
                                </div>
                                <div class="action-info">
                                    <strong>Role:</strong> {{ editingUser?.role }}
                                </div>
                            </div>
                        </div>

                        <div class="action-group danger-zone">
                            <div class="action-item">
                                <div class="action-info">
                                    <strong>Delete User Account</strong>
                                </div>
                                <div class="action-description">
                                    <p>Permanently remove this user from the system. This action cannot be undone.</p>
                                    <p><strong>Warning:</strong> This will also delete all associated data including:</p>
                                    <ul>
                                        <li>User profile information</li>
                                        <li>Lesson bookings and history</li>
                                        <li>Subscription records</li>
                                        <li>Payment history</li>
                                        <li>Instructor information (if applicable)</li>
                                    </ul>
                                </div>
                                <button 
                                    type="button"
                                    class="form-button form-button-danger"
                                    @click="deleteUserFromModal"
                                    :disabled="editingUser?.id === currentUserId"
                                >
                                    {{ editingUser?.id === currentUserId ? 'Cannot Delete Own Account' : 'Delete User Account' }}
                                </button>
                                <p v-if="editingUser?.id === currentUserId" class="warning-text">
                                    You cannot delete your own account from this interface.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </TabbedModalTab>

            <TabbedModalTab label="Bookings">
                <div class="bookings-tab">
                    <div v-if="userBookings.length > 0 || loadingUserBookings">
                        <BookingList
                            :bookings="userBookings"
                            :loading="loadingUserBookings"
                            :userId="editingUser?.id"
                            :userRole="userStore.isAdmin ? 'admin' : 'instructor'"
                            @edit-booking="handleEditUserBooking"
                            @cancel-booking="handleCancelUserBooking"
                            @view-booking="handleViewUserBooking"
                        />
                    </div>
                    <div v-else class="no-bookings-message">
                        <p>This user has no bookings to display.</p>
                    </div>
                </div>
            </TabbedModalTab>
        </TabbedModal>
    </div>
    
    <!-- Create Subscription Modal -->
    <div v-if="showCreateSubscriptionModal" class="modal-overlay" @click="closeCreateSubscriptionModal">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h3>Create Subscription for {{ editingUser?.name }}</h3>
                <button class="modal-close" @click="closeCreateSubscriptionModal">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="form-group">
                    <label for="plan-select" class="form-label">Select Membership Plan:</label>
                    <select 
                        id="plan-select" 
                        v-model="selectedPlan" 
                        class="form-input"
                        :disabled="creatingSubscription"
                    >
                        <option value="">Choose a plan...</option>
                        <option 
                            v-for="plan in availablePlans" 
                            :key="plan.id" 
                            :value="plan.id"
                        >
                            {{ plan.name }} - ${{ plan.price }}/month ({{ plan.duration_days }} days)
                        </option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="admin-note" class="form-label">Admin Note (optional):</label>
                    <textarea 
                        id="admin-note"
                        v-model="adminNote"
                        class="form-input"
                        placeholder="Enter a note about this subscription (e.g., 'Promotional membership', 'Instructor benefit', etc.)"
                        rows="3"
                        :disabled="creatingSubscription"
                    ></textarea>
                </div>
                
                <div class="subscription-info">
                    <p class="info-text">
                        <strong>Note:</strong> This will create a complimentary subscription for the user without requiring payment. 
                        The subscription will be active immediately and will be tracked in Stripe as a trial subscription.
                    </p>
                </div>
            </div>
            
            <div class="modal-footer">
                <button 
                    class="form-button form-button-secondary" 
                    @click="closeCreateSubscriptionModal"
                    :disabled="creatingSubscription"
                >
                    Cancel
                </button>
                <button 
                    class="form-button" 
                    @click="confirmCreateSubscription"
                    :disabled="creatingSubscription || !selectedPlan"
                >
                    {{ creatingSubscription ? 'Creating...' : 'Create Subscription' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.user-manager {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
}

.users-table {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--spacing-md);
}

th, td {
    padding: var(--spacing-sm);
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background-color: var(--background-color);
    font-weight: 600;
    color: var(--secondary-color);
}

.delete-button {
    padding: 4px 8px;
    background-color: var(--error-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
}

.delete-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f5f5f5;
}

.header-actions {
    margin-bottom: var(--spacing-lg);
}

.add-button {
    background-color: var(--primary-color);
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
}

.add-form {
    background: var(--background-color);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-lg);
}

.add-form h3 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--secondary-color);
}

.submit-button {
    background-color: var(--success-color);
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
}

.submit-button:hover {
    opacity: 0.9;
}

.actions {
    display: flex;
    gap: var(--spacing-sm);
}

.loading {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-muted);
}

.form-text {
    display: block;
    margin-top: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.memberships-tab {
    min-height: 200px;
}

.loading-message {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

.subscription-info h4,
.no-subscription h4 {
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
}

.subscription-details {
    background: var(--background-hover);
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
}

.info-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--border-color);
}

.info-group:last-child {
    border-bottom: none;
}

.info-label {
    font-weight: 500;
    color: var(--text-primary);
}

.info-value {
    color: var(--text-secondary);
    font-weight: 400;
}

.info-value.warning {
    color: var(--error-color);
    font-weight: 500;
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
    text-transform: capitalize;
}

.status-active {
    background: var(--success-color);
    color: white;
}

.status-cancelled,
.status-canceled {
    background: var(--error-color);
    color: white;
}

.status-past_due {
    background: #ffc107;
    color: #212529;
}

.subscription-actions {
    display: flex;
    gap: var(--spacing-sm);
    justify-content: flex-end;
    margin-top: var(--spacing-md);
}

.no-subscription {
    text-align: center;
    padding: var(--spacing-lg);
}

.no-subscription p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
}

/* Actions tab styles */
.actions-tab {
    min-height: 300px;
    padding: var(--spacing-lg);
}

.actions-section {
    max-width: 600px;
    margin: 0 auto;
}

.actions-section h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-sm);
    color: var(--primary-color);
}

.actions-section > p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
}

.action-group {
    margin-bottom: var(--spacing-lg);
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

.action-group h5 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
    font-size: var(--font-size-md);
}

.action-item {
    padding: var(--spacing-md);
    background: var(--background-light);
    border-radius: var(--border-radius);
}

.action-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
}

.action-info strong {
    color: var(--text-primary);
}

.action-description {
    margin-bottom: var(--spacing-md);
}

.action-description p {
    margin: var(--spacing-xs) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.action-description ul {
    margin: var(--spacing-sm) 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
}

.action-description li {
    margin-bottom: var(--spacing-xs);
}

.danger-zone {
    border-color: var(--error-color);
    background: rgba(255, 0, 0, 0.02);
}

.danger-zone h5 {
    color: var(--error-color);
}

.warning-text {
    margin-top: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-style: italic;
}

/* Bookings tab styles */
.bookings-tab {
    padding: var(--spacing-md);
}

.no-bookings-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
}
</style> 