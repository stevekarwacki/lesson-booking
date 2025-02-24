<script setup>
import { ref, onMounted, computed } from 'vue'
import { currentUser } from '../stores/userStore'

const users = ref([])
const error = ref('')
const success = ref('')
const showAddForm = ref(false)
const showEditModal = ref(false)
const editingUser = ref(null)

// Computed property to safely get current user ID
const currentUserId = computed(() => currentUser.value?.id)

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
                'user-id': currentUserId.value
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
    if (!currentUserId.value) {
        console.error('No currentUser.id available')
        error.value = 'User not properly authenticated'
        return
    }

    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'user-id': currentUserId.value
            }
        })
        if (!response.ok) throw new Error('Failed to fetch users')
        users.value = await response.json()
        // Make sure is_approved is a boolean
        users.value = users.value.map(user => ({
            ...user,
            is_approved: Boolean(user.is_approved)
        }))
    } catch (err) {
        error.value = 'Failed to load users'
        console.error(err)
    }
}

const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUserId.value
            }
        })
        if (!response.ok) throw new Error('Failed to delete user')
        
        success.value = 'User deleted successfully'
        await fetchUsers()
    } catch (err) {
        error.value = 'Error deleting user: ' + err.message
    }
}

const openEditModal = (user) => {
    editingUser.value = { ...user }
    showEditModal.value = true
}

const closeEditModal = () => {
    editingUser.value = null
    showEditModal.value = false
}

const saveUserEdit = async () => {
    try {
        // Update role
        const roleResponse = await fetch(`/api/admin/users/${editingUser.value.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUserId.value
            },
            body: JSON.stringify({ role: editingUser.value.role })
        });
        
        if (!roleResponse.ok) throw new Error('Failed to update user role');

        // Update approval status
        const approvalResponse = await fetch(`/api/users/${editingUser.value.id}/approval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUserId.value
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

onMounted(() => {
    if (currentUserId.value) {
        fetchUsers()
    }
})
</script>

<template>
    <div class="user-manager card">
        <div class="header-actions">
            <button 
                class="btn btn-primary"
                @click="showAddForm = !showAddForm"
            >
                {{ showAddForm ? 'Cancel' : 'Add New User' }}
            </button>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <div v-if="showAddForm" class="add-form">
            <h3>Add New User</h3>
            <form @submit.prevent="addUser">
                <div class="form-group">
                    <label for="name">Name:</label>
                    <input 
                        id="name"
                        v-model="newUser.name"
                        type="text"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="email">Email:</label>
                    <input 
                        id="email"
                        v-model="newUser.email"
                        type="email"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="password">Password:</label>
                    <input 
                        id="password"
                        v-model="newUser.password"
                        type="password"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="role">Role:</label>
                    <select 
                        id="role"
                        v-model="newUser.role"
                    >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-success">Create User</button>
            </form>
        </div>

        <div v-if="users.length === 0" class="loading">Loading users...</div>

        <div v-else class="users-table">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in users" :key="user.id">
                        <td>{{ user.name }}</td>
                        <td>{{ user.email }}</td>
                        <td>{{ user.role }}</td>
                        <td class="actions">
                            <button 
                                @click="openEditModal(user)"
                                class="btn btn-primary"
                                :disabled="user.id === currentUserId"
                            >
                                Edit
                            </button>
                            <button 
                                @click="deleteUser(user.id)"
                                class="btn btn-danger"
                                :disabled="user.id === currentUserId"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>Edit User</h3>
                    <button class="close-button" @click="closeEditModal">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" :value="editingUser?.name" disabled />
                    </div>
                    
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" :value="editingUser?.email" disabled />
                    </div>
                    
                    <div class="form-group">
                        <label for="editRole">Role:</label>
                        <select 
                            id="editRole"
                            v-model="editingUser.role"
                        >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>
                            <input 
                                type="checkbox"
                                v-model="editingUser.is_approved"
                            >
                            Account Approved
                        </label>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" @click="closeEditModal">Cancel</button>
                    <button class="btn btn-primary" @click="saveUserEdit">Save Changes</button>
                </div>
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
    display: flex;
    justify-content: flex-end;
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

.modal-overlay {
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

.modal {
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

/* Add to main.css if you want to reuse across components */
.btn-secondary {
    background-color: #6c757d;
    color: white;
}
</style> 