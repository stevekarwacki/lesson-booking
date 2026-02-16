<template>
  <Card class="smtp-settings-section">
    <CardHeader>
      <CardTitle>SMTP Configuration</CardTitle>
      <CardDescription>
        Configure email server settings for sending system emails. All passwords are encrypted and stored securely.
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingSMTPConfig" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading SMTP configuration...</p>
      </div>
      
      <!-- Configuration Status -->
      <div v-else-if="!isEditing && smtpConfig" class="config-status">
        <div v-if="isSMTPConfigured" class="status-connected">
          <div class="status-badge success">
            <span class="icon">✓</span>
            SMTP Configured
          </div>
          <div class="config-details">
            <p><strong>Host:</strong> {{ smtpConfig.email_host }}:{{ smtpConfig.email_port }}</p>
            <p><strong>Username:</strong> {{ smtpConfig.email_user }}</p>
            <p>
              <strong>Security:</strong> 
              {{ smtpConfig.email_port == 465 ? 'SSL/TLS' : (smtpConfig.email_port == 587 ? 'STARTTLS' : 'Unencrypted') }}
            </p>
            <p v-if="smtpConfig.email_from_name">
              <strong>From Name:</strong> {{ smtpConfig.email_from_name }}
            </p>
          </div>
          <div class="actions">
            <Button @click="startEditing" variant="outline">
              Edit Configuration
            </Button>
            <Button 
              @click="handleTestConnection" 
              variant="secondary"
              :disabled="isTestingSMTPConnection"
            >
              <span v-if="isTestingSMTPConnection" class="loading-spinner small"></span>
              {{ isTestingSMTPConnection ? 'Testing...' : 'Test Connection' }}
            </Button>
            <Button 
              @click="handleDelete" 
              variant="destructive"
              :disabled="isDeletingSMTPConfig"
            >
              {{ isDeletingSMTPConfig ? 'Deleting...' : 'Delete Configuration' }}
            </Button>
          </div>
        </div>
        
        <div v-else class="status-not-configured">
          <div class="status-badge warning">
            <span class="icon">⚠</span>
            Not Configured
          </div>
          <p class="warning-message">
            SMTP is not configured. System emails will not be sent until SMTP is configured.
          </p>
          <Button @click="startEditing" variant="default">
            Configure SMTP
          </Button>
        </div>
      </div>
      
      <!-- Configuration Form -->
      <form v-else-if="isEditing" @submit.prevent="handleSubmit" class="smtp-form">
        <!-- Host -->
        <div class="form-group">
          <Label for="smtp-host">
            SMTP Host <span class="required">*</span>
          </Label>
          <Input
            id="smtp-host"
            v-model="formData.email_host"
            type="text"
            placeholder="smtp.gmail.com"
            required
            :disabled="isSavingSMTPConfig"
          />
          <p class="form-help">Your email server hostname</p>
          <p v-if="validationErrors.email_host" class="form-error">
            {{ validationErrors.email_host }}
          </p>
        </div>
        
        <!-- Port and Secure -->
        <div class="form-row">
          <div class="form-group">
            <Label for="smtp-port">
              Port <span class="required">*</span>
            </Label>
            <Select v-model="formData.email_port">
              <SelectTrigger id="smtp-port">
                <SelectValue placeholder="Select port" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="465">465 - SSL/TLS (Direct encryption)</SelectItem>
                <SelectItem value="587">587 - STARTTLS (Recommended)</SelectItem>
                <SelectItem value="25">25 - Unencrypted (Not recommended)</SelectItem>
              </SelectContent>
            </Select>
            <p class="form-help">SMTP port number</p>
            <p v-if="validationErrors.email_port" class="form-error">
              {{ validationErrors.email_port }}
            </p>
          </div>
          
        </div>
        
        <!-- Username -->
        <div class="form-group">
          <Label for="smtp-user">
            Username/Email <span class="required">*</span>
          </Label>
          <Input
            id="smtp-user"
            v-model="formData.email_user"
            type="email"
            placeholder="your-email@example.com"
            required
            :disabled="isSavingSMTPConfig"
          />
          <p class="form-help">SMTP authentication username (usually your email)</p>
          <p v-if="validationErrors.email_user" class="form-error">
            {{ validationErrors.email_user }}
          </p>
        </div>
        
        <!-- Password -->
        <div class="form-group">
          <Label for="smtp-password">
            Password <span class="optional">(leave empty to keep existing)</span>
          </Label>
          <div class="password-input-wrapper">
            <Input
              id="smtp-password"
              v-model="formData.email_password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              autocomplete="new-password"
              :disabled="isSavingSMTPConfig"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="password-toggle"
              @click="showPassword = !showPassword"
              :disabled="isSavingSMTPConfig"
            >
              {{ showPassword ? '👁️' : '👁️‍🗨️' }}
            </Button>
          </div>
          <p class="form-help">
            SMTP password or app-specific password. Leave empty to keep existing password.
            For Gmail, use an 
            <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener">
              App Password
            </a>
          </p>
          <p v-if="validationErrors.email_password" class="form-error">
            {{ validationErrors.email_password }}
          </p>
        </div>
        
        <!-- From Name (Optional) -->
        <div class="form-group">
          <Label for="smtp-from-name">
            From Name <span class="optional">(optional)</span>
          </Label>
          <Input
            id="smtp-from-name"
            v-model="formData.email_from_name"
            type="text"
            placeholder="My Business Name"
            :disabled="isSavingSMTPConfig"
          />
          <p class="form-help">Display name for outgoing emails</p>
          <p v-if="validationErrors.email_from_name" class="form-error">
            {{ validationErrors.email_from_name }}
          </p>
        </div>
        
        <!-- From Address (Optional) -->
        <div class="form-group">
          <Label for="smtp-from-address">
            From Address <span class="optional">(optional)</span>
          </Label>
          <Input
            id="smtp-from-address"
            v-model="formData.email_from_address"
            type="email"
            placeholder="noreply@example.com"
            :disabled="isSavingSMTPConfig"
          />
          <p class="form-help">
            Email address to use as sender (defaults to username if not provided)
          </p>
          <p v-if="validationErrors.email_from_address" class="form-error">
            {{ validationErrors.email_from_address }}
          </p>
        </div>
        
        <!-- Form Actions -->
        <div class="form-actions">
          <Button 
            type="button" 
            variant="outline" 
            @click="cancelEditing"
            :disabled="isSavingSMTPConfig"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            :disabled="isSavingSMTPConfig"
          >
            <span v-if="isSavingSMTPConfig" class="loading-spinner small"></span>
            {{ isSavingSMTPConfig ? 'Saving...' : 'Save Configuration' }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useEmailSettings } from '@/composables/useEmailSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const userStore = useUserStore()
