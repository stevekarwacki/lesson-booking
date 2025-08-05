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
        
        <!-- Google Calendar Settings -->
        <GoogleCalendarSettings 
            v-if="showAvailabilityManager && effectiveInstructorId"
            :instructor-id="effectiveInstructorId"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import InstructorAvailabilityManager from '../components/InstructorAvailabilityManager.vue'
import GoogleCalendarSettings from '../components/GoogleCalendarSettings.vue'
import { fetchInstructors as fetchInstructorsHelper, fetchInstructorId as fetchInstructorIdHelper } from '../utils/fetchHelper'

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
        
        const result = await fetchInstructorsHelper(userStore.token, {
            onError: (errorMessage, err) => {
                error.value = errorMessage;
            }
        });
        
        instructors.value = result.instructors;
        
        // Auto-select if only one instructor exists
        if (result.selectedInstructor) {
            selectedInstructorId.value = result.selectedInstructor.id;
        }
    } catch (err) {
        // Error already handled in the helper
    } finally {
        loading.value = false;
    }
}

const fetchInstructorId = async () => {
    try {
        loading.value = true;
        error.value = null;
        
        const result = await fetchInstructorIdHelper(userStore.user.id, userStore.token, {
            onError: (errorMessage, err) => {
                error.value = errorMessage;
            }
        });
        
        instructorId.value = result;
    } catch (err) {
        // Error already handled in the helper
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

.page-header h1 {
    color: var(--secondary-color);
    font-size: 2rem;
    margin: 0;
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