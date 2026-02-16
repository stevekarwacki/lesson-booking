<template>
  <div class="email-settings-section">
    <!-- Email Provider Selection -->
    <EmailProviderSettings />
    
    <!-- Divider -->
    <div class="section-divider"></div>
    
    <!-- SMTP Configuration Section (only shown when provider is 'smtp') -->
    <SMTPSettingsSection v-if="selectedProvider === 'smtp'" />
    
    <!-- Gmail OAuth Section (only shown when provider is 'gmail_oauth') -->
    <GmailOAuthSettings v-if="selectedProvider === 'gmail_oauth'" />
    
    <!-- Divider (only if email is configured) -->
    <div v-if="selectedProvider === 'smtp' || selectedProvider === 'gmail_oauth'" class="section-divider"></div>
    
    <!-- Divider -->
    <div class="section-divider"></div>
    
    <!-- Email Templates Section -->
    <div class="section-header">
      <h2>Email Templates</h2>
      <p class="section-description">
        Customize email templates sent to students and instructors. All templates support Handlebars variables for dynamic content.
      </p>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading && (!templates || !templates.length)" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading email templates...</p>
    </div>
    
    <!-- Template List -->
    <div v-if="templates && templates.length > 0" class="templates-container">
      <!-- No active editor: Show template grid -->
      <div v-if="!activeTemplate" class="templates-grid">
        <div 
          v-for="template in templates" 
          :key="template.template_key"
          class="template-card"
          :class="{ modified: isModified(template) }"
        >
          <div class="template-header">
            <h3 class="template-name">{{ template.name }}</h3>
            <div class="template-badges">
              <span v-if="isModified(template)" class="badge modified">Modified</span>
              <span class="badge category">{{ template.category }}</span>
            </div>
          </div>
          
          <p class="template-description">{{ template.description }}</p>
          
          <div class="template-stats">
            <div class="stat-item">
              <span class="stat-label">Variables:</span>
              <span class="stat-value">{{ getVariableCount(template) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Last updated:</span>
              <span class="stat-value">{{ formatDate(template.updated_at) }}</span>
            </div>
          </div>
          
          <div class="template-actions">
            <Button 
              @click="editTemplate(template)" 
              variant="default"
              :disabled="loading"
            >
              Edit Template
            </Button>
            <Button 
              @click="testTemplate(template)" 
              variant="outline"
              :disabled="loading || testingTemplate === template.template_key"
            >
              <span v-if="testingTemplate === template.template_key" class="loading-spinner small"></span>
              {{ testingTemplate === template.template_key ? 'Sending...' : 'Test Send' }}
            </Button>
            <Button 
              v-if="isModified(template)"
              @click="resetTemplate(template)" 
              variant="destructive"
              :disabled="loading"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
      
      <!-- Active editor: Show template editor -->
      <div v-else class="template-editor">
        <div class="editor-header">
          <div class="editor-title">
            <Button 
              @click="closeEditor" 
              variant="ghost" 
              size="sm"
              class="back-button"
            >
              ← Back
            </Button>
            <h3>Editing: {{ activeTemplate.name }}</h3>
          </div>
          <div class="editor-actions">
            <Button 
              @click="testTemplate(activeTemplate)" 
              variant="outline"
              :disabled="loading || testingTemplate === activeTemplate.template_key"
            >
              <span v-if="testingTemplate === activeTemplate.template_key" class="loading-spinner small"></span>
              {{ testingTemplate === activeTemplate.template_key ? 'Sending...' : 'Test Send' }}
            </Button>
            <Button 
              @click="saveTemplate"
              variant="default"
              :disabled="loading || !hasUnsavedChanges"
            >
              <span v-if="saving" class="loading-spinner small"></span>
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </Button>
          </div>
        </div>
        
        <div class="editor-content">
          <div class="editor-main">
            <!-- Subject Line Editor -->
            <div class="form-group">
              <Label for="subject-editor">
                Subject Line
                <button 
                  @click="showVariables = !showVariables" 
                  class="variables-toggle"
                  type="button"
                  aria-label="Toggle variables list"
                >
                  {{ showVariables ? '▼' : '▶' }} Variables
                </button>
              </Label>
              <textarea
                id="subject-editor"
                v-model="editingSubject"
                class="form-textarea subject-editor"
                placeholder="Email subject line (supports {{variable}} syntax)"
                rows="2"
                :disabled="loading"
              ></textarea>
            </div>
            
            <!-- Body Content Editor -->
            <div class="form-group">
              <Label for="body-editor">
                Email Body Content
              </Label>
              <textarea
                id="body-editor"
                v-model="editingBody"
                class="form-textarea body-editor"
                placeholder="Email body content (supports {{variable}} syntax and HTML)"
                rows="20"
                :disabled="loading"
              ></textarea>
            </div>
          </div>
          
          <!-- Variables Sidebar -->
          <div v-if="showVariables" class="variables-sidebar">
            <h4>Available Variables</h4>
            <div class="variables-content">
              <div 
                v-for="(categoryVars, category) in getTemplateVariables(activeTemplate)" 
                :key="category"
                class="variable-category"
              >
                <h5 class="category-name">{{ category }}</h5>
                <div class="variable-list">
                  <button
                    v-for="variable in categoryVars"
                    :key="variable.name"
                    @click="insertVariable(variable.name)"
                    class="variable-item"
                    type="button"
                  >
                    <span class="variable-name">{{ variable.name }}</span>
                    <span class="variable-description">{{ variable.description }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useEmailTemplates } from '../../composables/useEmailTemplates'
import { useEmailSettings } from '../../composables/useEmailSettings'
import { useFormFeedback } from '../../composables/useFormFeedback'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import SMTPSettingsSection from './SMTPSettingsSection.vue'
import EmailProviderSettings from './EmailProviderSettings.vue'
import GmailOAuthSettings from './GmailOAuthSettings.vue'

export default {
  name: 'EmailTemplatesSection',
  components: {
    Button,
    Label,
    SMTPSettingsSection,
    EmailProviderSettings,
    GmailOAuthSettings
  },
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
    const userStore = useUserStore()
    const { showSuccess, showError } = useFormFeedback()
    const {
        templates,
        isLoadingTemplates,
        saveEmailTemplate,
        sendTestEmail,
        resetEmailTemplate,
        isSavingTemplate,
        isSendingTest,
        isResettingTemplate
    } = useEmailTemplates()
    
    const {
        emailProvider
    } = useEmailSettings()
    
    // Computed for selected provider
    const selectedProvider = computed(() => emailProvider.value?.provider || null)
    
    // State
    const activeTemplate = ref(null)
    const editingSubject = ref('')
    const editingBody = ref('')
    const originalSubject = ref('')
    const originalBody = ref('')
    const showVariables = ref(false)
    const testingTemplate = ref(null)
    
    // Computed for loading state (combines Vue Query loading with component prop)
    const loading = computed(() => isLoadingTemplates.value || props.loading)
    const saving = computed(() => isSavingTemplate.value)
    
    // Computed
    const hasUnsavedChanges = computed(() => {
      if (!activeTemplate.value) return false
      return editingSubject.value !== originalSubject.value || 
             editingBody.value !== originalBody.value
    })
    
    // Templates are now loaded via useEmailTemplates composable
    
    const editTemplate = (template) => {
      activeTemplate.value = template
      editingSubject.value = template.subject_template || ''
      editingBody.value = template.body_template || ''
      originalSubject.value = template.subject_template || ''
      originalBody.value = template.body_template || ''
      showVariables.value = false
    }
    
    const closeEditor = () => {
      if (hasUnsavedChanges.value) {
        if (!confirm('You have unsaved changes. Are you sure you want to close the editor?')) {
          return
        }
      }
      activeTemplate.value = null
      editingSubject.value = ''
      editingBody.value = ''
      originalSubject.value = ''
      originalBody.value = ''
      showVariables.value = false
    }
    
    const saveTemplate = async () => {
      if (!activeTemplate.value) return
      
      try {
        const result = await saveEmailTemplate({
          templateKey: activeTemplate.value.template_key,
          templateData: {
            subject_template: editingSubject.value,
            body_template: editingBody.value
          }
        })
        
        // Update the active template and reset original values
        activeTemplate.value = result.template
        originalSubject.value = result.template.subject_template
        originalBody.value = result.template.body_template
        
        showSuccess('Template saved successfully')
        
      } catch (err) {
        showError(err.message || 'Failed to save template')
      }
    }
    
    const testTemplate = async (template) => {
      try {
        testingTemplate.value = template.template_key
        
        await sendTestEmail({
          templateKey: template.template_key,
          recipientEmail: userStore.user.email
        })
        
        showSuccess(`Test email sent to ${userStore.user.email}`)
        
      } catch (err) {
        showError(err.message || 'Failed to send test email')
      } finally {
        testingTemplate.value = null
      }
    }
    
    const resetTemplate = async (template) => {
      if (!confirm(`Are you sure you want to reset "${template.name}" to the default template? This will lose all custom changes.`)) {
        return
      }
      
      try {
        const result = await resetEmailTemplate(template.template_key)
        
        // If this template is currently being edited, update the editor
        if (activeTemplate.value && activeTemplate.value.template_key === template.template_key) {
          editTemplate(result.template)
        }
        
        showSuccess('Template reset to default successfully')
        
      } catch (err) {
        showError(err.message || 'Failed to reset template')
      }
    }
    
    const insertVariable = (variableName) => {
      const textarea = document.getElementById('body-editor')
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value
        const before = text.substring(0, start)
        const after = text.substring(end, text.length)
        const variableText = `{{${variableName}}}`
        
        editingBody.value = before + variableText + after
        
        // Set cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + variableText.length, start + variableText.length)
        }, 0)
      }
    }
    
    // Helper functions
    const isModified = (template) => {
      return template.is_modified || false
    }
    
    const getVariableCount = (template) => {
      try {
        const variables = typeof template.available_variables === 'string' 
          ? JSON.parse(template.available_variables) 
          : template.available_variables || {}
        return Object.values(variables).reduce((count, categoryVars) => count + categoryVars.length, 0)
      } catch (e) {
        return 0
      }
    }
    
    const getTemplateVariables = (template) => {
      try {
        return typeof template.available_variables === 'string' 
          ? JSON.parse(template.available_variables) 
          : template.available_variables || {}
      } catch (e) {
        return {}
      }
    }
    
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // Templates are automatically loaded by Vue Query composable
    
    return {
      templates,
      activeTemplate,
      editingSubject,
      editingBody,
      showVariables,
      loading,
      saving,
      testingTemplate,
      hasUnsavedChanges,
      selectedProvider,
      editTemplate,
      closeEditor,
      saveTemplate,
      testTemplate,
      resetTemplate,
      insertVariable,
      isModified,
      getVariableCount,
      getTemplateVariables,
      formatDate
    }
  }
}
</script>

