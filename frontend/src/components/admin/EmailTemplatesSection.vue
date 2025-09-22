<template>
  <div class="email-templates-section">
    <div class="section-header">
      <h2>Email Templates</h2>
      <p class="section-description">
        Manage and customize email templates used throughout the application.
        <strong>WYSIWYG editing coming soon!</strong>
      </p>
    </div>
    
    <!-- Future Implementation Notice -->
    <div class="future-notice">
      <div class="notice-icon">🚧</div>
      <div class="notice-content">
        <h3>Under Development</h3>
        <p>
          This section is currently under development. We're planning to integrate 
          <strong>Tiptap WYSIWYG editor</strong> to provide rich text editing capabilities 
          for email templates.
        </p>
        
        <div class="planned-features">
          <h4>Planned Features:</h4>
          <ul>
            <li>✨ Rich text editing with Tiptap</li>
            <li>📧 Email template management</li>
            <li>🎨 Template customization with your branding</li>
            <li>👀 Live email preview</li>
            <li>📱 Mobile-responsive email design</li>
            <li>🔧 Variable substitution ({{name}}, {{date}}, etc.)</li>
          </ul>
        </div>
        
        <div class="current-templates">
          <h4>Current Email Templates:</h4>
          <div class="template-list">
            <div class="template-item">
              <span class="template-name">Welcome Email</span>
              <span class="template-status">Handlebars Template</span>
            </div>
            <div class="template-item">
              <span class="template-name">Booking Confirmation</span>
              <span class="template-status">Handlebars Template</span>
            </div>
            <div class="template-item">
              <span class="template-name">Password Reset</span>
              <span class="template-status">Handlebars Template</span>
            </div>
            <div class="template-item">
              <span class="template-name">Low Balance Alert</span>
              <span class="template-status">Handlebars Template</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Temporary Configuration -->
    <div class="temp-config">
      <h3>Basic Email Settings</h3>
      <p>Configure basic email settings while we develop the full template editor.</p>
      
      <form @submit.prevent="saveEmailSettings" class="email-form">
        <div class="form-grid">
          <div class="form-group">
            <label for="fromName" class="form-label">
              From Name
            </label>
            <input
              id="fromName"
              v-model="emailSettings.fromName"
              type="text"
              class="form-input"
              placeholder="Your Company Name"
              :disabled="loading"
            />
            <span class="form-help">
              This name will appear as the sender in emails
            </span>
          </div>
          
          <div class="form-group">
            <label for="fromEmail" class="form-label">
              From Email
            </label>
            <input
              id="fromEmail"
              v-model="emailSettings.fromEmail"
              type="email"
              class="form-input"
              placeholder="noreply@yourcompany.com"
              :disabled="loading"
            />
            <span class="form-help">
              This email will be used as the sender address
            </span>
          </div>
          
          <div class="form-group">
            <label for="replyTo" class="form-label">
              Reply-To Email
            </label>
            <input
              id="replyTo"
              v-model="emailSettings.replyTo"
              type="email"
              class="form-input"
              placeholder="support@yourcompany.com"
              :disabled="loading"
            />
            <span class="form-help">
              Where replies to automated emails should go
            </span>
          </div>
          
          <div class="form-group">
            <label for="footerText" class="form-label">
              Email Footer Text
            </label>
            <textarea
              id="footerText"
              v-model="emailSettings.footerText"
              class="form-textarea"
              placeholder="© 2024 Your Company Name. All rights reserved."
              rows="3"
              :disabled="loading"
            ></textarea>
            <span class="form-help">
              Text that appears at the bottom of all emails
            </span>
          </div>
        </div>
        
        <div class="section-actions">
          <button 
            type="button"
            @click="resetEmailSettings" 
            class="btn secondary"
            :disabled="loading"
          >
            Reset
          </button>
          <button 
            type="submit"
            class="btn primary"
            :disabled="loading || !hasEmailChanges"
          >
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? 'Saving...' : 'Save Email Settings' }}
          </button>
        </div>
      </form>
    </div>
    
    <!-- Development Timeline -->
    <div class="timeline-section">
      <h3>Development Timeline</h3>
      <div class="timeline">
        <div class="timeline-item completed">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <h4>Phase 1: Planning & Architecture</h4>
            <p>Design email template system architecture</p>
            <span class="timeline-status">✅ Completed</span>
          </div>
        </div>
        
        <div class="timeline-item current">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <h4>Phase 2: Tiptap Integration</h4>
            <p>Integrate Tiptap WYSIWYG editor with Vue 3</p>
            <span class="timeline-status">🚧 In Progress</span>
          </div>
        </div>
        
        <div class="timeline-item pending">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <h4>Phase 3: Template Management</h4>
            <p>Build template CRUD operations and preview system</p>
            <span class="timeline-status">⏳ Pending</span>
          </div>
        </div>
        
        <div class="timeline-item pending">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <h4>Phase 4: Advanced Features</h4>
            <p>Variable substitution, mobile preview, A/B testing</p>
            <span class="timeline-status">⏳ Pending</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, reactive } from 'vue'

