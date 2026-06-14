<script setup>
import { ref, watch } from 'vue'
import { useInstructor } from '@/composables/useInstructor'
import { useFormFeedback } from '@/composables/useFormFeedback'
import { Button } from '@/components/ui/button'
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

const { showSuccess, showError } = useFormFeedback()

const {
  instructor,
  isLoadingInstructor,
  createInstructor,
  updateInstructor,
  isCreatingInstructor,
  isUpdatingInstructor,
} = useInstructor({ mode: props.mode, userId: props.userId, instructorId: props.instructorId })

const isEditing = ref(false)

const formData = ref({ bio: '', specialties: '', hourly_rate: '' })

function syncForm(data) {
  formData.value = {
    bio: data?.bio || '',
    specialties: data?.specialties || '',
    hourly_rate: data?.hourly_rate ?? ''
  }
}

// Keep formData in sync with live instructor data when not editing
watch(
  () => instructor.value,
  (val) => {
    if (!isEditing.value) syncForm(val)
  },
  { immediate: true }
)

function startEditing() {
  syncForm(instructor.value)
  isEditing.value = true
}

function cancelEditing() {
  syncForm(instructor.value)
  isEditing.value = false
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
    isEditing.value = false
    showSuccess('Instructor profile created successfully')
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
    showSuccess('Instructor profile updated successfully')
  } catch (err) {
    showError(err.message || 'Failed to save instructor profile')
  }
}

function handleSubmit() {
  if (instructor.value) {
    handleSave()
  } else {
    handleCreate()
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Instructor Details</CardTitle>
      <CardDescription>
        {{ mode === 'admin' ? "View and edit this instructor's bio, specialties, and hourly rate." : 'Manage your bio, specialties, and hourly rate.' }}
      </CardDescription>
    </CardHeader>

    <CardContent>
      <div class="instructor-details-form">

        <div v-if="isLoadingInstructor" class="loading-message">
          Loading instructor profile...
        </div>

        <!-- Non-admin users with no profile -->
        <p v-else-if="!instructor && mode !== 'admin'" class="no-profile-text">
          Your instructor profile has not been set up yet. Contact an admin.
        </p>

        <form v-else @submit.prevent="handleSubmit" class="instructor-form">

          <!-- Bio -->
          <div class="field-group">
            <label class="field-label">Bio</label>
            <div class="bio-wrapper" :class="{ 'is-readonly': !isEditing }">
              <textarea
                v-model="formData.bio"
                class="field-textarea"
                :class="{ 'is-editing': isEditing }"
                :readonly="!isEditing"
                placeholder="Tell students about your teaching experience..."
              />
            </div>
          </div>

          <!-- Specialties -->
          <div class="field-group">
            <label class="field-label">Specialties</label>
            <input
              v-model="formData.specialties"
              class="field-input"
              :class="{ 'is-editing': isEditing }"
              :readonly="!isEditing"
              type="text"
              placeholder="e.g., Piano, Guitar, Voice"
            />
          </div>

          <!-- Hourly Rate with $ prefix -->
          <div class="field-group">
            <label class="field-label">Hourly Rate</label>
            <div class="prefixed-field" :class="{ 'is-editing': isEditing }">
              <span class="field-prefix">$</span>
              <input
                v-model="formData.hourly_rate"
                class="prefixed-input"
                :readonly="!isEditing"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Status badge — admin only, existing profile only -->
          <div v-if="mode === 'admin' && instructor" class="field-group">
            <label class="field-label">Status</label>
            <div>
              <Badge :variant="instructor.is_active ? 'default' : 'destructive'">
                {{ instructor.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <template v-if="!isEditing">
              <Button type="button" @click="startEditing">Edit</Button>
            </template>
            <template v-else>
              <Button type="submit" :disabled="isUpdatingInstructor || isCreatingInstructor">
                {{ (isUpdatingInstructor || isCreatingInstructor) ? 'Saving...' : (instructor ? 'Save' : 'Create Profile') }}
              </Button>
              <Button v-if="instructor" type="button" variant="outline" @click="cancelEditing">
                Cancel
              </Button>
            </template>
          </div>

        </form>
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

.no-profile-text {
  color: var(--text-secondary);
}

/* ── Layout ─────────────────────────────────────────────── */

.instructor-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* ── Label ───────────────────────────────────────────────── */

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary, #495057);
}

/* ── Shared input base ───────────────────────────────────── */

.field-input,
.field-textarea,
.prefixed-field {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary, #213547);
  background: var(--background-hover, #f8f9fa);
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: var(--border-radius, 8px);
  transition: background-color 0.2s ease, border-color 0.2s ease;
  outline: none;
}

/* Edit-mode: white background */
.field-input.is-editing,
.prefixed-field.is-editing {
  background: white;
}

/* Read-only: no cursor change, no focus ring */
.field-input[readonly],
.field-textarea[readonly] {
  cursor: default;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--primary-color, #28a745);
}

.field-input[readonly]:focus,
.field-textarea[readonly]:focus {
  border-color: var(--border-color, #dee2e6);
}

/* Single-line input padding */
.field-input {
  padding: 0.5rem 0.75rem;
}

/* ── Textarea / Bio ──────────────────────────────────────── */

.bio-wrapper {
  position: relative;
  border-radius: var(--border-radius, 8px);
  overflow: hidden; /* clip the fade pseudo-element */
}

.field-textarea {
  display: block;
  width: 100%;
  resize: none;
  padding: 0.5rem 0.75rem;
  line-height: 1.6;
  /* Collapsed: one line tall — sized to line-height + padding + border */
  max-height: 2.6rem;
  overflow: hidden;
  transition:
    max-height 0.45s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.field-textarea.is-editing {
  max-height: 5rem;
  overflow-y: auto;
  background: white;
}

/* Bottom fade — hints there's more content, visible only in read-only mode */
.bio-wrapper.is-readonly::after {
  content: '';
  position: absolute;
  bottom: 1px;
  left: 1px;
  right: 1px;
  height: 1.25rem;
  background: linear-gradient(to bottom, transparent, var(--background-hover, #f8f9fa));
  border-radius: 0 0 var(--border-radius, 8px) var(--border-radius, 8px);
  pointer-events: none;
  transition: opacity 0.2s ease;
}

/* ── Prefixed field (Hourly Rate) ────────────────────────── */

.prefixed-field {
  display: flex;
  align-items: stretch;
  padding: 0;           /* border/bg on wrapper, not the input */
}

.field-prefix {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.25rem 0.5rem 0.75rem;
  color: var(--text-secondary, #495057);
  user-select: none;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.prefixed-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--text-primary, #213547);
  padding: 0.5rem 0.75rem 0.5rem 0;
  cursor: default;
}

.prefixed-field.is-editing .prefixed-input {
  cursor: text;
}

/* Hide number spinners for cleaner look */
.prefixed-input::-webkit-outer-spin-button,
.prefixed-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.prefixed-input[type=number] {
  -moz-appearance: textfield;
}

/* ── Actions ─────────────────────────────────────────────── */

.form-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
</style>
