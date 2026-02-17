<template>
  <Card class="service-account-settings">
    <CardHeader>
      <CardTitle>Service Account Configuration</CardTitle>
      <CardDescription>
        Configure the Google service account that reads instructor calendars.
        Instructors will share their calendar with this account's email address.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingServiceAccount" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading service account configuration...</p>
      </div>

      <!-- View Mode -->
      <div v-else-if="!isEditing && serviceAccountConfig" class="config-status">
        <div v-if="serviceAccountConfig.is_configured" class="status-connected">
          <div class="status-badge success">
            <span class="icon">&#10003;</span>
            Service Account Configured
          </div>
          <div class="config-details">
            <p><strong>Service Account Email:</strong> {{ serviceAccountConfig.service_account_email }}</p>
            <p><strong>Private Key:</strong> {{ serviceAccountConfig.has_private_key ? 'Stored (encrypted)' : 'Not set' }}</p>
          </div>

          <div class="actions">
            <Button @click="startEditing" variant="outline">
              Edit Configuration
            </Button>
            <Button
              @click="handleDelete"
              variant="destructive"
              :disabled="isDeletingServiceAccount"
            >
              {{ isDeletingServiceAccount ? 'Deleting...' : 'Delete Configuration' }}
            </Button>
          </div>
        </div>

        <div v-else class="status-not-configured">
          <div class="status-badge warning">
            <span class="icon">&#9888;</span>
            Not Configured
          </div>
          <p class="warning-message">
            Service account is not configured. Add your credentials below to enable calendar integration.
          </p>
          <Button @click="startEditing" variant="default">
            Configure Service Account
          </Button>
        </div>
      </div>

      <!-- Edit Form -->
      <form v-else-if="isEditing" @submit.prevent="handleSubmit" class="sa-form">
        <!-- Service Account Email -->
        <div class="form-group">
          <Label for="sa-email">
            Service Account Email <span class="required">*</span>
          </Label>
          <Input
            id="sa-email"
            v-model="formData.service_account_email"
            type="email"
            placeholder="calendar-reader@your-project.iam.gserviceaccount.com"
            required
            :disabled="isSavingServiceAccount"
          />
          <p v-if="validationErrors.service_account_email" class="form-error">
            {{ validationErrors.service_account_email }}
          </p>
          <p class="form-help">
            The email address of the Google service account
          </p>
        </div>

        <!-- Private Key -->
        <div class="form-group">
          <Label for="sa-private-key">
            Private Key {{ serviceAccountConfig?.has_private_key ? '(leave blank to keep current)' : '' }}
            <span v-if="!serviceAccountConfig?.has_private_key" class="required">*</span>
          </Label>
          <div class="password-input-wrapper">
            <textarea
              id="sa-private-key"
              v-model="formData.service_account_private_key"
              :class="['form-textarea', showKey ? '' : 'masked-text']"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              autocomplete="new-password"
              :required="!serviceAccountConfig?.has_private_key"
              :disabled="isSavingServiceAccount"
              rows="4"
            ></textarea>
            <Button
              type="button"
              @click="showKey = !showKey"
              variant="ghost"
              size="sm"
              class="key-toggle"
            >
              {{ showKey ? 'Hide' : 'Show' }}
            </Button>
          </div>
          <p v-if="validationErrors.service_account_private_key" class="form-error">
            {{ validationErrors.service_account_private_key }}
          </p>
          <p class="form-help">
            The private key from the service account JSON key file (encrypted and stored securely)
          </p>
        </div>

        <!-- Setup Instructions -->
        <div class="setup-instructions">
          <h4>How to create a service account:</h4>
          <ol>
            <li>Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">Google Cloud Console - Service Accounts</a></li>
            <li>Create or select a project</li>
            <li>Click "Create Service Account"</li>
            <li>Give it a name (e.g., "Calendar Reader")</li>
            <li>No roles are needed (calendar access comes from sharing)</li>
            <li>Click "Keys" tab, then "Add Key" &gt; "Create new key" (JSON)</li>
            <li>Copy the <code>client_email</code> and <code>private_key</code> from the downloaded JSON file</li>
          </ol>
        </div>

        <div class="form-actions">
          <Button type="submit" :disabled="isSavingServiceAccount">
            {{ isSavingServiceAccount ? 'Saving...' : 'Save Configuration' }}
          </Button>
          <Button type="button" @click="cancelEditing" variant="outline" :disabled="isSavingServiceAccount">
            Cancel
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCalendarSettings } from '@/composables/useCalendarSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError } = useFormFeedback()

