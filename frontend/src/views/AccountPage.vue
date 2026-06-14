<script setup>
import { computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { PageContainer } from '@/components/ui/page-container'
import Profile from '../components/Profile.vue'
import InstructorDetailsForm from '../components/InstructorDetailsForm.vue'

const userStore = useUserStore()

const isInstructor = computed(() => userStore.user?.role === 'instructor')
</script>

<template>
    <PageContainer class="account-page">
        <div class="page-header">
            <h1>Account</h1>
        </div>
        
        <div class="account-sections">
            <Profile />

            <template v-if="isInstructor">
                <InstructorDetailsForm
                    mode="self"
                />
            </template>
        </div>
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

.account-sections {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}
</style>