const { showSuccess, showError } = useFormFeedback()

const {
  smtpConfig,
  isLoadingSMTPConfig,
  isSMTPConfigured,
  saveSMTPConfig,
  deleteSMTPConfig,
  testSMTPConnection,
  isSavingSMTPConfig,
  isDeletingSMTPConfig,
  isTestingSMTPConnection,
} = useEmailSettings()

// Form state
const isEditing = ref(false)
const showPassword = ref(false)
const validationErrors = ref({})

const formData = ref({
  email_host: '',
  email_port: '587', // Default to 587 (STARTTLS - most common)
  email_user: '',
  email_password: '',
  email_from_name: '',
  email_from_address: '',
})

// Watch for config changes to populate form
watch(smtpConfig, (config) => {
  if (config && !isEditing.value) {
    formData.value = {
      email_host: config.email_host || '',
      email_port: String(config.email_port || '587'),
      email_user: config.email_user || '',
      email_password: '', // NEVER pre-fill password for security
      email_from_name: config.email_from_name || '',
      email_from_address: config.email_from_address || '',
    }
  }
}, { immediate: true })

// Additional safeguard: Always clear password when switching to/from editing mode
watch(isEditing, (editing) => {
  if (editing) {
    formData.value.email_password = ''
  }
})

// Methods
const startEditing = () => {
  isEditing.value = true
  validationErrors.value = {}
  showPassword.value = false
  
  // Populate form with existing config if available
  if (smtpConfig.value) {
    formData.value = {
      email_host: smtpConfig.value.email_host || '',
      email_port: String(smtpConfig.value.email_port || '587'),
      email_user: smtpConfig.value.email_user || '',
      email_password: '', // NEVER pre-fill password for security
      email_from_name: smtpConfig.value.email_from_name || '',
      email_from_address: smtpConfig.value.email_from_address || '',
    }
  }
}

