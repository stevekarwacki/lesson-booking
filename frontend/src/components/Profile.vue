<template>
    <div class="profile">
        <h2>Profile</h2>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <div class="card">
            <form @submit.prevent="updateProfile">
                <div class="form-group">
                    <label for="name">Name</label>
                    <input 
                        id="name"
                        v-model="profileData.name"
                        type="text"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="email">Email</label>
                    <input 
                        id="email"
                        v-model="profileData.email"
                        type="email"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="new-password">New Password (leave blank to keep current)</label>
                    <input 
                        id="new-password"
                        v-model="profileData.newPassword"
                        type="password"
                        placeholder="Enter new password"
                    >
                </div>

                <div class="form-group">
                    <label for="confirm-password">Confirm New Password</label>
                    <input 
                        id="confirm-password"
                        v-model="profileData.confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        :disabled="!profileData.newPassword"
                    >
                </div>

                <button type="submit" class="btn btn-primary">Update Profile</button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
const error = ref('')
const success = ref('')
const profileData = ref({
    name: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
})

onMounted(async () => {
    if (userStore.user) {
        profileData.value.name = userStore.user.name
        profileData.value.email = userStore.user.email
    }
})

const updateProfile = async () => {
    error.value = ''
    success.value = ''

    // Validate passwords match if new password is provided
    if (profileData.value.newPassword && 
        profileData.value.newPassword !== profileData.value.confirmPassword) {
        error.value = 'Passwords do not match'
        return
    }

    try {
        const response = await fetch(`/api/users/${userStore.user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                name: profileData.value.name,
                email: profileData.value.email,
                password: profileData.value.newPassword || undefined
            })
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to update profile')
        }

        success.value = 'Profile updated successfully'
        
        // Clear password fields after successful update
        profileData.value.newPassword = ''
        profileData.value.confirmPassword = ''
        
        // Update current user data
        userStore.user = {
            ...userStore.user,
            name: profileData.value.name,
            email: profileData.value.email
        }
    } catch (err) {
        error.value = err.message
    }
}
</script>

<style scoped>
.profile {
    max-width: 600px;
    margin: 0 auto;
}

h2 {
    margin-bottom: var(--spacing-md);
    color: var(--secondary-color);
}
</style> 