<template>
    <div class="user-profile card">
        <div class="card-header">
            <h2>User Profile</h2>
        </div>
        <div class="card-body">
            <form @submit.prevent="saveProfile">
                <div class="form-group">
                    <Label for="name">Name:</Label>
                    <Input 
                        type="text" 
                        id="name" 
                        v-model="form.name"
                        required
                    />
                </div>

                <div class="form-group">
                    <Label for="email">Email:</Label>
                    <Input 
                        type="email" 
                        id="email" 
                        v-model="form.email"
                        required
                    />
                </div>

                <div v-if="userStore.canEditUserRole" class="form-group">
                    <Label for="role">Role:</Label>
                    <div class="form-input-group">
                        <select 
                            id="role" 
                            v-model="form.role" 
                            :disabled="!userStore.canEditSpecificUserRole(user)"
                            class="form-input"
                        >
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                        </select>
                        <small v-if="user?.role === 'instructor'" class="form-text">
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
                    <Button type="submit">
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const userStore = useUserStore()
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
    name: '',
    email: '',
    role: 'student'
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