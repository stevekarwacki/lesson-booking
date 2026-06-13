<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useInstructor } from '../composables/useInstructor'
import { useFormFeedback } from '../composables/useFormFeedback'
import Profile from '../components/Profile.vue'
import InstructorDetailsForm from '../components/InstructorDetailsForm.vue'
import InstructorAvailabilityManager from '../components/InstructorAvailabilityManager.vue'

const userStore = useUserStore()
const { showSuccess } = useFormFeedback()

const isInstructor = computed(() => userStore.user?.role === 'instructor')

const { instructor } = useInstructor({ mode: 'self' })

const handleInstructorSaved = () => {
    showSuccess('Instructor profile updated successfully')
}
</script>

<template>
    <div class="account-page">
        <h1>Account</h1>
        
        <div class="account-sections">
            <Profile />

            <template v-if="isInstructor">
                <InstructorDetailsForm
                    mode="self"
                    @saved="handleInstructorSaved"
                />

                <InstructorAvailabilityManager
                    v-if="instructor"
                    :instructor-id="instructor.id"
                />
            </template>
        </div>
    </div>
</template>

<style scoped>
.account-page {
    max-width: 900px;
    margin: 0 auto;
}

h1 {
    margin-bottom: var(--spacing-lg);
    color: var(--secondary-color);
}

.account-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}
</style>
