<script setup>
import { PageContainer } from '@/components/ui/page-container'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()
</script>

<template>
    <PageContainer class="home-page">
        <h1>Welcome to Lesson Booking</h1>
        <div v-if="userStore.user" class="welcome-message">
            <p>Welcome back, {{ userStore.user.name }}!</p>
        </div>
    </PageContainer>
</template>

<style scoped>
.welcome-message {
    margin-top: var(--spacing-md);
}
</style> 