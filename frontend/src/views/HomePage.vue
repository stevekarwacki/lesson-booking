<script setup>
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
</script>

<template>
    <div class="home-page">
        <h1>Welcome to Lesson Booking</h1>
        <div v-if="userStore.user" class="welcome-message">
            <p>Welcome back, {{ userStore.user.name }}!</p>
        </div>
    </div>
</template>

<style scoped>
.home-page {
    max-width: 1200px;
    margin: 0 auto;
}

.welcome-message {
    margin-top: var(--spacing-md);
}
</style> 