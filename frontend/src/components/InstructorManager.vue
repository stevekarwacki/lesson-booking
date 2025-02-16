<script setup>
import { ref, onMounted, computed } from 'vue'
import { currentUser } from '../stores/userStore'

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
                'user-id': currentUser.value.id
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
        const response = await fetch('/api/instructors', {
            headers: {
                'user-id': currentUser.value.id
            }
        })
        if (!response.ok) throw new Error('Failed to fetch instructors')
        const data = await response.json()
        instructors.value = data
    } catch (err) {
        error.value = 'Error fetching instructors: ' + err.message
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
                'user-id': currentUser.value.id
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
        const response = await fetch(`/api/admin/instructors/${instructorId}`, {
            method: 'DELETE',
            headers: {
                'user-id': currentUser.value.id
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
        
        const response = await fetch(`/api/admin/instructors/${editingInstructor.value.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUser.value.id
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
                'user-id': currentUser.value.id
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

onMounted(() => {
    fetchUsers()
    fetchInstructors()
})
</script>

<template>
    <div class="instructor-manager">
        <h2>Manage Instructors</h2>
        
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>

        <button class="btn btn-primary mb-3" @click="showAddForm = true">Add Instructor</button>

        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Specialties</th>
                    <th>Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="instructor in instructors" :key="instructor.id">
                    <td>{{ instructor.name }}</td>
                    <td>{{ instructor.email }}</td>
                    <td>{{ instructor.specialties || 'Not specified' }}</td>
                    <td>${{ instructor.hourly_rate || '0' }}/hr</td>
                    <td>
                        <span :class="['badge', instructor.is_active ? 'badge-success' : 'badge-warning']">
                            {{ instructor.is_active ? 'Active' : 'Inactive' }}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-secondary me-1" @click="openEditModal(instructor)">Edit</button>
                        <button class="btn btn-sm btn-warning me-1" @click="toggleInstructorActive(instructor)">
                            {{ instructor.is_active ? 'Deactivate' : 'Activate' }}
                        </button>
                        <button class="btn btn-sm btn-danger" @click="deleteInstructor(instructor.id)">Delete</button>
                    </td>
                </tr>
            </tbody>
        </table>

        <div v-if="showAddForm" class="add-form">
            <h3>Add New Instructor</h3>
            <form @submit.prevent="handleAddInstructor">
                <div class="form-group">
                    <label for="user-search">Search User</label>
                    <div class="search-container">
                        <input 
                            id="user-search"
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search by name or email"
                            :class="{ 'has-selection': selectedUser }"
                            autocomplete="off"
                            @focus="handleSearchFocus"
                            @blur="handleSearchBlur"
                        >
                        <button 
                            v-if="selectedUser" 
                            type="button" 
                            class="clear-button"
                            @click="clearSelection"
                        >
                            ×
                        </button>
                    </div>
                    
                    <div 
                        v-if="isSearchFocused && searchResults.length > 0" 
                        class="search-results"
                    >
                        <div 
                            v-for="user in searchResults" 
                            :key="user.id"
                            class="search-result-item"
                            @click="selectUser(user)"
                        >
                            <div class="user-info">
                                <strong>{{ user.name }}</strong>
                                <span>{{ user.email }}</span>
                            </div>
                        </div>
                    </div>
                    <div 
                        v-else-if="isSearchFocused && searchQuery.length >= 2" 
                        class="no-results"
                    >
                        No matching users found
                    </div>
                </div>

                <div v-if="selectedUser" class="selected-user">
                    <p>Selected: {{ selectedUser.name }} ({{ selectedUser.email }})</p>
                </div>

                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea 
                        id="bio"
                        v-model="newInstructor.bio"
                        required
                        rows="3"
                        placeholder="Enter instructor bio"
                    ></textarea>
                </div>

                <div class="form-group">
                    <label for="specialties">Specialties</label>
                    <input 
                        id="specialties"
                        v-model="newInstructor.specialties"
                        type="text"
                        required
                        placeholder="e.g., Jazz, Classical, Piano"
                    >
                </div>

                <div class="form-group">
                    <label for="hourly_rate">Hourly Rate ($)</label>
                    <input 
                        id="hourly_rate"
                        v-model="newInstructor.hourly_rate"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                    >
                </div>

                <div class="form-group">
                    <label for="availability">Availability</label>
                    <textarea 
                        id="availability"
                        v-model="newInstructor.availability"
                        required
                        rows="2"
                        placeholder="e.g., Weekdays 9AM-5PM"
                    ></textarea>
                </div>

                <button type="submit" class="submit-button">Add Instructor</button>
            </form>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal">
            <div class="modal-content">
                <h3>Edit Instructor</h3>
                <form @submit.prevent="saveInstructorEdit">
                    <div class="form-group">
                        <label>Hourly Rate ($)</label>
                        <input 
                            type="number" 
                            v-model="editingInstructor.hourly_rate"
                            class="form-control"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label>Specialties</label>
                        <input 
                            type="text" 
                            v-model="editingInstructor.specialties"
                            class="form-control"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label>Bio</label>
                        <textarea 
                            v-model="editingInstructor.bio"
                            class="form-control"
                            required
                        ></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" @click="closeEditModal">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.instructor-manager {
    background: white;
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
    box-shadow: var(--card-shadow);
}

.instructors-table {
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

.header-actions {
    margin-bottom: var(--spacing-lg);
    display: flex;
    justify-content: flex-end;
}

.instructor-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.instructor-actions {
    display: flex;
    gap: var(--spacing-sm);
}

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
    background: white;
    border-radius: var(--border-radius);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--card-shadow);
}

.modal-header {
    padding: var(--spacing-md);
    border-bottom: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: var(--secondary-color);
}

.close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--secondary-color);
}

.modal-body {
    padding: var(--spacing-md);
}

.modal-footer {
    padding: var(--spacing-md);
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
}

.table {
    width: 100%;
    border-collapse: collapse;
}

.table th,
.table td {
    padding: 8px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.table th {
    background-color: #f8f9fa;
    font-weight: bold;
}

.me-1 {
    margin-right: 4px;
}
</style> 