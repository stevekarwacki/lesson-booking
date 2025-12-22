<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useFormFeedback } from '../composables/useFormFeedback'

const userStore = useUserStore()
const { showSuccess, showError } = useFormFeedback()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
    // Reset messages
    error.value = ''
    success.value = ''

    // Validate form
    if (!name.value || !email.value || !password.value) {
        showError('All fields are required')
        return
    }

    if (password.value !== confirmPassword.value) {
        showError('Passwords do not match')
        return
    }

    try {
        const success = await userStore.register({
            name: name.value,
            email: email.value,
            password: password.value
        })

        if (success) {
            showSuccess('Account created successfully!')
            // Reset form
            name.value = ''
            email.value = ''
            password.value = ''
            confirmPassword.value = ''
        } else {
            showError('Failed to create account')
        }
    } catch (err) {
        showError(err.message || 'An error occurred during registration')
    }
}
</script>

<template>
    <div class="form-container">
        <h2>Create Account</h2>
        
        <div v-if="error" class="form-message error-message">
            {{ error }}
        </div>
        
        <div v-if="success" class="form-message success-message">
            {{ success }}
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="name" class="form-label">Name</label>
                <input 
                    id="name"
                    v-model="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                    class="form-input"
                >
            </div>

            <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input 
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    class="form-input"
                >
            </div>

            <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input 
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    class="form-input"
                >
            </div>

            <div class="form-group">
                <label for="confirm-password" class="form-label">Confirm Password</label>
                <input 
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    required
                    class="form-input"
                >
            </div>

            <button type="submit" class="form-button-full">Sign Up</button>
        </form>
    </div>
</template>

<style scoped>
/* No additional styles needed as we're using shared styles */
</style> 