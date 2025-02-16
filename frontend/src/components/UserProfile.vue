<template>
    <!-- ... other template elements ... -->
    <div class="form-group">
        <label for="role">Role:</label>
        <select 
            id="role" 
            v-model="form.role" 
            :disabled="isInstructor || !canEditRole"
            class="form-control"
        >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
        </select>
        <small v-if="isInstructor" class="text-muted">
            Instructor role is managed automatically
        </small>
    </div>
    <!-- ... rest of template ... -->
</template>

<script setup>
import { ref, computed } from 'vue'

// ... other code ...

const isInstructor = computed(() => {
    return props.user?.role === 'instructor'
})

const canEditRole = computed(() => {
    return currentUser.value?.role === 'admin'
})

// Remove 'instructor' from direct role assignments
const saveProfile = async () => {
    try {
        if (form.value.role === 'instructor') {
            form.value.role = 'student'
        }
        
        // ... rest of save logic ...
    } catch (error) {
        errorMessage.value = error.message
    }
}
</script> 