const cancelEditing = () => {
  if (!confirm('Are you sure? Any unsaved changes will be lost.')) {
    return
  }
  
  isEditing.value = false
  validationErrors.value = {}
  showPassword.value = false
}

const handleSubmit = async () => {
  validationErrors.value = {}
  
  try {
    // Convert port to number and auto-determine secure setting based on port
    const port = parseInt(formData.value.email_port, 10)
    const configData = {
      ...formData.value,
      email_port: port,
      // Auto-determine secure based on port
      email_secure: port === 465, // 465 = SSL/TLS, 587 = STARTTLS (false), 25 = unencrypted (false)
    }
    
    // Fix: Only include password if user entered one (preserves existing password)
    if (!configData.email_password || configData.email_password.trim() === '') {
      delete configData.email_password
    }
    
    await saveSMTPConfig(configData)
    
    showSuccess('SMTP configuration saved successfully!')
    isEditing.value = false
    showPassword.value = false
    
  } catch (error) {
    // Handle validation errors
    if (error.message.includes(':')) {
      const errors = {}
      error.message.split(', ').forEach(err => {
        const [field, ...messageParts] = err.split(':')
        const message = messageParts.join(':').trim()
        errors[field.trim()] = message
      })
      validationErrors.value = errors
      showError('Please fix the validation errors')
    } else {
      showError(error.message || 'Failed to save SMTP configuration')
    }
  }
}

const handleTestConnection = async () => {
  try {
    await testSMTPConnection(userStore.user.email)
    showSuccess(`Test email sent successfully to ${userStore.user.email}`)
  } catch (error) {
    showError(error.message || 'SMTP connection test failed')
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete the SMTP configuration? System emails will not be sent until reconfigured.')) {
    return
  }
  
  try {
    await deleteSMTPConfig()
    showSuccess('SMTP configuration deleted successfully')
  } catch (error) {
    showError(error.message || 'Failed to delete SMTP configuration')
  }
}
</script>

<style scoped>
.smtp-settings-section {
  margin-bottom: var(--spacing-xl);
}

/* Loading */
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
  display: inline-block;
  vertical-align: middle;
  margin-right: var(--spacing-xs);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Status Display */
.config-status {
  padding: var(--spacing-md) 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.status-badge.warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.status-badge .icon {
  font-size: 1.2em;
}

.config-details {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background-light);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.config-details p {
  margin: var(--spacing-xs) 0;
  color: var(--text-primary);
}

.warning-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

/* Form */
.smtp-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.required {
  color: #dc2626;
}

.optional {
  color: var(--text-secondary);
  font-weight: normal;
}

.form-help {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.form-help a {
  color: var(--primary-color);
  text-decoration: underline;
}

.form-error {
  font-size: var(--font-size-sm);
  color: #dc2626;
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-xs);
  padding: var(--spacing-xs);
}

.switch-label {
  margin-bottom: var(--spacing-xs);
}

.switch-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
}

.switch-description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .actions button {
    width: 100%;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .form-actions button {
    width: 100%;
  }
}
</style>
