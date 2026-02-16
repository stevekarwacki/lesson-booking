<template>
  <Card class="gmail-oauth-settings">
    <CardHeader>
      <CardTitle>Gmail OAuth Configuration</CardTitle>
      <CardDescription>
        Connect Gmail accounts to send system emails through Google's API. Configure your OAuth application credentials below.
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingOAuthCredentials" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading OAuth configuration...</p>
      </div>
      
      <!-- Configuration Status -->
      <div v-else-if="!isEditing && oauthCredentials" class="config-status">
        <div v-if="oauthCredentials.is_configured" class="status-connected">
          <div class="status-badge success">
            <span class="icon">✓</span>
            OAuth Configured
          </div>
          <div class="config-details">
            <p><strong>Client ID:</strong> {{ oauthCredentials.google_client_id }}</p>
            <p><strong>Redirect URI:</strong> {{ oauthCredentials.google_redirect_uri }}</p>
          </div>
          
          <!-- Connected Users Section -->
          <div v-if="oauthInstructors && oauthInstructors.count > 0" class="connected-users-section">
            <h4>Connected Accounts ({{ oauthInstructors.count }})</h4>
            <ul class="user-list">
              <li v-for="instructor in oauthInstructors.instructors" :key="instructor.instructor_id" class="user-item">
                <div class="user-info">
                  <span class="user-name">{{ instructor.name }}</span>
                  <span class="user-email">{{ instructor.email }}</span>
                </div>
                <div class="user-status">
                  <span v-if="instructor.has_refresh_token" class="status-badge success small">
                    <span class="icon">✓</span>
                    Active
                  </span>
                  <span v-else class="status-badge warning small">
                    <span class="icon">⚠</span>
                    Token Missing
                  </span>
                </div>
              </li>
            </ul>
          </div>
          
          <div class="actions">
            <Button @click="startEditing" variant="outline">
              Edit Configuration
            </Button>
            <Button 
              @click="handleDelete" 
              variant="destructive"
              :disabled="isDeletingOAuthCredentials"
            >
              {{ isDeletingOAuthCredentials ? 'Deleting...' : 'Delete Configuration' }}
            </Button>
          </div>
        </div>
        
        <div v-else class="status-not-configured">
          <div class="status-badge warning">
            <span class="icon">⚠</span>
            Not Configured
          </div>
          <p class="warning-message">
            OAuth is not configured. Configure OAuth credentials below to enable Gmail integration.
          </p>
          <Button @click="startEditing" variant="default">
            Configure OAuth
          </Button>
        </div>
      </div>
      
      <!-- Configuration Form -->
      <form v-else-if="isEditing" @submit.prevent="handleSubmit" class="oauth-form">
        <!-- Client ID -->
        <div class="form-group">
          <Label for="oauth-client-id">
            Google Client ID <span class="required">*</span>
          </Label>
          <Input
            id="oauth-client-id"
            v-model="formData.google_client_id"
            type="text"
            placeholder="your-client-id.apps.googleusercontent.com"
            required
            :disabled="isSavingOAuthCredentials"
          />
          <p v-if="validationErrors.google_client_id" class="form-error">
            {{ validationErrors.google_client_id }}
          </p>
          <p class="form-help">
            OAuth 2.0 Client ID from Google Cloud Console
          </p>
        </div>
        
        <!-- Client Secret -->
        <div class="form-group">
          <Label for="oauth-client-secret">
            Google Client Secret {{ oauthCredentials?.has_client_secret ? '(Optional - leave blank to keep current)' : '' }} <span v-if="!oauthCredentials?.has_client_secret" class="required">*</span>
          </Label>
          <div class="password-input-wrapper">
            <Input
              id="oauth-client-secret"
              v-model="formData.google_client_secret"
              :type="showSecret ? 'text' : 'password'"
              placeholder="••••••••••••"
              autocomplete="new-password"
              :required="!oauthCredentials?.has_client_secret"
              :disabled="isSavingOAuthCredentials"
            />
            <Button
              type="button"
              @click="showSecret = !showSecret"
              variant="ghost"
              size="sm"
              class="password-toggle"
            >
              {{ showSecret ? 'Hide' : 'Show' }}
            </Button>
          </div>
          <p v-if="validationErrors.google_client_secret" class="form-error">
            {{ validationErrors.google_client_secret }}
          </p>
          <p class="form-help">
            OAuth 2.0 Client Secret (encrypted and stored securely)
          </p>
        </div>
        
        <!-- Redirect URI -->
        <div class="form-group">
          <Label for="oauth-redirect-uri">
            Redirect URI <span class="required">*</span>
          </Label>
          <Input
            id="oauth-redirect-uri"
            v-model="formData.google_redirect_uri"
            type="url"
            placeholder="http://localhost:3000/auth/google/callback"
            required
            :disabled="isSavingOAuthCredentials"
          />
          <p v-if="validationErrors.google_redirect_uri" class="form-error">
            {{ validationErrors.google_redirect_uri }}
          </p>
          <p class="form-help">
            Must match authorized redirect URI in Google Cloud Console
          </p>
        </div>
        
        <!-- Setup Instructions -->
        <div class="setup-instructions">
          <h4>How to get OAuth credentials:</h4>
          <ol>
            <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a></li>
            <li>Create or select a project</li>
            <li>Enable the Gmail API</li>
            <li>Create OAuth 2.0 Client ID credentials</li>
            <li>Add authorized redirect URI (must match the value above)</li>
            <li>Copy Client ID and Client Secret and paste above</li>
          </ol>
        </div>
        
        <div class="form-actions">
          <Button type="submit" :disabled="isSavingOAuthCredentials">
            {{ isSavingOAuthCredentials ? 'Saving...' : 'Save Configuration' }}
          </Button>
          <Button type="button" @click="cancelEditing" variant="outline" :disabled="isSavingOAuthCredentials">
            Cancel
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEmailSettings } from '@/composables/useEmailSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError } = useFormFeedback()

