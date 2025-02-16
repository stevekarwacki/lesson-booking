<template>
    <div class="booking-page">
        <div class="page-header">
            <h1>Book a Lesson</h1>
        </div>
        <LessonBooking />
    </div>
</template>

<script setup>
import LessonBooking from '../components/LessonBooking.vue'
</script>

<style scoped>
.booking-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
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