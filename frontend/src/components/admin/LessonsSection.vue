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
          <Label for="defaultDuration">
            Default Lesson Duration <span class="required">*</span>
          </Label>
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
      
      <!-- Payment Methods Section -->
      <div class="payment-methods-section">
        <h3 class="subsection-header">Payment Methods</h3>
        
        <div class="form-group full-width">
          <Label for="inPersonPayment">
            Allow In-Person Payments
          </Label>
          <div class="toggle-input-group">
            <label class="toggle-switch">
              <input
                type="checkbox"
                id="inPersonPayment"
                v-model="formData.inPersonPaymentEnabled"
                :disabled="loading"
                class="toggle-input"
              >
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">
              {{ formData.inPersonPaymentEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <span v-if="errors.inPersonPaymentEnabled" class="error-message">
            {{ errors.inPersonPaymentEnabled }}
          </span>
          <span class="help-text">
            When enabled globally, students can choose to pay for lessons in person. Individual students can have this overridden in their user settings.
          </span>
        </div>
        
        <div class="form-group full-width">
          <Label for="cardPaymentOnBehalf">
            Allow Card Payment in Order-on-Behalf-Of
          </Label>
          <div class="toggle-input-group">
            <label class="toggle-switch">
              <input
                type="checkbox"
                id="cardPaymentOnBehalf"
                v-model="formData.cardPaymentOnBehalfEnabled"
                :disabled="loading"
                class="toggle-input"
              >
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">
              {{ formData.cardPaymentOnBehalfEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <span v-if="errors.cardPaymentOnBehalfEnabled" class="error-message">
            {{ errors.cardPaymentOnBehalfEnabled }}
          </span>
          <span class="help-text">
            When enabled, admins and instructors can use card payment when booking lessons on behalf of students. Disabled by default for security.
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
          <div class="preview-item">
            <strong>In-Person Payment:</strong> {{ formData.inPersonPaymentEnabled ? 'Enabled' : 'Disabled' }}
          </div>
          <div class="preview-item">
            <strong>Card Payment (Book on Behalf):</strong> {{ formData.cardPaymentOnBehalfEnabled ? 'Enabled' : 'Disabled' }}
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
        <Button
          type="button"
          @click="resetForm"
          variant="outline"
          :disabled="loading || !hasChanges"
        >
          Reset Changes
        </Button>
        <Button
          type="submit"
          variant="default"
          :disabled="loading || !hasChanges"
        >
          <span v-if="loading">Saving...</span>
          <span v-else>Save Lesson Settings</span>
        </Button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default {
  name: 'LessonsSection',
  components: {
    Button,
    Label
  },
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
      defaultDurationMinutes: '30',
      inPersonPaymentEnabled: false,
      cardPaymentOnBehalfEnabled: false
    })
    
    // Original data for change tracking
    const originalData = ref({})
    
    // Form validation
    const errors = reactive({
      defaultDurationMinutes: '',
      inPersonPaymentEnabled: '',
      cardPaymentOnBehalfEnabled: ''
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
        default_duration_minutes: formData.defaultDurationMinutes,
        in_person_payment_enabled: formData.inPersonPaymentEnabled,
        card_payment_on_behalf_enabled: formData.cardPaymentOnBehalfEnabled
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
      formData.inPersonPaymentEnabled = lessonData.in_person_payment_enabled || false
      formData.cardPaymentOnBehalfEnabled = lessonData.card_payment_on_behalf_enabled || false
      
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
.section-header {
  margin-bottom: var(--spacing-xl, 2rem);
}

.section-header h2 {
  color: var(--text-primary, var(--color-text, #333));
  font-size: var(--font-size-2xl, 1.5rem, 24px);
  margin: 0 0 var(--spacing-sm, 0.5rem, 8px) 0;
  font-weight: 600;
}

.section-description {
  margin: 0;
  color: var(--text-secondary, var(--color-text-muted, #666));
  font-size: var(--font-size-base, 0.9rem, 14px);
  line-height: 1.6;
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

.payment-methods-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subsection-header {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary, var(--color-text, #333));
  font-size: var(--font-size-xl, 1.25rem, 20px);
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border);
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

/* Toggle Switch Styles */
.toggle-input-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-input:checked + .toggle-slider {
  background-color: #28a745;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-input:disabled + .toggle-slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-label {
  font-weight: 500;
  color: var(--color-text);
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
