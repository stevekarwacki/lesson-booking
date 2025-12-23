<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useUserManagement } from '../composables/useUserManagement'
import { useUserSubscription, usePaymentPlans } from '../composables/useUserSubscription'
import { useUserBookings } from '../composables/useUserBookings'
import TabbedModal from './TabbedModal.vue'
import TabbedModalTab from './TabbedModalTab.vue'
import BookingList from './BookingList.vue'
import SlideTransition from './SlideTransition.vue'
import EditBooking from './EditBooking.vue'
import RefundModal from './RefundModal.vue'
import SearchBar from './SearchBar.vue'
import FilterTabs from './FilterTabs.vue'
import GoogleCalendarSettings from './GoogleCalendarSettings.vue'

const userStore = useUserStore()
const { showSuccess, showError, handleError } = useFormFeedback()

// Vue Query for data fetching
const {
  users: queryUsers,
  instructors,
  isLoadingUsers,
  isLoadingInstructors,
  createUser: createUserMutation,
  isCreatingUser,
  updateUser: updateUserMutation,
  isUpdatingUser,
  createInstructor: createInstructorMutation,
  isCreatingInstructor,
  updateInstructor: updateInstructorMutation,
  isUpdatingInstructor,
  updateUserApproval: updateUserApprovalMutation,
  isUpdatingUserApproval
} = useUserManagement()

// Payment plans (global)
const { plans: availablePlans, isLoadingPlans } = usePaymentPlans()

// Local state
const error = ref('')
const success = ref('')
const showAddForm = ref(false)

// Search and filter state
const searchQuery = ref('')
const activeFilter = ref('student') // Default to Student as requested
const isSearchFocused = ref(false)

// Filter configuration
const filters = [
  { label: 'All', value: 'all' },
  { label: 'Student', value: 'student' },
  { label: 'Instructor', value: 'instructor' },
  { label: 'Admin', value: 'admin' },
  { label: 'Unverified', value: 'unverified' }
]

// Search results for dropdown (only when searching)
const searchResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2 || !queryUsers.value) return []
  
  const query = searchQuery.value.toLowerCase().trim()
  return queryUsers.value.filter(user => {
    const fullName = user.name?.toLowerCase() || ''
    const email = user.email?.toLowerCase() || ''
    
    // Split name into parts for first/last name matching
    const nameParts = fullName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    return (
      fullName.includes(query) ||           // Full name match
      firstName.includes(query) ||          // First name match
      lastName.includes(query) ||           // Last name match
      email.includes(query)                 // Email match
    )
  }).slice(0, 10) // Limit to 10 results for dropdown
})

// Filtered users for table (by filter tabs only, not search)
const filteredUsers = computed(() => {
  if (!queryUsers.value) return []
  
  let filtered = [...queryUsers.value]
  
  // Apply role filter
  if (activeFilter.value === 'unverified') {
    filtered = filtered.filter(user => !user.is_approved)
  } else if (activeFilter.value !== 'all') {
    filtered = filtered.filter(user => user.role === activeFilter.value)
  }
  
  return filtered
})

// Calculate counts for filter tabs
const filterCounts = computed(() => {
  if (!queryUsers.value) return {}
  
  return {
    all: queryUsers.value.length,
    student: queryUsers.value.filter(u => u.role === 'student').length,
    instructor: queryUsers.value.filter(u => u.role === 'instructor').length,
    admin: queryUsers.value.filter(u => u.role === 'admin').length,
    unverified: queryUsers.value.filter(u => !u.is_approved).length
  }
})

// Handle filter change
const handleFilterChange = (filterValue) => {
  activeFilter.value = filterValue
}

// Handle search focus/blur
const handleSearchFocus = () => {
  isSearchFocused.value = true
}

const handleSearchBlur = () => {
  // Delay to allow click on result
  setTimeout(() => {
    isSearchFocused.value = false
  }, 200)
}

// Handle search result selection
const handleSearchSelect = (user) => {
  openEditModal(user)
  // Don't clear search - let user keep their search context
  isSearchFocused.value = false
}

