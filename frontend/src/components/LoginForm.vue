<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { useFormFeedback } from '../composables/useFormFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
                <Label for="email">Email</Label>
                <Input 
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                />
            </div>

            <div class="form-group">
                <Label for="password">Password</Label>
                <Input 
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                />
            </div>

            <Button type="submit" class="w-full">Login</Button>
        </form>
    </div>
</template>

<style scoped>
/* No additional styles needed as we're using shared styles */
</style> 