const {
  serviceAccountConfig,
  isLoadingServiceAccount,
  saveServiceAccount,
  deleteServiceAccount,
  isSavingServiceAccount,
  isDeletingServiceAccount
} = useCalendarSettings()

const isEditing = ref(false)
const showKey = ref(false)
const validationErrors = ref({})

const formData = ref({
  service_account_email: '',
  service_account_private_key: ''
})

// Populate form when data loads
watch(
  () => serviceAccountConfig.value,
  (newConfig) => {
    if (newConfig && !isEditing.value) {
      formData.value = {
        service_account_email: newConfig.service_account_email || '',
        service_account_private_key: ''
      }
    }
  },
  { immediate: true }
)

const startEditing = () => {
  isEditing.value = true
  showKey.value = false
  validationErrors.value = {}

  if (serviceAccountConfig.value) {
    formData.value = {
      service_account_email: serviceAccountConfig.value.service_account_email || '',
      service_account_private_key: ''
    }
  }
}

const cancelEditing = () => {
  isEditing.value = false
  showKey.value = false
  validationErrors.value = {}
}

const handleSubmit = async () => {
  validationErrors.value = {}

  try {
    const credentials = {
      service_account_email: formData.value.service_account_email
    }

    if (formData.value.service_account_private_key && formData.value.service_account_private_key.trim() !== '') {
      credentials.service_account_private_key = formData.value.service_account_private_key
    }

    await saveServiceAccount(credentials)

    showSuccess('Service account configuration saved successfully!')
    isEditing.value = false
    showKey.value = false

  } catch (error) {
    if (error.message && error.message.includes(':')) {
      const errors = error.message.split(',').reduce((acc, err) => {
        const [field, message] = err.split(':').map(s => s.trim())
        if (field && message) {
          acc[field] = message
        }
        return acc
      }, {})
      validationErrors.value = errors
    }

    showError(`Failed to save service account configuration: ${error.message}`)
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete the service account configuration? Instructors using service account integration will lose calendar sync.')) {
    return
  }

  try {
    await deleteServiceAccount()
    showSuccess('Service account configuration deleted successfully')
    isEditing.value = false
  } catch (error) {
    showError(`Failed to delete service account configuration: ${error.message}`)
  }
}
</script>

<style scoped>
.service-account-settings {
  margin-bottom: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--background-hover);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.config-status {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.status-connected,
.status-not-configured {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  font-weight: 500;
  font-size: var(--font-size-sm);
}

.status-badge.success {
  background-color: rgba(var(--success-color-rgb), 0.1);
  color: var(--success-color);
  border: 1px solid var(--success-color);
}

.status-badge.warning {
  background-color: rgba(var(--error-color-rgb), 0.1);
  color: var(--error-color);
  border: 1px solid var(--error-color);
}

.status-badge .icon {
  font-size: 1.2em;
}

.config-details {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--background-hover);
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

.sa-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.required {
  color: var(--error-color);
}

.form-help {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.form-error {
  font-size: var(--font-size-sm);
  color: var(--error-color);
  margin-top: var(--spacing-xs);
  margin-bottom: 0;
}

.password-input-wrapper {
  position: relative;
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: vertical;
  background: var(--background-light);
  color: var(--text-primary);
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

.masked-text {
  -webkit-text-security: disc;
}

.key-toggle {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
}

.setup-instructions {
  background: var(--background-hover);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  margin-bottom: var(--spacing-lg);
}

.setup-instructions h4 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.setup-instructions ol {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.setup-instructions li {
  margin: var(--spacing-xs) 0;
  line-height: 1.6;
}

.setup-instructions a {
  color: var(--primary-color);
  text-decoration: underline;
}

.setup-instructions code {
  background: var(--background-light);
  padding: 0.125rem 0.375rem;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
</style>
