<script setup>
import { ref, onMounted, computed } from 'vue'
import { currentUser } from '../stores/userStore'

const instructors = ref([])
const allUsers = ref([])
const error = ref('')
const success = ref('')
const showAddForm = ref(false)
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
        if (!response.ok) {
            throw new Error('Failed to fetch instructors')
        }
        instructors.value = await response.json()
    } catch (err) {
        error.value = 'Error fetching instructors: ' + err.message
        console.error('Error fetching instructors:', err)
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
            body: JSON.stringify(newInstructor.value)
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

const removeInstructor = async (userId) => {
    if (!confirm('Are you sure you want to remove this instructor?')) return

    try {
        const response = await fetch(`/api/instructors/${userId}`, {
            method: 'DELETE',
            headers: {
                'user-id': currentUser.value.id
            }
        })

        if (!response.ok) throw new Error('Failed to remove instructor')

        success.value = 'Instructor removed successfully'
        await fetchInstructors()
    } catch (err) {
        error.value = err.message
    }
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

onMounted(() => {
    fetchUsers()
    fetchInstructors()
})
</script>

<template>
    <div class="instructor-manager card">
        <h2>Manage Instructors</h2>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <button 
            @click="showAddForm = !showAddForm" 
            class="add-button"
        >
            {{ showAddForm ? 'Cancel' : 'Add New Instructor' }}
        </button>

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

        <div class="instructors-list">
            <h3>Current Instructors</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Specialties</th>
                            <th>Rate</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="instructor in instructors" :key="instructor.id">
                            <td>{{ instructor.name }}</td>
                            <td>{{ instructor.email }}</td>
                            <td>{{ instructor.specialties }}</td>
                            <td>${{ instructor.hourly_rate }}/hr</td>
                            <td>
                                <button 
                                    @click="removeInstructor(instructor.user_id)"
                                    class="remove-button"
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<style scoped>
.instructor-manager {
    margin-bottom: var(--spacing-lg);
}

.add-button {
    background: var(--primary-color);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-md);
    cursor: pointer;
}

.add-form {
    background: white;
    padding: 24px;
    border-radius: var(--border-radius);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    margin-top: 16px;
}

.add-form h3 {
    margin-top: 0;
    margin-bottom: 24px;
    color: var(--secondary-color);
}

.form-group {
    margin-bottom: 20px;
    position: relative;
}

.form-group:last-of-type {
    margin-bottom: 24px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    color: var(--secondary-color);
    font-weight: 500;
}

.form-group input,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    font-size: 1rem;
    color: var(--secondary-color);
    background-color: white;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
    color: #999;
}

.form-group textarea {
    resize: vertical;
    min-height: 80px;
}

.form-group input[type="number"] {
    -moz-appearance: textfield; /* Firefox */
}

.form-group input[type="number"]::-webkit-outer-spin-button,
.form-group input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.submit-button {
    width: 100%;
    padding: 12px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submit-button:hover {
    background-color: var(--primary-dark);
}

.submit-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: var(--spacing-md);
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background-color: #f8f9fa;
    font-weight: 600;
}

.remove-button {
    background: var(--error-color);
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: var(--border-radius);
    cursor: pointer;
}

.search-container {
    position: relative;
    display: flex;
    align-items: center;
}

.search-container input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    font-size: 1rem;
    color: var(--secondary-color);
    background-color: white;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.search-container input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
}

.search-container input::placeholder {
    color: #999;
}

.search-container input.has-selection {
    background-color: #f8f9fa;
    color: var(--secondary-color);
    font-weight: 500;
}

.clear-button {
    position: absolute;
    right: 8px;
    background: none;
    border: none;
    color: #666;
    font-size: 20px;
    cursor: pointer;
    padding: 0 5px;
}

.clear-button:hover {
    color: var(--error-color);
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 4px;
}

.search-result-item {
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
}

.search-result-item:last-child {
    border-bottom: none;
}

.search-result-item:hover {
    background-color: #f5f5f5;
}

.user-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.user-info strong {
    color: var(--secondary-color);
}

.user-info span {
    font-size: 0.9em;
    color: #666;
}

.selected-user {
    margin-top: 10px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: var(--border-radius);
    border: 1px solid #ddd;
}

.selected-user p {
    margin: 0;
    color: var(--secondary-color);
}

.no-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    padding: 10px;
    color: #666;
    text-align: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    margin-top: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
}
</style> 