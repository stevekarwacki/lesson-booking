<template>
    <div class="booking-page">
        <UserBookings />
        <LessonBooking />
    </div>
</template>

<script setup>
import LessonBooking from '../components/LessonBooking.vue'
import UserBookings from '../components/UserBookings.vue'
</script>

<style scoped>
.booking-page {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}
</style> 