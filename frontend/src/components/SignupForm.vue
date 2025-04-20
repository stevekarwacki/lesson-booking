<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()

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
        error.value = 'All fields are required'
        return
    }

    if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match'
        return
    }

    try {
        const success = await userStore.register({
            name: name.value,
            email: email.value,
            password: password.value
        })

        if (success) {
            success.value = 'Account created successfully!'
            // Reset form
            name.value = ''
            email.value = ''
            password.value = ''
            confirmPassword.value = ''
        } else {
            error.value = 'Failed to create account'
        }
    } catch (err) {
        error.value = err.message || 'An error occurred during registration'
    }
}
</script>

<template>
    <div class="signup-form">
        <h2>Create Account</h2>
        
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        
        <div v-if="success" class="success-message">
            {{ success }}
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="name">Name</label>
                <input 
                    id="name"
                    v-model="name"
                    type="text"
                    placeholder="Enter your name"
                    required
                >
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input 
                    id="email"
                    v-model="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                >
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                >
            </div>

            <div class="form-group">
                <label for="confirm-password">Confirm Password</label>
                <input 
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    required
                >
            </div>

            <button type="submit" class="submit-button">Sign Up</button>
        </form>
    </div>
</template>

<style scoped>
.signup-form {
    background: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    box-shadow: var(--card-shadow);
}

h2 {
    color: var(--primary-color);
    margin-top: 0;
    margin-bottom: var(--spacing-md);
}

.form-group {
    margin-bottom: var(--spacing-md);
}

label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--secondary-color);
    font-weight: 500;
}

input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: var(--border-radius);
    transition: border-color 0.2s;
}

input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.submit-button {
    width: 100%;
    padding: 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 500;
    transition: background 0.2s;
}

.submit-button:hover {
    background: var(--primary-dark);
}

.error-message {
    color: #dc3545;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #dc3545;
    border-radius: 4px;
    background: #fff8f8;
}

.success-message {
    color: #28a745;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #28a745;
    border-radius: 4px;
    background: #f8fff8;
}
</style> 