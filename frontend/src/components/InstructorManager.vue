<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import TabbedModal from './TabbedModal.vue'
import TabbedModalTab from './TabbedModalTab.vue'

const userStore = useUserStore()
const instructors = ref([])
const allUsers = ref([])
const error = ref('')
const success = ref('')
const showAddForm = ref(false)
const showEditModal = ref(false)
const editingInstructor = ref(null)
const searchQuery = ref('')
const selectedUser = ref(null)
const isSearchFocused = ref(false)
const loading = ref(true)

const newInstructor = ref({
    user_id: '',
    bio: '',
    specialties: '',
    hourly_rate: '',
    availability: ''
})

// Computed property for filtered users
const searchResults = computed(() => {
    if (!searchQuery.value || searchQuery.value.length < 2) return []
    
    const query = searchQuery.value.toLowerCase()
    return allUsers.value.filter(user => 
        (user.role === 'student' && 
        !instructors.value.some(instructor => instructor.user_id === user.id)) &&
        (user.name.toLowerCase().includes(query) || 
         user.email.toLowerCase().includes(query))
    )
})

const fetchUsers = async () => {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        }) 
        if (!response.ok) {
            throw new Error('Failed to fetch users')
        }
        allUsers.value = await response.json()
    } catch (err) {
        error.value = 'Error fetching users: ' + err.message
        console.error('Error fetching users:', err)
    }
}

const fetchInstructors = async () => {
    try {
        loading.value = true
        error.value = null

        const response = await fetch('/api/instructors', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        if (!response.ok) throw new Error('Failed to fetch instructors')
        const data = await response.json()
        instructors.value = data
    } catch (err) {
        error.value = 'Error fetching instructors: ' + err.message
    } finally {
        loading.value = false
    }
}

const handleAddInstructor = async () => {
    if (!selectedUser.value) {
        error.value = 'Please select a user'
        return
    }

    try {
        const response = await fetch('/api/instructors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                user_id: selectedUser.value.id,
                bio: newInstructor.value.bio,
                specialties: newInstructor.value.specialties,
                hourly_rate: newInstructor.value.hourly_rate
            })
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to create instructor')
        }

        success.value = 'Instructor added successfully'
        showAddForm.value = false
        clearSelection()
        await fetchInstructors()
    } catch (err) {
        error.value = err.message
    }
}

const selectUser = (user) => {
    selectedUser.value = user
    newInstructor.value.user_id = user.id
    searchQuery.value = user.name
}

const clearSelection = () => {
    selectedUser.value = null
    newInstructor.value = {
        user_id: '',
        bio: '',
        specialties: '',
        hourly_rate: '',
        availability: ''
    }
    searchQuery.value = ''
}

const handleSearchFocus = () => {
    isSearchFocused.value = true
}

const handleSearchBlur = () => {
    // Small delay to allow for result clicking
    setTimeout(() => {
        isSearchFocused.value = false
    }, 200)
}

