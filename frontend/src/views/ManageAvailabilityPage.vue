<template>
    <div class="manage-availability-page">
        <div class="page-header">
            <h1>
                {{ isAdmin ? 'Manage Instructor Availability' : 'Manage Your Availability' }}
            </h1>
            
            <!-- Instructor selector for admin -->
            <div v-if="isAdmin" class="instructor-select">
                <label for="instructor">Select Instructor:</label>
                <select 
                    id="instructor"
                    v-model="selectedInstructorId"
                    @change="handleInstructorChange"
                >
                    <option value="">Choose an instructor</option>
                    <option 
                        v-for="instructor in instructors" 
                        :key="instructor.id" 
                        :value="instructor.id"
                    >
                        {{ instructor.User.name }}
                    </option>
                </select>
            </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        
        <!-- Only show availability manager when we have an instructor ID -->
        <InstructorAvailabilityManager 
            v-if="showAvailabilityManager && effectiveInstructorId"
            :instructor-id="effectiveInstructorId"
            ref="availabilityManager"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import InstructorAvailabilityManager from '../components/InstructorAvailabilityManager.vue'

const userStore = useUserStore()
const error = ref('')
const instructors = ref([])
const selectedInstructorId = ref('')
const availabilityManager = ref(null)
const instructorId = ref('')
const loading = ref(false)

const isAdmin = computed(() => userStore.isAdmin)

const effectiveInstructorId = computed(() => {
    if (isAdmin.value) {
        return selectedInstructorId.value || '';
    }
    return instructorId.value || '';
})

const showAvailabilityManager = computed(() => {
    if (isAdmin.value) {
        return !!selectedInstructorId.value;
    }
    return true;
})

const fetchInstructors = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch('/api/instructors', {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructors');
        }
        
        const data = await response.json();
        instructors.value = data;
    } catch (err) {
        error.value = 'Error fetching instructors: ' + err.message;
        console.error('Error fetching instructors:', err);
    } finally {
        loading.value = false;
    }
}

const fetchInstructorId = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const response = await fetch(`/api/instructors/user/${userStore.user.id}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructor information');
        }
        
        const instructor = await response.json();
        instructorId.value = instructor.id;
    } catch (err) {
        error.value = 'Error fetching instructor information: ' + err.message;
        console.error('Error fetching instructor information:', err);
    } finally {
        loading.value = false;
    }
}

const handleInstructorChange = () => {
    if (availabilityManager.value) {
        availabilityManager.value.resetAndFetch()
    }
}

onMounted(async () => {
    if (isAdmin.value) {
        await fetchInstructors()
    } else {
        await fetchInstructorId()
    }
})
</script>

<style scoped>
.manage-availability-page {
    max-width: 1200px;
    margin: 0 auto;
}

.page-header {
    margin-bottom: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.instructor-select {
    display: flex;
    gap: var(--spacing-md);
    align-items: center;
}

.instructor-select select {
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
}
</style> 