// Alias for backward compatibility with existing code
const users = computed(() => filteredUsers.value)
const loading = computed(() => isLoadingUsers.value)
const showEditModal = ref(false)
const editingUser = ref(null)
const showCreateSubscriptionModal = ref(false)

// Instructor profile state
const instructorProfile = ref(null)
const instructorFormData = ref({
  bio: '',
  specialties: '',
  hourly_rate: ''
})
const isEditingInstructor = ref(false)
const pendingRoleChange = ref(null) // Track unsaved role changes

// Computed: Check if current editing user is an instructor
const isUserInstructor = computed(() => editingUser.value?.role === 'instructor')

// Computed: Check if current editing user is an admin
const isUserAdmin = computed(() => editingUser.value?.role === 'admin')

// Computed: Get instructor profile for current user
const currentInstructorProfile = computed(() => {
  if (!editingUser.value || !instructors.value) return null
  return instructors.value.find(inst => inst.user_id === editingUser.value.id)
})

// Vue Query hooks for subscription and bookings (reactive based on current editing user)
const editingUserId = computed(() => editingUser.value?.id)
const isEditingStudent = computed(() => editingUser.value?.role === 'student')

// Only pass userId to composables if the user is a student (to prevent unnecessary API calls)
const studentUserId = computed(() => isEditingStudent.value ? editingUserId.value : null)

// Conditionally use subscription and bookings queries (only for students)
const {
  subscription: userSubscription,
  isLoadingSubscription: subscriptionLoading,
  cancelSubscription,
  reactivateSubscription,
  createSubscription,
  isCancellingSubscription,
  isReactivatingSubscription,
  isCreatingSubscription
} = useUserSubscription(studentUserId)

const {
  bookings: userBookings,
  isLoadingBookings: loadingUserBookings,
  refetchBookings
} = useUserBookings(studentUserId)

const selectedPlan = ref('')
const adminNote = ref('')
const creatingSubscription = computed(() => isCreatingSubscription.value)

// Booking selection
const selectedBooking = ref(null)

// Refund modal data
const showRefundModal = ref(false)
const selectedRefundBooking = ref(null)

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
        showError('All fields are required')
        return
    }

    try {
        await createUserMutation(newUser.value)
        showSuccess('User created successfully')
        showAddForm.value = false
        resetNewUser()
        // Vue Query automatically refetches via cache invalidation
    } catch (err) {
        handleError(err, 'Error creating user: ')
    }
}

// fetchUsers removed - Vue Query handles this automatically via useUserManagement

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

const openEditModal = (user) => {
    editingUser.value = { ...user }
    showEditModal.value = true
    pendingRoleChange.value = user.role // Initialize with current role
    
    // Vue Query will automatically fetch subscription and bookings for students
    // based on the reactive editingUserId and isEditingStudent computed properties
    
    // Load instructor profile if user is an instructor
    if (user.role === 'instructor') {
        loadInstructorProfile(user.id)
    }
}

const closeEditModal = () => {
    editingUser.value = null
    userSubscription.value = null
    userBookings.value = []
    selectedBooking.value = null
    instructorProfile.value = null
    isEditingInstructor.value = false
    showEditModal.value = false
}

// Load instructor profile
const loadInstructorProfile = (userId) => {
    const profile = instructors.value?.find(inst => inst.user_id === userId)
    if (profile) {
        instructorProfile.value = profile
        instructorFormData.value = {
            bio: profile.bio || '',
            specialties: profile.specialties || '',
            hourly_rate: profile.hourly_rate || ''
        }
    }
}

const saveUserEdit = async () => {
    try {
        // Update user with all fields including in-person payment override
        const userUpdateResponse = await fetch(`/api/admin/users/${editingUser.value.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({ 
                name: editingUser.value.name,
                email: editingUser.value.email,
                role: editingUser.value.role,
                in_person_payment_override: editingUser.value.in_person_payment_override
            })
        });
        
        if (!userUpdateResponse.ok) throw new Error('Failed to update user');

        // Update approval status (separate endpoint)
        const approvalResponse = await fetch(`/api/users/${editingUser.value.id}/approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({ isApproved: editingUser.value.is_approved })
        });

        if (!approvalResponse.ok) throw new Error('Failed to update approval status');
        
        showSuccess('User updated successfully');
        closeEditModal();
        // Vue Query handles refetch automatically
    } catch (err) {
        handleError(err, 'Error updating user: ');
    }
}

