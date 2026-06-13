<script setup>
import Profile from './Profile.vue'
import InstructorDetailsForm from './InstructorDetailsForm.vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['profile-updated', 'instructor-saved', 'instructor-created'])
</script>

<template>
  <div class="user-info-tab">
    <Profile
      :user="user"
      :admin-mode="true"
      @profile-updated="emit('profile-updated', $event)"
    />

    <template v-if="user.role === 'instructor'">
      <hr class="section-divider" />
      <InstructorDetailsForm
        mode="admin"
        :user-id="user.id"
        @saved="emit('instructor-saved', $event)"
        @created="emit('instructor-created', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.section-divider {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1.5rem 0;
}
</style>
