<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'

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

onMounted(async () => {
    await fetchUsers()
    await fetchInstructors()
})
</script>

<template>
    <div class="instructor-manager card">
        <div class="card-header">
            <h2>Manage Instructors</h2>
        </div>
        
        <div class="card-body">
            <div v-if="error" class="form-message error-message">{{ error }}</div>
            <div v-if="success" class="form-message success-message">{{ success }}</div>

            <button 
                class="form-button"
                @click="showAddForm = !showAddForm"
            >
                {{ showAddForm ? 'Cancel' : 'Add Instructor' }}
            </button>

            <div v-if="showAddForm" class="add-form card">
                <div class="card-header">
                    <h3>Add New Instructor</h3>
                </div>
                <div class="card-body">
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
                            <label for="useCredits" class="form-label">Bio:</label>
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

                        <button 
                            type="submit"
                            class="form-button"
                            :disabled="!selectedUser"
                        >
                            Add Instructor
                        </button>
                    </form>
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
                                    class="form-button form-button-secondary"
                                    @click="openEditModal(instructor)"
                                >
                                    Edit
                                </button>
                                <button 
                                    class="form-button form-button-secondary"
                                    @click="toggleInstructorActive(instructor)"
                                >
                                    {{ instructor.is_active ? 'Deactivate' : 'Activate' }}
                                </button>
                                <button 
                                    class="form-button form-button-danger"
                                    @click="deleteInstructor(instructor.id)"
                                >
                                    Delete
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
    <div v-if="showEditModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Instructor</h3>
            </div>
            <div class="modal-body">
                <form @submit.prevent="saveInstructorEdit">
                    <div class="form-group">
                        <label class="form-label">Bio:</label>
                        <textarea 
                            v-model="editingInstructor.bio"
                            class="form-input"
                            rows="3"
                        ></textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Specialties:</label>
                        <input 
                            type="text"
                            v-model="editingInstructor.specialties"
                            class="form-input"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">Hourly Rate ($):</label>
                        <input 
                            type="number"
                            v-model="editingInstructor.hourly_rate"
                            class="form-input"
                            min="0"
                            step="0.01"
                        >
                    </div>

                    <div class="modal-footer">
                        <button 
                            type="button"
                            class="form-button form-button-secondary"
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
            </div>
        </div>
    </div>
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
}

/* Modal Styles */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--background-light);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.modal-body {
    padding: var(--spacing-md);
}

.modal-footer {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
    justify-content: flex-end;
}

@media (max-width: 768px) {
    .modal-content {
        width: 95%;
        margin: var(--spacing-sm);
    }
}
</style> 