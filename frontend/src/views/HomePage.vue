<script setup>
import { currentUser } from '../stores/userStore'
</script>

<template>
    <div class="home-page">
        <h1>Welcome to Lesson Booking</h1>
        <div v-if="currentUser" class="welcome-message">
            <p>Welcome back, {{ currentUser.name }}!</p>
        </div>
    </div>
</template>

<style scoped>
.home-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
}

.welcome-message {
    margin-top: var(--spacing-md);
}
</style> 