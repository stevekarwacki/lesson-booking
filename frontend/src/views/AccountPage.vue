<template>
    <div class="account-page">
        <h1>Account</h1>
        
        <div class="account-sections">
            <Profile />
            
            <InstructorAvailabilityManager 
                v-if="isInstructor && instructorId"
                :instructor-id="instructorId"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import Profile from '../components/Profile.vue'
import InstructorAvailabilityManager from '../components/InstructorAvailabilityManager.vue'

const userStore = useUserStore()
const instructorId = ref('')

const isInstructor = computed(() => userStore.user?.role === 'instructor')

const fetchInstructorId = async () => {
    if (!isInstructor.value) return
    
    try {
        const response = await fetch(`/api/instructors/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (response.ok) {
            const instructor = await response.json()
            instructorId.value = instructor.id
        }
    } catch (err) {
        console.error('Error fetching instructor ID:', err)
    }
}

onMounted(() => {
    fetchInstructorId()
})
</script>

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