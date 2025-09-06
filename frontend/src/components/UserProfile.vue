<template>
    <div class="user-profile card">
        <div class="card-header">
            <h2>User Profile</h2>
        </div>
        <div class="card-body">
            <form @submit.prevent="saveProfile">
                <div class="form-group">
                    <label for="name" class="form-label">Name:</label>
                    <input 
                        type="text" 
                        id="name" 
                        v-model="form.name" 
                        class="form-input"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="email" class="form-label">Email:</label>
                    <input 
                        type="email" 
                        id="email" 
                        v-model="form.email" 
                        class="form-input"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="role" class="form-label">Role:</label>
                    <div class="form-input-group">
                        <select 
                            id="role" 
                            v-model="form.role" 
                            :disabled="isInstructor || !canEditRole"
                            class="form-input"
                        >
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                        </select>
                        <small v-if="isInstructor" class="form-text">
                            Instructor role is managed automatically
                        </small>
                    </div>
                </div>

                <div v-if="errorMessage" class="form-message error-message">
                    {{ errorMessage }}
                </div>

                <div v-if="successMessage" class="form-message success-message">
                    {{ successMessage }}
                </div>

                <div class="form-actions">
                    <button type="submit" class="form-button">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
    name: '',
    email: '',
    role: 'student'
})

const isInstructor = computed(() => {
    return props.user?.role === 'instructor'
})

const canEditRole = computed(() => {
    return userStore.canManageUsers
})

// Remove 'instructor' from direct role assignments
const saveProfile = async () => {
    try {
        if (form.value.role === 'instructor') {
            form.value.role = 'student'
        }
        
        // ... rest of save logic ...
    } catch (error) {
        errorMessage.value = error.message
    }
}
</script>

<style scoped>
.user-profile {
    max-width: 600px;
    margin: 0 auto;
}

.form-text {
    display: block;
    margin-top: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
}

.form-input-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

@media (max-width: 768px) {
    .user-profile {
        margin: var(--spacing-sm);
    }
}
</style> 