const {
  oauthCredentials,
  isLoadingOAuthCredentials,
  oauthInstructors,
  saveOAuthCredentials,
  deleteOAuthCredentials,
  isSavingOAuthCredentials,
  isDeletingOAuthCredentials
} = useEmailSettings()

// Local state
const isEditing = ref(false)
const showSecret = ref(false)
const validationErrors = ref({})

// Form data
const formData = ref({
  google_client_id: '',
  google_client_secret: '',
  google_redirect_uri: ''
})

// Watch for OAuth credentials changes to populate form
watch(
  () => oauthCredentials.value,
  (newCreds) => {
    if (newCreds && !isEditing.value) {
      formData.value = {
        google_client_id: newCreds.google_client_id || '',
        google_client_secret: '', // Never populate password field
        google_redirect_uri: newCreds.google_redirect_uri || ''
      }
    }
  },
  { immediate: true }
)

const startEditing = () => {
  isEditing.value = true
  showSecret.value = false
  validationErrors.value = {}
  
  // Populate form with current config
  if (oauthCredentials.value) {
    formData.value = {
      google_client_id: oauthCredentials.value.google_client_id || '',
      google_client_secret: '',
      google_redirect_uri: oauthCredentials.value.google_redirect_uri || ''
    }
  }
}

const cancelEditing = () => {
  isEditing.value = false
  showSecret.value = false
  validationErrors.value = {}
}

const handleSubmit = async () => {
  validationErrors.value = {}
  
  try {
    const credentialsData = {
      google_client_id: formData.value.google_client_id,
      google_redirect_uri: formData.value.google_redirect_uri
    }
    
    // Only include secret if user entered one (preserves existing secret)
    if (formData.value.google_client_secret && formData.value.google_client_secret.trim() !== '') {
      credentialsData.google_client_secret = formData.value.google_client_secret
    }
    
    await saveOAuthCredentials(credentialsData)
    
    showSuccess('OAuth configuration saved successfully!')
    isEditing.value = false
    showSecret.value = false
    
  } catch (error) {
    // Check if error message contains field-specific errors
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
    
    showError(`Failed to save OAuth configuration: ${error.message}`)
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete the OAuth configuration? This will prevent new OAuth connections until reconfigured.')) {
    return
  }
  
  try {
    await deleteOAuthCredentials()
    showSuccess('OAuth configuration deleted successfully')
    isEditing.value = false
  } catch (error) {
    showError(`Failed to delete OAuth configuration: ${error.message}`)
  }
}
</script>

<style scoped>
.gmail-oauth-settings {
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
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.status-badge.warning {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.status-badge.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
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

.connected-users-section {
  margin-top: var(--spacing-md);
}

.connected-users-section h4 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.user-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--background-light);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.user-name {
  font-weight: 500;
  color: var(--text-primary);
}

.user-email {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.oauth-form {
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
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: var(--spacing-xs);
  padding: var(--spacing-xs);
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

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}
</style>