const deleteInstructor = async (instructorId) => {
    if (!confirm('Are you sure you want to delete this instructor?')) return

    try {
        const response = await fetch(`/api/instructors/${instructorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        if (!response.ok) throw new Error('Failed to delete instructor')
        
        success.value = 'Instructor deleted successfully'
        await fetchInstructors()
    } catch (err) {
        error.value = 'Error deleting instructor: ' + err.message
    }
}

const openEditModal = (instructor) => {
    editingInstructor.value = { ...instructor }
    showEditModal.value = true
}

const closeEditModal = () => {
    editingInstructor.value = null
    showEditModal.value = false
}

const closeAddForm = () => {
    showAddForm.value = false
    clearSelection()
}

const saveInstructorEdit = async () => {
    try {
        const updateData = {
            hourly_rate: editingInstructor.value.hourly_rate,
            specialties: editingInstructor.value.specialties,
            bio: editingInstructor.value.bio
        };
        console.log('Sending update data:', updateData);
        
        const response = await fetch(`/api/instructors/${editingInstructor.value.user_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update instructor');
        }
        
        const result = await response.json();
        console.log('Update response:', result);
        
        success.value = 'Instructor updated successfully';
        closeEditModal();
        await fetchInstructors();
    } catch (err) {
        console.error('Error in saveInstructorEdit:', err);
        error.value = 'Error updating instructor: ' + err.message;
    }
}

const toggleInstructorActive = async (instructor) => {
    try {
        const response = await fetch(`/api/instructors/${instructor.id}/toggle-active`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update instructor status');
        }

        // Refresh the instructor list
        await fetchInstructors();
        
        success.value = `Instructor ${instructor.is_active ? 'deactivated' : 'activated'} successfully`;
    } catch (err) {
        error.value = err.message;
    }
};

const toggleInstructorActiveInModal = async () => {
    if (!confirm(`Are you sure you want to ${editingInstructor.value.is_active ? 'deactivate' : 'activate'} this instructor?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/instructors/${editingInstructor.value.id}/toggle-active`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to update instructor status');
        }

        // Update the local editingInstructor state
        editingInstructor.value.is_active = !editingInstructor.value.is_active;
        
        // Refresh the instructor list
        await fetchInstructors();
        
        success.value = `Instructor ${editingInstructor.value.is_active ? 'activated' : 'deactivated'} successfully`;
    } catch (err) {
        error.value = err.message;
    }
};

const deleteInstructorFromModal = async () => {
    if (!confirm('Are you sure you want to delete this instructor? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/instructors/${editingInstructor.value.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete instructor');
        }
        
        success.value = 'Instructor deleted successfully';
        closeEditModal();
        await fetchInstructors();
    } catch (err) {
        error.value = 'Error deleting instructor: ' + err.message;
    }
};

onMounted(async () => {
    await fetchUsers()
    await fetchInstructors()
})
</script>

