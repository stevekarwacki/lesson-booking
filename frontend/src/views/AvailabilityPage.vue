<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useInstructor } from '../composables/useInstructor'
import { PageContainer } from '@/components/ui/page-container'
import InstructorAvailabilityManager from '../components/InstructorAvailabilityManager.vue'
import InstructorTimeBlocking from '../components/InstructorTimeBlocking.vue'
import GoogleCalendarSettings from '../components/GoogleCalendarSettings.vue'

const userStore = useUserStore()

const isInstructor = computed(() => userStore.user?.role === 'instructor')

const { instructor } = useInstructor({
    mode: 'self',
    enabled: isInstructor
})
</script>

<template>
    <PageContainer class="availability-page">
        <div class="page-header">
            <h1>Availability</h1>
        </div>

        <div v-if="instructor" class="availability-sections">
            <InstructorAvailabilityManager :instructor-id="instructor.id" />
            <InstructorTimeBlocking :instructor-id="instructor.id" />
            <GoogleCalendarSettings :instructor-id="instructor.id" />
        </div>

        <p v-else class="loading-state">Loading availability settings…</p>
    </PageContainer>
</template>

<style scoped>
.page-header {
    margin-bottom: var(--spacing-lg);
}

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
}

.availability-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.loading-state {
    color: var(--text-muted);
    text-align: center;
    padding: var(--spacing-xl);
}
</style>
