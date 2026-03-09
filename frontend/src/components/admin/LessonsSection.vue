<template>
  <Card class="lessons-section">
    <CardHeader>
      <CardTitle>Lesson Configuration</CardTitle>
      <CardDescription>
        Configure default lesson settings that apply across the application.
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <form @submit.prevent="saveLessonSettings" class="lessons-form">
        <!-- Default Lesson Duration -->
        <div class="form-group form-group-horizontal">
          <Label for="defaultDuration" class="form-label">
            Default Lesson Duration <span class="required">*</span>
          </Label>
          <div class="form-input-wrapper">
            <Select 
              v-model="formData.defaultDurationMinutes"
              :disabled="loading"
            >
              <SelectTrigger id="defaultDuration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.defaultDurationMinutes" class="error-message">
              {{ errors.defaultDurationMinutes }}
            </p>
            <p class="help-text">
              This duration will be used as the default when creating new credits or when no specific duration is specified.
            </p>
          </div>
        </div>
        
        <!-- Payment Methods Section -->
        <div class="section-divider"></div>
        
        <div class="subsection">
          <h3 class="subsection-header">Payment Methods</h3>
          
          <div class="form-group">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <Label for="inPersonPayment">Allow In-Person Payments</Label>
                <p class="help-text">
                  When enabled globally, students can choose to pay for lessons in person. Individual students can have this overridden in their user settings.
                </p>
              </div>
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
            </div>
            <p v-if="errors.inPersonPaymentEnabled" class="error-message">
              {{ errors.inPersonPaymentEnabled }}
            </p>
          </div>
          
          <div class="form-group">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <Label for="cardPaymentOnBehalf">Allow Card Payment in Order-on-Behalf-Of</Label>
                <p class="help-text">
                  When enabled, admins and instructors can use card payment when booking lessons on behalf of students. Disabled by default for security.
                </p>
              </div>
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
            </div>
            <p v-if="errors.cardPaymentOnBehalfEnabled" class="error-message">
              {{ errors.cardPaymentOnBehalfEnabled }}
            </p>
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
    </CardContent>
  </Card>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default {
  name: 'LessonsSection',
  components: {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
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
.lessons-section {
  margin-bottom: 2rem;
}

.lessons-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group-horizontal {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.form-label {
  padding-top: 0.5rem;
  font-weight: 500;
}

.form-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
}

.required {
  color: var(--error-color);
}

.help-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.error-message {
  font-size: var(--font-size-sm);
  color: var(--error-color);
  margin: 0;
}

.section-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.subsection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subsection-header {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  cursor: pointer;
  flex-shrink: 0;
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
  background-color: var(--primary-color);
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-input:disabled + .toggle-slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

@media (max-width: 768px) {
  .form-group-horizontal {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .form-label {
    padding-top: 0;
  }
  
  .form-input-wrapper {
    max-width: 100%;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
}
</style>