<template>
    <div class="instructor-manager card">       
        <div class="card-body">
            <div v-if="error" class="form-message error-message">{{ error }}</div>
            <div v-if="success" class="form-message success-message">{{ success }}</div>

            <button 
                class="form-button"
                @click="showAddForm = true"
            >
                Add Instructor
            </button>

            <!-- Add Instructor Modal -->
            <div v-if="showAddForm" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add New Instructor</h3>
                        <button class="modal-close" @click="closeAddForm">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="handleAddInstructor">
                            <div class="form-group">
                                <label class="form-label">Search User:</label>
                                <div class="search-container">
                                    <input 
                                        type="text"
                                        v-model="searchQuery"
                                        @focus="handleSearchFocus"
                                        @blur="handleSearchBlur"
                                        placeholder="Search by name or email..."
                                        class="form-input"
                                    >
                                    <div v-if="isSearchFocused && searchResults.length > 0" class="search-results">
                                        <div 
                                            v-for="user in searchResults" 
                                            :key="user.id"
                                            class="search-result-item"
                                            @mousedown="selectUser(user)"
                                        >
                                            <div class="user-name">{{ user.name }}</div>
                                            <div class="user-email">{{ user.email }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Bio:</label>
                                <textarea 
                                    v-model="newInstructor.bio"
                                    class="form-input"
                                    rows="3"
                                ></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Specialties:</label>
                                <input 
                                    type="text"
                                    v-model="newInstructor.specialties"
                                    class="form-input"
                                    placeholder="e.g., Piano, Jazz, Classical"
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">Hourly Rate ($):</label>
                                <input 
                                    type="number"
                                    v-model="newInstructor.hourly_rate"
                                    class="form-input"
                                    min="0"
                                    step="0.01"
                                >
                            </div>

                            <div class="modal-footer">
                                <button 
                                    type="button"
                                    class="form-button form-button-cancel"
                                    @click="closeAddForm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    class="form-button"
                                    :disabled="!selectedUser"
                                >
                                    Add Instructor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="loading-state">
                Loading instructors...
            </div>

            <div v-else class="instructors-list">
                <div v-for="instructor in instructors" :key="instructor.id" class="instructor-card card">
                    <div class="card-body">
                        <div class="instructor-header">
                            <h3>{{ instructor.User.name }}</h3>
                            <div class="instructor-actions">
                                <button 
                                    class="form-button form-button-edit"
                                    @click="openEditModal(instructor)"
                                >
                                    Manage
                                </button>
                            </div>
                        </div>

                        <div class="instructor-details">
                            <p><strong>Email:</strong> {{ instructor.User.email }}</p>
                            <p><strong>Bio:</strong> {{ instructor.bio }}</p>
                            <p><strong>Specialties:</strong> {{ instructor.specialties }}</p>
                            <p><strong>Hourly Rate:</strong> ${{ instructor.hourly_rate }}</p>
                            <p><strong>Status:</strong> {{ instructor.is_active ? 'Active' : 'Inactive' }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Modal -->
    <TabbedModal
        :show="showEditModal && !!editingInstructor"
        :title="`Manage Instructor: ${editingInstructor?.User?.name || 'Unknown'}`"
        @close="closeEditModal"
    >
        <TabbedModalTab label="Instructor Details">
            <form @submit.prevent="saveInstructorEdit">
                <div class="form-group">
                    <label class="form-label">Name:</label>
                    <div class="form-input-readonly">
                        {{ editingInstructor.User?.name || 'N/A' }}
                    </div>
                    <small class="form-text">Name cannot be changed here. Update in user management.</small>
                </div>

                <div class="form-group">
                    <label class="form-label">Email:</label>
                    <div class="form-input-readonly">
                        {{ editingInstructor.User?.email || 'N/A' }}
                    </div>
                    <small class="form-text">Email cannot be changed here. Update in user management.</small>
                </div>

                <div class="form-group">
                    <label class="form-label" for="editInstructorBio">Bio:</label>
                    <div class="form-input">
                        <textarea 
                            id="editInstructorBio"
                            v-model="editingInstructor.bio"
                            class="form-input"
                            rows="4"
                            placeholder="Tell us about this instructor's background and experience..."
                        ></textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="editInstructorSpecialties">Specialties:</label>
                    <div class="form-input">
                        <input 
                            id="editInstructorSpecialties"
                            type="text"
                            v-model="editingInstructor.specialties"
                            class="form-input"
                            placeholder="e.g., Piano, Jazz, Classical, Music Theory"
                        >
                        <small class="form-text">Separate multiple specialties with commas</small>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="editInstructorRate">Hourly Rate ($):</label>
                    <div class="form-input">
                        <input 
                            id="editInstructorRate"
                            type="number"
                            v-model="editingInstructor.hourly_rate"
                            class="form-input"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                        >
                        <small class="form-text">Standard hourly rate for lessons</small>
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

        <TabbedModalTab label="Availability">
            <div class="availability-tab">
                <div class="info-message">
                    <h4>Availability Management</h4>
                    <p>Instructor availability management will be implemented here in a future update.</p>
                    <p>This will allow you to:</p>
                    <ul>
                        <li>Set weekly availability schedules</li>
                        <li>Block specific dates or time slots</li>
                        <li>Configure buffer times between lessons</li>
                        <li>Set vacation periods</li>
                    </ul>
                </div>
            </div>
        </TabbedModalTab>

        <TabbedModalTab label="Actions">
            <div class="actions-tab">
                <div class="actions-section">
                    <h4>Instructor Management</h4>
                    <p>Manage instructor status and perform administrative actions.</p>
                    
                    <div class="action-group">
                        <h5>Status Management</h5>
                        <div class="action-item">
                            <div class="action-info">
                                <strong>Current Status:</strong>
                                <span :class="['status-badge', editingInstructor.is_active ? 'status-active' : 'status-inactive']">
                                    {{ editingInstructor.is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </div>
                            <div class="action-description">
                                <p>{{ editingInstructor.is_active ? 'This instructor can accept new bookings and is visible to students.' : 'This instructor cannot accept new bookings and is hidden from students.' }}</p>
                            </div>
                            <button 
                                type="button"
                                :class="['form-button', editingInstructor.is_active ? 'form-button-warning' : 'form-button-success']"
                                @click="toggleInstructorActiveInModal"
                            >
                                {{ editingInstructor.is_active ? 'Deactivate Instructor' : 'Activate Instructor' }}
                            </button>
                        </div>
                    </div>

                    <div class="action-group danger-zone">
                        <div class="action-item">
                            <div class="action-info">
                                <strong>Delete Instructor</strong>
                            </div>
                            <div class="action-description">
                                <p>Permanently remove this instructor from the system. This action cannot be undone.</p>
                                <p><strong>Warning:</strong> This will also remove the instructor's availability and may affect existing bookings.</p>
                            </div>
                            <button 
                                type="button"
                                class="form-button form-button-danger"
                                @click="deleteInstructorFromModal"
                            >
                                Delete Instructor
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </TabbedModalTab>
    </TabbedModal>
</template>

<style scoped>
.instructor-manager {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.add-form {
    margin-top: var(--spacing-lg);
}

.search-container {
    position: relative;
    margin-left: 10px;
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--background-light);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
}

.search-result-item {
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: background-color 0.2s;
}

.search-result-item:hover {
    background-color: var(--background-hover);
}

.user-name {
    font-weight: 500;
    color: var(--text-primary);
}

.user-email {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.instructors-list {
    margin-top: var(--spacing-lg);
    display: grid;
    gap: var(--spacing-md);
}

.instructor-card {
    background: var(--background-light);
}

.instructor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
}

.instructor-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.instructor-actions {
    display: flex;
    gap: var(--spacing-sm);
}

.instructor-details {
    color: var(--text-secondary);
}

.instructor-details p {
    margin: var(--spacing-xs) 0;
}

.instructor-details strong {
    color: var(--text-primary);
}

.loading-state {
    text-align: center;
    padding: var(--spacing-lg);
    color: var(--text-secondary);
}

/* TabbedModal specific styles */
.form-input-readonly {
    padding: var(--spacing-sm);
    background-color: var(--background-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    color: var(--text-secondary);
    font-style: italic;
}

.status-display {
    display: flex;
    align-items: center;
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

.status-inactive {
    background: var(--error-color);
    color: white;
}

.availability-tab,
.performance-tab,
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

.danger-zone {
    border-color: var(--error-color);
    background: rgba(255, 0, 0, 0.02);
}

.danger-zone h5 {
    color: var(--error-color);
}

.form-button-warning {
    background-color: #ffc107;
    color: #212529;
}

.form-button-warning:hover {
    background-color: #e0a800;
}

.form-button-success {
    background-color: var(--success-color);
    color: white;
}

.form-button-success:hover {
    background-color: #0f5132;
}

.info-message {
    text-align: center;
    padding: var(--spacing-lg);
    background: var(--background-hover);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
}

.info-message h4 {
    margin-top: 0;
    margin-bottom: var(--spacing-md);
    color: var(--primary-color);
}

.info-message p {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
}

.info-message ul {
    text-align: left;
    max-width: 400px;
    margin: var(--spacing-md) auto 0;
    color: var(--text-secondary);
}

.info-message li {
    margin-bottom: var(--spacing-xs);
}

.form-text {
    display: block;
    margin-top: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
    .instructor-manager {
        padding: var(--spacing-md);
    }

    .instructor-header {
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .instructor-actions {
        width: 100%;
        justify-content: space-between;
    }

    .status-display {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-sm);
    }

    .status-display button {
        margin-left: 0 !important;
    }
}
</style> 