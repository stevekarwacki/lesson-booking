<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { useFormFeedback } from '../composables/useFormFeedback'

const userStore = useUserStore()
const router = useRouter()
const { showSuccess, showError } = useFormFeedback()

const email = ref('')
const password = ref('')
const error = ref('')
const success = ref('')

const handleSubmit = async () => {
    error.value = ''
    success.value = ''

    if (!email.value || !password.value) {
        showError('All fields are required')
        return
    }

    try {
        const loginSuccess = await userStore.login(email.value, password.value)
        
        if (loginSuccess) {
            showSuccess('Login successful!')
            // Reset form
            email.value = ''
            password.value = ''
            
            // Ensure user data is available before redirecting
            if (userStore.user) {
                // Redirect based on permissions
                if (userStore.canManageUsers) {
                    await router.push('/admin/users')
                } else if (userStore.canManageCalendar) {
                    await router.push('/calendar')
                } else if (userStore.canCreateBooking && userStore.user.is_approved) {
                    await router.push('/book-lesson')
                }
            }
        } else {
            showError('Invalid email or password')
        }
    } catch (err) {
        showError(err.message || 'An error occurred during login')
    }
}
</script>

<template>
    <div class="form-container">
        <h2>Login</h2>
        
        <div v-if="error" class="form-message error-message">
            {{ error }}
        </div>
        
        <div v-if="success" class="form-message success-message">
            {{ success }}
        </div>

        <form @submit.prevent="handleSubmit">
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

            <button type="submit" class="form-button-full">Login</button>
        </form>
    </div>
</template>

<style scoped>
/* No additional styles needed as we're using shared styles */
</style> 