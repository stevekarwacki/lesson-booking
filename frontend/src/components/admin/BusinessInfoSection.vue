<template>
  <div class="business-info-section">
    <div class="section-header">
      <h2>Business Information</h2>
      <p class="section-description">
        Manage your company details that appear throughout the application and in communications.
      </p>
    </div>
    
    <form @submit.prevent="saveBusinessInfo" class="business-form">
      <div class="form-grid-2col">
        <!-- Company Name -->
        <div class="form-item">
          <Label for="companyName">
            Company Name <span class="required">*</span>
          </Label>
          <Input
            id="companyName"
            v-model="formData.companyName"
            type="text"
            :class="{ error: errors.companyName }"
            placeholder="Enter your company name"
            required
            :disabled="loading"
          />
          <span v-if="errors.companyName" class="error-message">
            {{ errors.companyName }}
          </span>
        </div>
        
        <!-- Base URL -->
        <div class="form-item">
          <Label for="website">
            Base URL
          </Label>
          <Input
            id="website"
            v-model="formData.website"
            type="url"
            :class="{ error: errors.website }"
            placeholder="https://www.company.com"
            :disabled="loading"
          />
          <span v-if="errors.website" class="error-message">
            {{ errors.website }}
          </span>
        </div>
        
        <!-- Contact Email -->
        <div class="form-item">
          <Label for="contactEmail">
            Contact Email <span class="required">*</span>
          </Label>
          <Input
            id="contactEmail"
            v-model="formData.contactEmail"
            type="email"
            :class="{ error: errors.contactEmail }"
            placeholder="contact@company.com"
            required
            :disabled="loading"
          />
          <span v-if="errors.contactEmail" class="error-message">
            {{ errors.contactEmail }}
          </span>
        </div>
        
        <!-- Phone Number -->
        <div class="form-item">
          <Label for="phoneNumber">
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            v-model="formData.phoneNumber"
            type="tel"
            :class="{ error: errors.phoneNumber }"
            placeholder="+1 (555) 123-4567"
            :disabled="loading"
          />
          <span v-if="errors.phoneNumber" class="error-message">
            {{ errors.phoneNumber }}
          </span>
        </div>
        
        <!-- Business Address -->
        <div class="form-item-full">
          <Label for="address">
            Business Address
          </Label>
          <Input
            id="address"
            v-model="formData.address"
            type="text"
            :class="{ error: errors.address }"
            placeholder="123 Main Street, City, State 12345"
            :disabled="loading"
          />
          <span v-if="errors.address" class="error-message">
            {{ errors.address }}
          </span>
        </div>
        
        <!-- Business Timezone -->
        <div class="form-item-full">
          <Label for="timezone">
            Business Timezone <span class="required">*</span>
          </Label>
          <select
            id="timezone"
            v-model="formData.timezone"
            class="form-input"
            :class="{ error: errors.timezone }"
            required
            :disabled="loading"
          >
            <option value="">Select timezone...</option>
            <option
              v-for="tz in timezoneOptions"
              :key="tz.value"
              :value="tz.value"
            >
              {{ tz.label }}
            </option>
          </select>
          <span v-if="errors.timezone" class="error-message">
            {{ errors.timezone }}
          </span>
          <p class="field-help">
            This timezone will be used for all lesson scheduling and Google Calendar integration.
            Choose the timezone where your business operates.
          </p>
        </div>
      </div>
      
      <!-- Social Media Links -->
      <div class="social-section">
        <h3>Social Media Links</h3>
        <p class="section-description">
          Add links to your social media profiles (optional).
        </p>
        
        <div class="social-grid">
          <div class="form-group">
            <Label for="facebook">
              Facebook
            </Label>
            <Input
              id="facebook"
              v-model="formData.socialMedia.facebook"
              type="url"
              placeholder="https://facebook.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <Label for="twitter">
              Twitter
            </Label>
            <Input
              id="twitter"
              v-model="formData.socialMedia.twitter"
              type="url"
              placeholder="https://twitter.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <Label for="instagram">
              Instagram
            </Label>
            <Input
              id="instagram"
              v-model="formData.socialMedia.instagram"
              type="url"
              placeholder="https://instagram.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <Label for="linkedin">
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              v-model="formData.socialMedia.linkedin"
              type="url"
              placeholder="https://linkedin.com/company/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <Label for="youtube">
              YouTube
            </Label>
            <Input
              id="youtube"
              v-model="formData.socialMedia.youtube"
              type="url"
              placeholder="https://youtube.com/yourchannel"
              :disabled="loading"
            />
          </div>
        </div>
      </div>
      
      <!-- Business Hours -->
      <div class="hours-section">
        <h3>Business Hours</h3>
        <p class="section-description">
          Set your regular business hours for customer reference.
        </p>
        
        <div class="hours-grid">
          <div v-for="day in businessDays" :key="day.key" class="hours-day">
            <div class="day-header">
              <label class="day-label">{{ day.name }}</label>
              <label class="hours-toggle">
                <input
                  type="checkbox"
                  v-model="formData.businessHours[day.key].isOpen"
                  :disabled="loading"
                />
                <span class="toggle-slider"></span>
                <span class="toggle-label">
                  {{ formData.businessHours[day.key].isOpen ? 'Open' : 'Closed' }}
                </span>
              </label>
            </div>
            
            <div v-if="formData.businessHours[day.key].isOpen" class="time-inputs">
              <input
                v-model="formData.businessHours[day.key].open"
                type="time"
                class="time-input"
                :disabled="loading"
              />
              <span class="time-separator">to</span>
              <input
                v-model="formData.businessHours[day.key].close"
                type="time"
                class="time-input"
                :disabled="loading"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="section-actions">
        <Button 
          type="button"
          @click="resetForm" 
          variant="outline"
          :disabled="loading"
        >
          Reset Changes
        </Button>
        <Button 
          type="submit"
          :disabled="loading || !hasChanges || !isFormValid"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Saving...' : 'Save Business Information' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default {
  name: 'BusinessInfoSection',
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
      companyName: '',
      contactEmail: '',
      website: '',
      phoneNumber: '',
      address: '',
      timezone: '',
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: ''
      },
      businessHours: {
        monday: { isOpen: true, open: '09:00', close: '17:00' },
        tuesday: { isOpen: true, open: '09:00', close: '17:00' },
        wednesday: { isOpen: true, open: '09:00', close: '17:00' },
        thursday: { isOpen: true, open: '09:00', close: '17:00' },
        friday: { isOpen: true, open: '09:00', close: '17:00' },
        saturday: { isOpen: false, open: '09:00', close: '17:00' },
        sunday: { isOpen: false, open: '09:00', close: '17:00' }
      }
    })
    
    // Timezone options
    const timezoneOptions = [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
      { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
      { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
      { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
      { value: 'America/Toronto', label: 'America/Toronto (Eastern Time Canada)' },
      { value: 'America/Vancouver', label: 'America/Vancouver (Pacific Time Canada)' },
      { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
      { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
      { value: 'Europe/Rome', label: 'Europe/Rome (CET/CEST)' },
      { value: 'Europe/Madrid', label: 'Europe/Madrid (CET/CEST)' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
      { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)' },
      { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' }
    ]
    
    // Original data for change tracking
    const originalData = ref({})
    
    // Form validation
    const errors = reactive({})
    
    // Business days configuration
    const businessDays = [
      { key: 'monday', name: 'Monday' },
      { key: 'tuesday', name: 'Tuesday' },
      { key: 'wednesday', name: 'Wednesday' },
      { key: 'thursday', name: 'Thursday' },
      { key: 'friday', name: 'Friday' },
      { key: 'saturday', name: 'Saturday' },
      { key: 'sunday', name: 'Sunday' }
    ]
    
    // Computed properties
    const hasChanges = computed(() => {
      return JSON.stringify(formData) !== JSON.stringify(originalData.value)
    })
    
    const isFormValid = computed(() => {
      return formData.companyName.trim() &&
             formData.contactEmail.trim() &&
             formData.timezone.trim() &&
             isValidEmail(formData.contactEmail) &&
             Object.keys(errors).length === 0
    })
    
    // Methods
    const validateField = (field, value) => {
      delete errors[field]
      
      switch (field) {
        case 'companyName':
          if (!value || value.trim().length < 2) {
            errors[field] = 'Company name must be at least 2 characters'
          }
          break
          
        case 'contactEmail':
          if (!value || !isValidEmail(value)) {
            errors[field] = 'Please enter a valid email address'
          }
          break
          
        case 'phoneNumber':
          if (value && !isValidPhone(value)) {
            errors[field] = 'Please enter a valid phone number'
          }
          break
          
        case 'website':
          if (value && !isValidUrl(value)) {
            errors[field] = 'Please enter a valid website URL'
          }
          break
          
        case 'timezone':
          if (!value || value.trim().length === 0) {
            errors[field] = 'Business timezone is required'
          }
          break
      }
    }
    
    const isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }
    
    const isValidPhone = (phone) => {
      // Basic phone validation - accepts various formats
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '')
      return phoneRegex.test(cleanPhone)
    }
    
    const isValidUrl = (url) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }
    
    const saveBusinessInfo = () => {
      // Clear existing errors first
      Object.keys(errors).forEach(key => delete errors[key])
      
      // Validate all fields before saving
      validateField('companyName', formData.companyName)
      validateField('contactEmail', formData.contactEmail)
      validateField('phoneNumber', formData.phoneNumber)
      validateField('website', formData.website)
      validateField('timezone', formData.timezone)
      
      // Double-check if form is valid after validation
      const hasErrors = Object.keys(errors).length > 0
      const hasRequiredFields = formData.companyName.trim() && formData.contactEmail.trim() && formData.timezone.trim()
      
      if (!hasErrors && hasRequiredFields && isValidEmail(formData.contactEmail)) {
        emit('change', {
          tabId: 'business',
          action: 'save_business_info',
          payload: { ...formData }
        })
      }
    }
    
    const resetForm = () => {
      Object.assign(formData, originalData.value)
      Object.keys(errors).forEach(key => delete errors[key])
    }
    
    const loadInitialData = (data) => {
      if (data && Object.keys(data).length > 0) {
        // Merge with defaults to ensure all fields exist
        const defaultData = {
          companyName: '',
          contactEmail: '',
          phoneNumber: '',
          website: '',
          address: '',
          timezone: '',
          socialMedia: {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: ''
          },
          businessHours: {
            monday: { isOpen: true, open: '09:00', close: '17:00' },
            tuesday: { isOpen: true, open: '09:00', close: '17:00' },
            wednesday: { isOpen: true, open: '09:00', close: '17:00' },
            thursday: { isOpen: true, open: '09:00', close: '17:00' },
            friday: { isOpen: true, open: '09:00', close: '17:00' },
            saturday: { isOpen: false, open: '09:00', close: '17:00' },
            sunday: { isOpen: false, open: '09:00', close: '17:00' }
          }
        }
        
        const mergedData = { ...defaultData, ...data }
        Object.assign(formData, mergedData)
        originalData.value = JSON.parse(JSON.stringify(mergedData))
      }
    }
    
    // Watch for prop changes
    watch(() => props.initialData, loadInitialData, { immediate: true })
    
    // Watch for clear errors signal from parent
    watch(() => props.clearErrors, (newValue) => {
      if (newValue) {
        // Clear all validation errors when parent signals success
        Object.keys(errors).forEach(key => delete errors[key])
      }
    })
    
    // Watch form fields for validation
    watch(() => formData.companyName, (value) => validateField('companyName', value))
    watch(() => formData.contactEmail, (value) => validateField('contactEmail', value))
    watch(() => formData.phoneNumber, (value) => validateField('phoneNumber', value))
    watch(() => formData.website, (value) => validateField('website', value))
    watch(() => formData.timezone, (value) => validateField('timezone', value))
    
    return {
      formData,
      errors,
      businessDays,
      timezoneOptions,
      hasChanges,
      isFormValid,
      saveBusinessInfo,
      resetForm
    }
  }
}
</script>

<style scoped>
.business-info-section {
  max-width: 100%;
}

.section-header {
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  color: var(--text-primary);
  font-size: var(--font-size-2xl);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.section-description {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  margin: 0;
}

.business-form {
  max-width: 800px;
  margin: 0 auto;
}

.required {
  color: var(--error-color);
}

/* Social Media Section */
.social-section {
  margin-bottom: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.social-section h3 {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg) var(--spacing-xl);
  margin-top: var(--spacing-md);
}

/* Business Hours Section */
.hours-section {
  margin-bottom: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.hours-section h3 {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md);
}

.hours-day {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  background: white;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.day-label {
  font-weight: 500;
  color: var(--text-primary);
}

.hours-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.hours-toggle input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border-radius: 12px;
  position: relative;
  transition: background var(--transition-normal);
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-normal);
}

.hours-toggle input:checked + .toggle-slider {
  background: var(--primary-color);
}

.hours-toggle input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.toggle-label {
  min-width: 50px;
  color: var(--text-secondary);
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  justify-content: center;
  padding-top: var(--spacing-xs);
}

.time-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.time-separator {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

/* Action Buttons */
.section-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-base);
}

.btn.primary {
  background: var(--primary-color);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn.secondary {
  background: var(--background-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--border-color);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .social-grid {
    grid-template-columns: 1fr;
  }
  
  .day-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .time-inputs {
    justify-content: flex-start;
  }
  
  .section-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .business-form {
    margin: 0;
  }
  
  .time-inputs {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .time-separator {
    transform: rotate(90deg);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .toggle-slider,
  .toggle-slider::after {
    transition: none;
  }
  
  .loading-spinner {
    animation: none;
  }
}
</style>
