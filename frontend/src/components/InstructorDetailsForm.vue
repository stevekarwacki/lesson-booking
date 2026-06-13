<script setup>
import { ref, watch } from 'vue'
import { useInstructor } from '@/composables/useInstructor'
import { useFormFeedback } from '@/composables/useFormFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps({
  mode: {
    type: String,
    default: 'admin',
    validator: (v) => ['self', 'admin'].includes(v)
  },
  userId: {
    type: Number,
    default: null
  },
  instructorId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['saved', 'created'])

const { showError } = useFormFeedback()

const {
  instructor,
  isLoadingInstructor,
  createInstructor,
  updateInstructor,
  toggleActive,
  isCreatingInstructor,
  isUpdatingInstructor,
  isTogglingActive
} = useInstructor({ mode: props.mode, userId: props.userId, instructorId: props.instructorId })

const isEditing = ref(false)

const emptyForm = () => ({ bio: '', specialties: '', hourly_rate: '' })

const formData = ref(emptyForm())

// Populate form when entering edit mode or when instructor data first loads
watch(
  () => instructor.value,
  (val) => {
    if (val && isEditing.value) syncForm(val)
  }
)

function syncForm(data) {
  formData.value = {
    bio: data.bio || '',
    specialties: data.specialties || '',
    hourly_rate: data.hourly_rate || ''
  }
}

function startEditing() {
  syncForm(instructor.value)
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  formData.value = emptyForm()
}

async function handleCreate() {
  if (!props.userId) {
    showError('Cannot create instructor: user ID is missing')
    return
  }
  try {
    await createInstructor({
      user_id: props.userId,
      bio: formData.value.bio,
      specialties: formData.value.specialties,
      hourly_rate: formData.value.hourly_rate
    })
    emit('created')
  } catch (err) {
    showError(err.message || 'Failed to create instructor profile')
  }
}

async function handleSave() {
  try {
    await updateInstructor({
      bio: formData.value.bio,
      specialties: formData.value.specialties,
      hourly_rate: formData.value.hourly_rate
    })
    isEditing.value = false
    emit('saved')
  } catch (err) {
    showError(err.message || 'Failed to save instructor profile')
  }
}

async function handleToggleActive() {
  try {
    await toggleActive()
    emit('saved')
  } catch (err) {
    showError(err.message || 'Failed to update active status')
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Instructor Details</CardTitle>
      <CardDescription>
        {{ mode === 'admin' ? 'View and edit this instructor\'s bio, specialties, and hourly rate.' : 'Manage your bio, specialties, and hourly rate.' }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div class="instructor-details-form">
    <!-- Loading -->
    <div v-if="isLoadingInstructor" class="loading-message">
      Loading instructor profile...
    </div>

    <!-- No profile yet — create form (admin only) -->
    <div v-else-if="!instructor" class="no-profile">
      <p v-if="mode === 'admin'" class="no-profile-text">
        This instructor doesn't have a profile yet.
      </p>
      <p v-else class="no-profile-text">
        Your instructor profile has not been set up yet.
      </p>

      <form v-if="mode === 'admin'" @submit.prevent="handleCreate" class="form">
        <div class="form-group">
          <Label>Bio</Label>
          <Textarea
            v-model="formData.bio"
            rows="4"
            placeholder="Tell students about your teaching experience..."
          />
        </div>

        <div class="form-group">
          <Label>Specialties</Label>
          <Input
            v-model="formData.specialties"
            type="text"
            placeholder="e.g., Piano, Guitar, Voice"
          />
        </div>

        <div class="form-group">
          <Label>Hourly Rate ($)</Label>
          <Input
            v-model="formData.hourly_rate"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </div>

        <div class="form-actions">
          <Button type="submit" :disabled="isCreatingInstructor">
            {{ isCreatingInstructor ? 'Creating...' : 'Create Profile' }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Profile exists — view mode -->
    <div v-else-if="!isEditing" class="profile-view">
      <div class="profile-field">
        <span class="field-label">Bio</span>
        <p class="field-value">{{ instructor.bio || 'No bio provided' }}</p>
      </div>

      <div class="profile-field">
        <span class="field-label">Specialties</span>
        <p class="field-value">{{ instructor.specialties || 'No specialties listed' }}</p>
      </div>

      <div class="profile-field">
        <span class="field-label">Hourly Rate</span>
        <p class="field-value">${{ instructor.hourly_rate || '0.00' }}</p>
      </div>

      <!-- Active status — admin only -->
      <div v-if="mode === 'admin'" class="profile-field">
        <span class="field-label">Status</span>
        <div>
          <Badge :variant="instructor.is_active ? 'default' : 'destructive'">
            {{ instructor.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </div>
      </div>

      <div class="form-actions">
        <Button @click="startEditing">Edit</Button>
        <Button
          v-if="mode === 'admin'"
          variant="outline"
          :disabled="isTogglingActive"
          @click="handleToggleActive"
        >
          {{ isTogglingActive ? 'Updating...' : (instructor.is_active ? 'Deactivate' : 'Activate') }}
        </Button>
      </div>
    </div>

    <!-- Profile exists — edit mode -->
    <div v-else class="profile-edit">
      <form @submit.prevent="handleSave" class="form">
        <div class="form-group">
          <Label>Bio</Label>
          <Textarea
            v-model="formData.bio"
            rows="4"
          />
        </div>

        <div class="form-group">
          <Label>Specialties</Label>
          <Input v-model="formData.specialties" type="text" />
        </div>

        <div class="form-group">
          <Label>Hourly Rate ($)</Label>
          <Input
            v-model="formData.hourly_rate"
            type="number"
            step="0.01"
            min="0"
          />
        </div>

        <div class="form-actions">
          <Button type="submit" :disabled="isUpdatingInstructor">
            {{ isUpdatingInstructor ? 'Saving...' : 'Save' }}
          </Button>
          <Button type="button" variant="outline" @click="cancelEditing">
            Cancel
          </Button>
        </div>
      </form>
    </div>
    </div>
  </CardContent>
  </Card>
</template>

<style scoped>
.instructor-details-form {
  max-width: 600px;
}

.loading-message {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--text-secondary);
}

.no-profile {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: var(--spacing-xl);
}

.no-profile-text {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.profile-view,
.profile-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.field-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value {
  margin: 0;
  padding: 0.6rem 0.75rem;
  background: var(--background-hover);
  border-radius: var(--border-radius);
  color: var(--text-color);
}
</style>