<style scoped>
.email-settings-section {
  max-width: 100%;
  padding: var(--spacing-lg);
}

.section-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-2xl) 0;
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

/* Loading State */
.loading-container {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--spacing-md);
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
}

/* Messages */
.error-banner, .success-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-lg);
  font-weight: 500;
}

.error-banner {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-banner {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.error-text, .success-text {
  flex: 1;
}

.error-close, .success-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  color: inherit;
  opacity: 0.7;
}

.error-close:hover, .success-close:hover {
  opacity: 1;
}

/* Templates Grid */
.templates-container {
  max-width: 100%;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.template-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--card-shadow);
  transition: all var(--transition-normal);
}

.template-card.modified {
  border-left: 4px solid var(--warning-color);
}

.template-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-sm);
}

.template-name {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.template-badges {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge.modified {
  background: #fef3c7;
  color: #92400e;
}

.badge.category {
  background: var(--background-hover);
  color: var(--text-secondary);
}

.template-description {
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.5;
}

.template-stats {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-sm);
}

.stat-item {
  display: flex;
  gap: var(--spacing-xs);
}

.stat-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  color: var(--text-primary);
}

.template-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}

.template-actions button {
  flex: 1;
  min-width: 120px;
}

/* Template Editor */
.template-editor {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--background-light);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing-md);
}

