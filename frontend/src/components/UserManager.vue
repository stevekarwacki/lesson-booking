<script setup>
import { ref, onMounted, computed } from 'vue'
import { currentUser } from '../stores/userStore'

const users = ref([])
const error = ref('')
const success = ref('')

// Computed property to safely get current user ID
const currentUserId = computed(() => currentUser.value?.id)

const fetchUsers = async () => {
    if (!currentUserId.value) {
        console.error('No currentUser.id available')
        error.value = 'User not properly authenticated'
        return
    }

    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUserId.value
            }
        })

        const data = await response.json()
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch users')
        }

        users.value = data
    } catch (err) {
        console.error('Error in fetchUsers:', err)
        error.value = 'Error fetching users: ' + err.message
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

const updateUserRole = async (userId, newRole) => {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'user-id': currentUserId.value
            },
            body: JSON.stringify({ role: newRole })
        })
        if (!response.ok) throw new Error('Failed to update user role')
        
        success.value = 'User role updated successfully'
        await fetchUsers()
    } catch (err) {
        error.value = 'Error updating user role: ' + err.message
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
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

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
                        <td>
                            <select 
                                v-model="user.role"
                                @change="updateUserRole(user.id, user.role)"
                                :disabled="user.id === currentUserId"
                            >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </td>
                        <td>
                            <button 
                                @click="deleteUser(user.id)"
                                class="delete-button"
                                :disabled="user.id === currentUserId"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
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

.error-message {
    color: var(--error-color);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    border: 1px solid var(--error-color);
    border-radius: var(--border-radius);
}

.success-message {
    color: var(--success-color);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    border: 1px solid var(--success-color);
    border-radius: var(--border-radius);
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

select {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    background-color: white;
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
</style> 