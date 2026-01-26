<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useFormFeedback } from '../composables/useFormFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
                <Label for="name">Name</Label>
                <Input 
                    id="name"
                    v-model="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                />
            </div>

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

            <div class="form-group">
                <Label for="confirm-password">Confirm Password</Label>
                <Input 
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    required
                />
            </div>

            <Button type="submit" class="w-full">Sign Up</Button>
        </form>
    </div>
</template>

<style scoped>
/* No additional styles needed as we're using shared styles */
</style> 