// Save role change
const saveRoleChange = async () => {
    try {
        // Update the editingUser with the pending role change
        editingUser.value.role = pendingRoleChange.value
        
        await updateUserMutation({
            userId: editingUser.value.id,
            userData: { 
                name: editingUser.value.name,
                email: editingUser.value.email,
                role: pendingRoleChange.value,
                in_person_payment_override: editingUser.value.in_person_payment_override
            }
        })
        
        showSuccess(`User role updated to ${pendingRoleChange.value}`)
        
        // Reload instructor profile if now an instructor
        if (pendingRoleChange.value === 'instructor') {
            setTimeout(() => loadInstructorProfile(editingUser.value.id), 500)
        } else {
            instructorProfile.value = null
        }
    } catch (err) {
        handleError(err, 'Error updating role: ')
        // Revert pending change on error
        pendingRoleChange.value = editingUser.value.role
    }
}

// Create instructor profile
const createInstructorProfile = async () => {
    try {
        await createInstructorMutation({
            user_id: editingUser.value.id,
            bio: instructorFormData.value.bio,
            specialties: instructorFormData.value.specialties,
            hourly_rate: instructorFormData.value.hourly_rate
        })
        
        showSuccess('Instructor profile created successfully')
        setTimeout(() => loadInstructorProfile(editingUser.value.id), 500)
    } catch (err) {
        handleError(err, 'Error creating instructor profile: ')
    }
}

// Save instructor profile
const saveInstructorProfile = async () => {
    try {
        await updateInstructorMutation({
            instructorId: instructorProfile.value.id,
            instructorData: {
                bio: instructorFormData.value.bio,
                specialties: instructorFormData.value.specialties,
                hourly_rate: instructorFormData.value.hourly_rate
            }
        })
        
        showSuccess('Instructor profile updated successfully')
        isEditingInstructor.value = false
        setTimeout(() => loadInstructorProfile(editingUser.value.id), 500)
    } catch (err) {
        handleError(err, 'Error updating instructor profile: ')
    }
}

// Subscription management handlers
const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this user\'s subscription?')) return
    
    try {
        const result = await cancelSubscription(userSubscription.value.id)
        if (result.cancellation.wasSyncIssue) {
            showSuccess('Subscription status synchronized - was already cancelled in Stripe')
        } else if (result.credits.awarded > 0) {
            showSuccess(`Subscription cancelled. User received ${result.credits.awarded} lesson credits.`)
        } else {
            showSuccess('Subscription cancelled successfully')
        }
    } catch (err) {
        handleError(err, 'Error cancelling subscription: ')
    }
}

const handleReactivateSubscription = async () => {
    if (!confirm('Are you sure you want to reactivate this user\'s subscription?')) return
    
    try {
        const result = await reactivateSubscription(userSubscription.value.id)
        if (result.reactivation.reactivationType === 'removed_cancel_at_period_end') {
            showSuccess('Subscription reactivated - removed scheduled cancellation')
        } else if (result.reactivation.reactivationType === 'already_active') {
            showSuccess('Subscription is already active')
        } else {
            showSuccess('Subscription reactivated successfully')
        }
    } catch (err) {
        handleError(err, 'Error reactivating subscription: ')
    }
}

const handleOpenCreateSubscription = () => {
    // Filter to membership plans only
    const membershipPlans = availablePlans.value?.filter(plan => plan.type === 'membership') || []
    
    if (membershipPlans.length === 0) {
        showError('No membership plans available')
        return
    }
    
    selectedPlan.value = ''
    adminNote.value = ''
    showCreateSubscriptionModal.value = true
}

const closeCreateSubscriptionModal = () => {
    showCreateSubscriptionModal.value = false
    selectedPlan.value = ''
    adminNote.value = ''
}

const handleCreateSubscription = async () => {
    if (!selectedPlan.value) {
        showError('Please select a plan')
        return
    }
    
    if (!confirm('Create this subscription for the user?')) return
    
    try {
        await createSubscription({
            planId: selectedPlan.value,
            note: adminNote.value
        })
        showSuccess(`Subscription created for ${editingUser.value.name}`)
        closeCreateSubscriptionModal()
    } catch (err) {
        handleError(err, 'Error creating subscription: ')
    }
}

