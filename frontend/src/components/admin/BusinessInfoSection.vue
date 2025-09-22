<template>
  <div class="business-info-section">
    <div class="section-header">
      <h2>Business Information</h2>
      <p class="section-description">
        Manage your company details that appear throughout the application and in communications.
      </p>
    </div>
    
    <form @submit.prevent="saveBusinessInfo" class="business-form">
      <div class="form-grid">
        <!-- Company Name -->
        <div class="form-group full-width">
          <label for="companyName" class="form-label">
            Company Name <span class="required">*</span>
          </label>
          <input
            id="companyName"
            v-model="formData.companyName"
            type="text"
            class="form-input"
            :class="{ error: errors.companyName }"
            placeholder="Enter your company name"
            required
            :disabled="loading"
          />
          <span v-if="errors.companyName" class="error-message">
            {{ errors.companyName }}
          </span>
        </div>
        
        <!-- Contact Email -->
        <div class="form-group">
          <label for="contactEmail" class="form-label">
            Contact Email <span class="required">*</span>
          </label>
          <input
            id="contactEmail"
            v-model="formData.contactEmail"
            type="email"
            class="form-input"
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
        <div class="form-group">
          <label for="phoneNumber" class="form-label">
            Phone Number
          </label>
          <input
            id="phoneNumber"
            v-model="formData.phoneNumber"
            type="tel"
            class="form-input"
            :class="{ error: errors.phoneNumber }"
            placeholder="+1 (555) 123-4567"
            :disabled="loading"
          />
          <span v-if="errors.phoneNumber" class="error-message">
            {{ errors.phoneNumber }}
          </span>
        </div>
        
        <!-- Website -->
        <div class="form-group">
          <label for="website" class="form-label">
            Website
          </label>
          <input
            id="website"
            v-model="formData.website"
            type="url"
            class="form-input"
            :class="{ error: errors.website }"
            placeholder="https://www.company.com"
            :disabled="loading"
          />
          <span v-if="errors.website" class="error-message">
            {{ errors.website }}
          </span>
        </div>
        
        <!-- Business Address -->
        <div class="form-group full-width">
          <label for="address" class="form-label">
            Business Address
          </label>
          <textarea
            id="address"
            v-model="formData.address"
            class="form-textarea"
            :class="{ error: errors.address }"
            placeholder="123 Main Street&#10;City, State 12345&#10;Country"
            rows="3"
            :disabled="loading"
          ></textarea>
          <span v-if="errors.address" class="error-message">
            {{ errors.address }}
          </span>
        </div>
        
        <!-- Business Description -->
        <div class="form-group full-width">
          <label for="description" class="form-label">
            Business Description
          </label>
          <textarea
            id="description"
            v-model="formData.description"
            class="form-textarea"
            :class="{ error: errors.description }"
            placeholder="Brief description of your business and services..."
            rows="4"
            :disabled="loading"
          ></textarea>
          <span v-if="errors.description" class="error-message">
            {{ errors.description }}
          </span>
          <div class="character-count">
            {{ formData.description.length }}/500 characters
          </div>
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
            <label for="facebook" class="form-label">
              Facebook
            </label>
            <input
              id="facebook"
              v-model="formData.socialMedia.facebook"
              type="url"
              class="form-input"
              placeholder="https://facebook.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <label for="twitter" class="form-label">
              Twitter
            </label>
            <input
              id="twitter"
              v-model="formData.socialMedia.twitter"
              type="url"
              class="form-input"
              placeholder="https://twitter.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <label for="instagram" class="form-label">
              Instagram
            </label>
            <input
              id="instagram"
              v-model="formData.socialMedia.instagram"
              type="url"
              class="form-input"
              placeholder="https://instagram.com/yourcompany"
              :disabled="loading"
            />
          </div>
          
          <div class="form-group">
            <label for="linkedin" class="form-label">
              LinkedIn
            </label>
            <input
              id="linkedin"
              v-model="formData.socialMedia.linkedin"
              type="url"
              class="form-input"
              placeholder="https://linkedin.com/company/yourcompany"
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
        <button 
          type="button"
          @click="resetForm" 
          class="btn secondary"
          :disabled="loading"
        >
          Reset Changes
        </button>
        <button 
          type="submit"
          class="btn primary"
          :disabled="loading || !hasChanges || !isFormValid"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Saving...' : 'Save Business Information' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'

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
    }
  },
  
  emits: ['change'],
  
  setup(props, { emit }) {
    // Form data
    const formData = reactive({
      companyName: '',
      contactEmail: '',
      phoneNumber: '',
      website: '',
      address: '',
      description: '',
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
    })
    
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
          
        case 'description':
          if (value && value.length > 500) {
            errors[field] = 'Description must be 500 characters or less'
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
      // Validate all fields before saving
      validateField('companyName', formData.companyName)
      validateField('contactEmail', formData.contactEmail)
      validateField('phoneNumber', formData.phoneNumber)
      validateField('website', formData.website)
      validateField('description', formData.description)
      
      if (isFormValid.value) {
        emit('change', {
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
          description: '',
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
    
    // Watch form fields for validation
    watch(() => formData.companyName, (value) => validateField('companyName', value))
    watch(() => formData.contactEmail, (value) => validateField('contactEmail', value))
    watch(() => formData.phoneNumber, (value) => validateField('phoneNumber', value))
    watch(() => formData.website, (value) => validateField('website', value))
    watch(() => formData.description, (value) => validateField('description', value))
    
    return {
      formData,
      errors,
      businessDays,
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
  text-align: center;
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
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.business-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.required {
  color: var(--error-color);
}


.form-input,
.form-textarea {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-base);
  transition: border-color var(--transition-normal);
  font-family: var(--font-family);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
}

.form-input.error,
.form-textarea.error {
  border-color: var(--error-color);
}

.form-input:disabled,
.form-textarea:disabled {
  background: var(--background-hover);
  opacity: 0.6;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.character-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: right;
  margin-top: var(--spacing-xs);
}

.error-message {
  color: var(--error-color);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
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
  margin-bottom: var(--spacing-sm);
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
  gap: var(--spacing-sm);
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

/* Responsive Design */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .social-grid {
    grid-template-columns: 1fr;
  }
  
  .day-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .time-inputs {
    justify-content: center;
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
