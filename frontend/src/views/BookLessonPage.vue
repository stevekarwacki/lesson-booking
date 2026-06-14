<template>
    <PageContainer class="book-lesson-page">
        <UserBookings />
        <LessonBooking />
    </PageContainer>
</template>

<script setup>
import { PageContainer } from '@/components/ui/page-container'
import LessonBooking from '../components/LessonBooking.vue'
import UserBookings from '../components/UserBookings.vue'
</script>

<style scoped>
.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}
</style> 