// Transform bookings for BookingList component
const transformedBookings = computed(() => {
    if (!userBookings.value) return []
    return userBookings.value.map(booking => ({
        id: booking.id,
        date: booking.date,
        startTime: formatTime(slotToTime(booking.start_slot)),
        endTime: formatTime(slotToTime(booking.start_slot + booking.duration)),
        instructorName: booking.Instructor.User.name,
        status: booking.status || 'booked',
        isRecurring: false,
        refundStatus: booking.refundStatus || { status: 'none' },
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
        originalBooking: booking
    }))
})

const handleEditUserBooking = (booking) => {
    selectedBooking.value = booking.originalBooking
}

const handleCancelUserBooking = (booking) => {
    console.warn('Admin booking cancellation not yet implemented for booking:', booking.id)
}

const handleViewUserBooking = (booking) => {
    // Set selected booking and navigate to detail slide  
    selectedBooking.value = booking.originalBooking
}

const handleRefundUserBooking = (booking) => {
    selectedRefundBooking.value = booking.originalBooking
    showRefundModal.value = true
}

const closeRefundModal = () => {
    showRefundModal.value = false
    selectedRefundBooking.value = null
}

const handleRefundProcessed = async (result) => {
    closeRefundModal()
    
    // Refresh user bookings to show updated refund status
    if (editingUser.value) {
        await refetchBookings()
    }
    
    // Show success message
    const refundType = result.refund.type === 'stripe' ? 'to original payment method' : 'as lesson credits'
    showSuccess(`Refund processed successfully ${refundType}!`)
    
    // Clear success message after 5 seconds
    setTimeout(() => {
        success.value = ''
    }, 5000)
}

// EditBooking event handlers
const handleBookingUpdated = (goBack) => {
    // Refresh bookings list
    selectedBooking.value = null
    fetchUserBookings(editingUser.value.id)
    
    // Automatically navigate back to booking list
    if (goBack) {
        goBack()
    }
}

const handleBookingCancelled = (goBack) => {
    // Refresh bookings list
    selectedBooking.value = null
    fetchUserBookings(editingUser.value.id)
    
    // Automatically navigate back to booking list
    if (goBack) {
        goBack()
    }
}

