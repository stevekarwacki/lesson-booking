<template>
  <div class="lessons-section">
    <div class="section-header">
      <h2>Lesson Configuration</h2>
      <p class="section-description">
        Configure default lesson settings that apply across the application.
      </p>
    </div>
    
    <form @submit.prevent="saveLessonSettings" class="lessons-form">
      <div class="form-grid">
        <!-- Default Lesson Duration -->
        <div class="form-group full-width">
          <label for="defaultDuration" class="form-label">
            Default Lesson Duration <span class="required">*</span>
          </label>
          <div class="duration-input-group">
            <select
              id="defaultDuration"
              v-model="formData.defaultDurationMinutes"
              class="form-input duration-select"
              :class="{ error: errors.defaultDurationMinutes }"
              required
              :disabled="loading"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </div>
          <span v-if="errors.defaultDurationMinutes" class="error-message">
            {{ errors.defaultDurationMinutes }}
          </span>
          <span class="help-text">
            This duration will be used as the default when creating new credits or when no specific duration is specified.
          </span>
        </div>
      </div>
      
      <!-- Preview Section -->
      <div class="preview-section">
        <h3>Preview</h3>
        <div class="preview-card">
          <div class="preview-item">
            <strong>Default Duration:</strong> {{ formData.defaultDurationMinutes }} minutes
          </div>
          <div class="preview-note">
            <small>
              This setting affects credit operations, booking defaults, and system-wide lesson duration handling.
            </small>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="form-actions">
        <button
          type="button"
          @click="resetForm"
          class="form-button form-button-secondary"
          :disabled="loading || !hasChanges"
        >
          Reset Changes
        </button>
        <button
          type="submit"
          class="form-button form-button-primary"
          :disabled="loading || !hasChanges"
        >
          <span v-if="loading">Saving...</span>
          <span v-else>Save Lesson Settings</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'

export default {
  name: 'LessonsSection',
  props: {
    initialData: {
      type: Object,
      default: () => ({})
    },
    loading: {
      type: Boolean,
      default: false
    },
    clearErrors: {
      type: [Number, null],
      default: null
    }
  },
  
  emits: ['change'],
  
  setup(props, { emit }) {
    // Form data
    const formData = reactive({
      defaultDurationMinutes: '30'
    })
    
    // Original data for change tracking
    const originalData = ref({})
    
    // Form validation
    const errors = reactive({
      defaultDurationMinutes: ''
    })
    
    // Validation functions
    const validateDuration = (value) => {
      const duration = parseInt(value)
      if (!duration || duration < 15) {
        return 'Duration must be at least 15 minutes'
      }
      if (duration > 180) {
        return 'Duration cannot exceed 180 minutes'
      }
      if (![15, 30, 45, 60, 90, 120].includes(duration)) {
        return 'Please select a valid duration option'
      }
      return ''
    }
    
    // Computed properties
    const hasChanges = computed(() => {
      return JSON.stringify(formData) !== JSON.stringify(originalData.value)
    })
    
    // Methods
    const validateForm = () => {
      errors.defaultDurationMinutes = validateDuration(formData.defaultDurationMinutes)
      
      return !Object.values(errors).some(error => error !== '')
    }
    
    const resetForm = () => {
      Object.assign(formData, originalData.value)
      clearValidationErrors()
    }
    
    const clearValidationErrors = () => {
      Object.keys(errors).forEach(key => {
        errors[key] = ''
      })
    }
    
    const saveLessonSettings = () => {
      if (!validateForm()) {
        return
      }
      
      const settingsToSave = {
        default_duration_minutes: formData.defaultDurationMinutes
      }
      
      emit('change', {
        tabId: 'lessons',
        payload: settingsToSave
      })
    }
    
    // Initialize form data
    const initializeFormData = (data) => {
      const lessonData = data || {}
      
      formData.defaultDurationMinutes = lessonData.default_duration_minutes || '30'
      
      // Store original data for change tracking
      originalData.value = JSON.parse(JSON.stringify(formData))
      
      clearValidationErrors()
    }
    
    // Watch for prop changes
    watch(() => props.initialData, (newData) => {
      initializeFormData(newData)
    }, { immediate: true, deep: true })
    
    // Clear errors when requested
    watch(() => props.clearErrors, (newVal) => {
      if (newVal) {
        clearValidationErrors()
      }
    })
    
    return {
      formData,
      errors,
      hasChanges,
      validateForm,
      resetForm,
      saveLessonSettings
    }
  }
}
</script>

<style scoped>
.lessons-section {
  max-width: 800px;
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.5rem;
  font-weight: 600;
}

.section-description {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.lessons-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
}

.required {
  color: var(--color-danger);
}

.duration-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.duration-select {
  flex: 1;
  max-width: 200px;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
  background: var(--color-background);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}

.form-input.error {
  border-color: var(--color-danger);
}

.form-input:disabled {
  background-color: var(--color-background-muted);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.error-message {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-danger);
}

.help-text {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.preview-section {
  padding: 1.5rem;
  background: var(--color-background-alt);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.preview-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-card {
  background: var(--color-background);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.preview-item {
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
}

.preview-note {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.preview-note small {
  color: var(--color-text-muted);
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.form-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.form-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-button-secondary {
  background: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.form-button-secondary:hover:not(:disabled) {
  background: var(--color-background-muted);
}

.form-button-primary {
  background: #28a745 !important;
  color: white !important;
}

.form-button-primary:hover:not(:disabled) {
  background: #1e7e34 !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .form-button {
    width: 100%;
  }
}
</style>