export default {
  name: 'EmailTemplatesSection',
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
    // Email settings form
    const emailSettings = reactive({
      fromName: 'Lesson Booking App',
      fromEmail: 'noreply@lessonbooking.com',
      replyTo: 'support@lessonbooking.com',
      footerText: '© 2024 Lesson Booking App. All rights reserved.'
    })
    
    const originalEmailSettings = ref({})
    
    // Computed properties
    const hasEmailChanges = computed(() => {
      return JSON.stringify(emailSettings) !== JSON.stringify(originalEmailSettings.value)
    })
    
    // Methods
    const saveEmailSettings = () => {
      emit('change', {
        action: 'save_email_settings',
        payload: { ...emailSettings }
      })
    }
    
    const resetEmailSettings = () => {
      Object.assign(emailSettings, originalEmailSettings.value)
    }
    
    const loadInitialData = (data) => {
      if (data && data.emailSettings) {
        Object.assign(emailSettings, data.emailSettings)
        originalEmailSettings.value = { ...data.emailSettings }
      } else {
        // Set default values
        originalEmailSettings.value = { ...emailSettings }
      }
    }
    
    // Watch for prop changes
    watch(() => props.initialData, loadInitialData, { immediate: true })
    
    return {
      emailSettings,
      hasEmailChanges,
      saveEmailSettings,
      resetEmailSettings
    }
  }
}
</script>

<style scoped>
.email-templates-section {
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

/* Future Implementation Notice */
.future-notice {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-xl);
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius-lg);
  margin-bottom: var(--spacing-xl);
}

.notice-icon {
  font-size: 3rem;
  flex-shrink: 0;
  line-height: 1;
}

.notice-content h3 {
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.notice-content p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 var(--spacing-lg) 0;
}

.planned-features,
.current-templates {
  margin-bottom: var(--spacing-lg);
}

.planned-features h4,
.current-templates h4 {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 500;
}

.planned-features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.planned-features li {
  padding: var(--spacing-xs) 0;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

.template-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
}

.template-name {
  font-weight: 500;
  color: var(--text-primary);
}

.template-status {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  background: var(--background-hover);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
}

/* Temporary Configuration */
.temp-config {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.temp-config h3 {
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.temp-config > p {
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-lg) 0;
  line-height: 1.6;
}

.email-form {
  max-width: 600px;
}

.form-grid {
  display: grid;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
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

.form-input:disabled,
.form-textarea:disabled {
  background: var(--background-hover);
  opacity: 0.6;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-help {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-style: italic;
}

/* Timeline Section */
.timeline-section {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
}

.timeline-section h3 {
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  margin: 0 0 var(--spacing-lg) 0;
  font-weight: 600;
  text-align: center;
}

.timeline {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
}

.timeline-item {
  position: relative;
  padding-left: 60px;
  margin-bottom: var(--spacing-xl);
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: 12px;
  top: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--background-light);
  background: var(--border-color);
}

.timeline-item.completed .timeline-marker {
  background: var(--success-color);
}

.timeline-item.current .timeline-marker {
  background: var(--primary-color);
  animation: pulse 2s infinite;
}

.timeline-item.pending .timeline-marker {
  background: var(--text-secondary);
}

.timeline-content h4 {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  margin: 0 0 var(--spacing-xs) 0;
  font-weight: 500;
}

.timeline-content p {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin: 0 0 var(--spacing-xs) 0;
  line-height: 1.5;
}

.timeline-status {
  font-size: var(--font-size-xs);
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  display: inline-block;
}

.timeline-item.completed .timeline-status {
  background: #d4edda;
  color: #155724;
}

.timeline-item.current .timeline-status {
  background: #d1ecf1;
  color: #0c5460;
}

.timeline-item.pending .timeline-status {
  background: var(--background-hover);
  color: var(--text-secondary);
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

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .future-notice {
    flex-direction: column;
    text-align: center;
  }
  
  .notice-icon {
    align-self: center;
  }
  
  .template-list {
    grid-template-columns: 1fr;
  }
  
  .timeline::before {
    left: 15px;
  }
  
  .timeline-item {
    padding-left: 50px;
  }
  
  .timeline-marker {
    left: 7px;
  }
  
  .section-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .temp-config,
  .timeline-section {
    padding: var(--spacing-md);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .timeline-marker {
    animation: none;
  }
  
  .loading-spinner {
    animation: none;
  }
}
</style>