const handleCloseEditBooking = () => {
    // Go back to main slide (manual close button)
    selectedBooking.value = null
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

// onMounted removed - Vue Query handles initial fetch automatically
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

        <!-- Search Bar -->
        <div class="search-section">
          <SearchBar
            v-model="searchQuery"
            placeholder="Search by name or email..."
            :disabled="loading"
            :results="searchResults"
            :show-results="isSearchFocused"
            :min-chars="2"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @select="handleSearchSelect"
          >
            <template #result="{ result }">
              <div class="result-content">
                <div class="result-primary">{{ result.name }}</div>
                <div class="result-secondary">
                  {{ result.email }} • {{ result.role }}
                </div>
              </div>
            </template>
          </SearchBar>
        </div>

        <!-- Filter Tabs -->
        <div class="filters-section">
          <FilterTabs
            :filters="filters"
            :activeFilter="activeFilter"
            :counts="filterCounts"
            :isLoading="loading"
            @filter-change="handleFilterChange"
          />
        </div>

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
                        <label class="form-label">Role:</label>
                        <div class="form-input">
                            <input type="text" :value="editingUser?.role" disabled class="form-input" />
                            <small class="form-text">Role can only be changed by admins from the Account tab</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">In-Person Payment Override:</label>
                        <div class="form-input">
                            <select 
                                v-model="editingUser.in_person_payment_override"
                                class="form-input"
                            >
                                <option :value="null">Use Global Setting</option>
                                <option value="enabled">Enabled</option>
                                <option value="disabled">Disabled</option>
                            </select>
                            <small class="form-text">
                                Override the global in-person payment setting for this user. 
                                "Use Global Setting" means they follow the system-wide preference.
                            </small>
                        </div>
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

            <!-- Instructor Details Tab (Instructors only) -->
            <TabbedModalTab 
                v-if="isUserInstructor" 
                label="Instructor Details"
            >
                <div class="instructor-details-tab">
                    <!-- No profile yet -->
                    <div v-if="!instructorProfile && !isLoadingInstructors" class="no-profile-message">
                        <p>This instructor doesn't have a profile yet.</p>
                        
                        <form @submit.prevent="createInstructorProfile" class="create-profile-form">
                            <div class="form-group">
                                <label class="form-label">Bio:</label>
                                <textarea
                                    v-model="instructorFormData.bio"
                                    class="form-input"
                                    rows="4"
                                    placeholder="Tell students about your teaching experience..."
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Specialties:</label>
                                <input 
                                    v-model="instructorFormData.specialties"
                                    type="text"
                                    class="form-input"
                                    placeholder="e.g., Piano, Guitar, Voice"
                                />
                            </div>

                            <div class="form-group">
                                <label class="form-label">Hourly Rate ($):</label>
                                <input 
                                    v-model="instructorFormData.hourly_rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    class="form-input"
                                    placeholder="0.00"
                                />
                            </div>

                            <button 
                                type="submit"
                                :disabled="isCreatingInstructor"
                                class="form-button"
                            >
                                {{ isCreatingInstructor ? 'Creating...' : 'Create Instructor Profile' }}
                            </button>
                        </form>
                    </div>

                    <!-- Profile exists -->
                    <div v-else-if="instructorProfile" class="profile-exists">
                        <!-- View Mode -->
                        <div v-if="!isEditingInstructor" class="profile-view">
                            <div class="profile-field">
                                <label>Bio:</label>
                                <p>{{ instructorProfile.bio || 'No bio provided' }}</p>
                            </div>

                            <div class="profile-field">
                                <label>Specialties:</label>
                                <p>{{ instructorProfile.specialties || 'No specialties listed' }}</p>
                            </div>

                            <div class="profile-field">
                                <label>Hourly Rate:</label>
                                <p>${{ instructorProfile.hourly_rate || '0.00' }}</p>
                            </div>

                            <div class="profile-field">
                                <label>Status:</label>
                                <p>
                                    <span :class="instructorProfile.is_active ? 'status-active' : 'status-inactive'">
                                        {{ instructorProfile.is_active ? 'Active' : 'Inactive' }}
                                    </span>
                                </p>
                            </div>

                            <div class="form-actions">
                                <button 
                                    @click="isEditingInstructor = true"
                                    class="form-button"
                                >
                                    Edit Profile
                                </button>
                            </div>
                        </div>

                        <!-- Edit Mode -->
                        <div v-else class="profile-edit">
                            <form @submit.prevent="saveInstructorProfile">
                                <div class="form-group">
                                    <label class="form-label">Bio:</label>
                                    <textarea
                                        v-model="instructorFormData.bio"
                                        class="form-input"
                                        rows="4"
                                    ></textarea>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Specialties:</label>
                                    <input 
                                        v-model="instructorFormData.specialties"
                                        type="text"
                                        class="form-input"
                                    />
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Hourly Rate ($):</label>
                                    <input 
                                        v-model="instructorFormData.hourly_rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        class="form-input"
                                    />
                                </div>

                                <div class="form-actions">
                                    <button 
                                        type="submit"
                                        :disabled="isUpdatingInstructor"
                                        class="form-button"
                                    >
                                        {{ isUpdatingInstructor ? 'Saving...' : 'Save Changes' }}
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        @click="isEditingInstructor = false"
                                        class="form-button form-button-cancel"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Loading -->
                    <div v-else class="loading-message">
                        Loading instructor profile...
                    </div>
                </div>
            </TabbedModalTab>

            <!-- Availability Tab (Instructors only) -->
            <TabbedModalTab 
                v-if="isUserInstructor && instructorProfile" 
                label="Availability"
            >
                <div class="availability-tab">
                    <!-- Google Calendar Integration -->
                    <GoogleCalendarSettings 
                        :instructor-id="instructorProfile.id"
                    />
                </div>
            </TabbedModalTab>

            <!-- Bookings Tab (Students only) -->
            <TabbedModalTab 
                v-if="!isUserAdmin && !isUserInstructor"
                label="Bookings"
            >
                <div class="bookings-tab">
                    <SlideTransition :slide-count="2">
                        <!-- Main slide: Bookings list -->
                        <template #main="{ navigate }">
                            <div v-if="userBookings.length > 0 || loadingUserBookings">
                                <BookingList
                                    :bookings="transformedBookings"
                                    :loading="loadingUserBookings"
                                    :userId="editingUser?.id"
                                    :userRole="userStore.canManageUsers ? 'admin' : 'instructor'"
                                    @edit-booking="(booking) => { handleEditUserBooking(booking); navigate(); }"
                                    @cancel-booking="handleCancelUserBooking"
                                    @view-booking="(booking) => { handleViewUserBooking(booking); navigate(); }"
                                    @process-refund="handleRefundUserBooking"
                                />
                            </div>
                            <div v-else class="no-bookings-message">
                                <p>This user has no bookings to display.</p>
                            </div>
                        </template>

                        <!-- Detail slide: Edit booking -->
                        <template #detail="{ goBack }">
                            <div v-if="selectedBooking" class="edit-booking-container">
                                <EditBooking
                                    :booking="selectedBooking"
                                    @close="handleCloseEditBooking"
                                    @booking-updated="() => handleBookingUpdated(goBack)"
                                    @booking-cancelled="() => handleBookingCancelled(goBack)"
                                />
                            </div>
                        </template>
                    </SlideTransition>
                </div>
            </TabbedModalTab>

            <!-- Memberships Tab (Students only) -->
            <TabbedModalTab 
                v-if="!isUserAdmin && !isUserInstructor"
                label="Memberships"
            >
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
                                @click="handleCancelSubscription"
                                :disabled="isCancellingSubscription"
                            >
                                {{ isCancellingSubscription ? 'Cancelling...' : 'Cancel Subscription' }}
                            </button>
                            
                            <button 
                                v-if="userSubscription.cancel_at_period_end"
                                type="button"
                                class="form-button"
                                @click="handleReactivateSubscription"
                                :disabled="isReactivatingSubscription"
                            >
                                {{ isReactivatingSubscription ? 'Reactivating...' : 'Reactivate Subscription' }}
                            </button>
                            
                            <button 
                                v-if="userSubscription.status === 'cancelled' || userSubscription.status === 'canceled'"
                                type="button"
                                class="form-button"
                                @click="handleOpenCreateSubscription"
                                :disabled="isLoadingPlans"
                            >
                                {{ isLoadingPlans ? 'Loading...' : 'Create New Subscription' }}
                            </button>
                        </div>
                    </div>
                    
                    <div v-else class="no-subscription">
                        <p>This user does not have a membership.</p>
                        
                        <div class="subscription-actions">
                            <button 
                                type="button"
                                class="form-button"
                                @click="handleOpenCreateSubscription"
                                :disabled="isLoadingPlans"
                            >
                                {{ isLoadingPlans ? 'Loading...' : 'Create Subscription' }}
                            </button>
                        </div>
                    </div>
                </div>
            </TabbedModalTab>

            <!-- Account Tab (Admins only) -->
            <TabbedModalTab 
                v-if="userStore.canManageUsers"
                label="Account"
            >
                <div class="account-tab">
                    <div class="account-section">
                        <!-- Account Approval -->
                        <div class="action-group">
                            <div class="action-header">
                                <h5>Account Approval</h5>
                                <span :class="['status-badge', editingUser?.is_approved ? 'status-active' : 'status-inactive']">
                                    {{ editingUser?.is_approved ? 'Approved' : 'Pending' }}
                                </span>
                            </div>
                            <div class="action-content">
                                <label class="checkbox-label">
                                    <input 
                                        type="checkbox"
                                        v-model="editingUser.is_approved"
                                    >
                                    <span>Grant account access</span>
                                </label>
                                <button 
                                    @click="saveUserEdit"
                                    :disabled="isUpdatingUser"
                                    class="form-button form-button-sm"
                                >
                                    {{ isUpdatingUser ? 'Saving...' : 'Save' }}
                                </button>
                            </div>
                        </div>

                        <!-- Role Management -->
                        <div class="action-group">
                            <div class="action-header">
                                <h5>Role</h5>
                                <span class="role-badge">{{ editingUser?.role }}</span>
                            </div>
                            <div class="action-content">
                                <select 
                                    v-model="pendingRoleChange"
                                    class="form-input"
                                >
                                    <option value="student">Student</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <button 
                                    @click="saveRoleChange"
                                    :disabled="isUpdatingUser || pendingRoleChange === editingUser?.role"
                                    class="form-button form-button-sm"
                                >
                                    {{ isUpdatingUser ? 'Saving...' : 'Save' }}
                                </button>
                            </div>
                        </div>

                        <!-- Danger Zone -->
                        <div class="action-group danger-zone">
                            <div class="action-header">
                                <h5>Delete Account</h5>
                            </div>
                            <div class="action-content">
                                <p class="danger-description">Permanently delete this user and all associated data. This cannot be undone.</p>
                                <button 
                                    type="button"
                                    class="form-button form-button-danger"
                                    @click="deleteUserFromModal"
                                    :disabled="editingUser?.id === currentUserId"
                                >
                                    {{ editingUser?.id === currentUserId ? 'Cannot Delete Own Account' : 'Delete User' }}
                                </button>
                            </div>
                        </div>
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
                    @click="handleCreateSubscription"
                    :disabled="isCreatingSubscription || !selectedPlan"
                >
                    {{ isCreatingSubscription ? 'Creating...' : 'Create Subscription' }}
                </button>
            </div>
        </div>
    </div>

    <!-- Refund Modal -->
    <RefundModal
        v-if="showRefundModal && selectedRefundBooking"
        :booking="selectedRefundBooking"
        @close="closeRefundModal"
        @refund-processed="handleRefundProcessed"
    />
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

.search-section {
    margin-bottom: var(--spacing-md);
}

.filters-section {
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

/* Role Management Tab */
.role-management-tab {
    padding: var(--spacing-md);
}

.info-message {
    background-color: #f0f9ff;
    border-left: 4px solid var(--primary-color);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    border-radius: 4px;
}

.info-message p {
    margin: 0.5rem 0;
}

.info-message .help-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: var(--spacing-sm);
}

.role-change-warning {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: var(--spacing-md);
    margin-top: var(--spacing-md);
    border-radius: 4px;
}

.role-change-warning p {
    margin: 0;
    color: #92400e;
}

/* Instructor Details Tab */
.instructor-details-tab {
    padding: var(--spacing-md);
}

.no-profile-message {
    background-color: #f9fafb;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: var(--spacing-xl);
    text-align: center;
    margin-bottom: var(--spacing-lg);
}

.no-profile-message p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-lg);
}