.editor-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.editor-title h3 {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.editor-content {
  display: flex;
  min-height: 600px;
}

.editor-main {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
}

.variables-toggle {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  transition: all var(--transition-normal);
}

.variables-toggle:hover {
  background: var(--background-hover);
  color: var(--text-primary);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-base);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  transition: border-color var(--transition-normal);
  resize: vertical;
  background: white;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
}

.form-textarea:disabled {
  background: var(--background-hover);
  opacity: 0.6;
}

.subject-editor {
  min-height: 60px;
  font-family: var(--font-family);
}

.body-editor {
  min-height: 400px;
  line-height: 1.4;
}

/* Variables Sidebar */
.variables-sidebar {
  width: 300px;
  background: var(--background-light);
  border-left: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex-shrink: 0;
}

.variables-sidebar h4 {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  margin: 0 0 var(--spacing-md) 0;
}

.variables-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.variable-category {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--spacing-md);
}

.variable-category:last-child {
  border-bottom: none;
}

.category-name {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin: 0 0 var(--spacing-sm) 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variable-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.variable-item {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-normal);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.variable-item:hover {
  border-color: var(--primary-color);
  background: var(--primary-light, #f8f9fa);
}

.variable-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-xs);
  color: var(--primary-color);
  font-weight: 600;
}

.variable-description {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.3;
}

/* Buttons */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-normal);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  text-decoration: none;
  font-family: var(--font-family);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: var(--primary-color);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-dark, #218838);
}

.btn.secondary {
  background: var(--background-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--border-color);
}

.btn.warning {
  background: var(--warning-color, #ffc107);
  color: var(--text-primary);
}

.btn.warning:hover:not(:disabled) {
  background: #e0a800;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 1024px) {
  .editor-content {
    flex-direction: column;
  }
  
  .variables-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
    max-height: 300px;
  }
  
  .editor-header {
    flex-direction: column;
    gap: var(--spacing-sm);
    align-items: stretch;
  }
  
  .editor-title {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .editor-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .editor-actions button {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .email-templates-section {
    padding: var(--spacing-md);
  }
  
  .templates-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  .template-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .template-stats {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  
  .template-actions {
    flex-direction: column;
  }
  
  .template-actions button {
    width: 100%;
  }
  
  .editor-title h3 {
    font-size: var(--font-size-base);
  }
  
  .variables-sidebar {
    padding: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .editor-main {
    padding: var(--spacing-md);
  }
  
  .body-editor {
    min-height: 300px;
  }
  
  .btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: none;
  }
  
  .template-card {
    transition: none;
  }
  
  .btn {
    transition: none;
  }
}
</style>