.create-profile-form {
    max-width: 600px;
    margin: 0 auto;
}

.profile-view,
.profile-edit {
    max-width: 600px;
}

.profile-field {
    margin-bottom: var(--spacing-lg);
}

.profile-field label {
    display: block;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: var(--spacing-xs);
}

.profile-field p {
    margin: 0;
    color: var(--text-color);
    padding: 0.75rem;
    background-color: #f9fafb;
    border-radius: 6px;
}

.status-active {
    color: #059669;
    font-weight: 500;
}

.status-inactive {
    color: #dc2626;
    font-weight: 500;
}

.form-button-delete {
    background-color: #dc2626;
    color: white;
}

.form-button-delete:hover:not(:disabled) {
    background-color: #b91c1c;
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

.action-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
}

.action-header h5 {
    margin: 0;
}

.action-content {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    flex-wrap: wrap;
}

.action-content .form-input {
    flex: 1;
    min-width: 150px;
}

.form-button-sm {
    padding: var(--spacing-xs) var(--spacing-md);
    white-space: nowrap;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    cursor: pointer;
    flex: 1;
}

.checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
}

.checkbox-label span {
    color: var(--text-primary);
}

.role-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--background-light);
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
    text-transform: capitalize;
}

.danger-description {
    flex: 1 1 100%;
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
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
    padding: var(--spacing-sm);
}

.no-bookings-message {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
}

.edit-booking-container {
    width: 100%;
    height: 100%;
}
</style> 