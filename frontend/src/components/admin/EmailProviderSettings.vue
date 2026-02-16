<template>
  <Card class="email-provider-settings">
    <CardHeader>
      <CardTitle>Email Connection Details</CardTitle>
      <CardDescription>
        Select how system emails should be sent. Configure SMTP for traditional email servers, Gmail OAuth for Google account integration, or disable email functionality.
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingProvider" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading email settings...</p>
      </div>
      
      <!-- Provider Selection -->
      <div v-else class="provider-selection">
        <div class="form-group">
          <Label for="email-provider">
            Email Method <span class="required">*</span>
          </Label>
          <Select 
            v-model="selectedProvider" 
            @update:modelValue="handleProviderChange"
            :disabled="isSettingProvider"
          >
            <SelectTrigger id="email-provider">
              <SelectValue placeholder="Select email method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smtp">
                <div class="select-item-content">
                  <strong>SMTP</strong>
                  <span class="description">Traditional email server (Gmail, Outlook, etc.)</span>
                </div>
              </SelectItem>
              <SelectItem value="gmail_oauth">
                <div class="select-item-content">
                  <strong>Gmail OAuth</strong>
                  <span class="description">Send emails through a connected Gmail account</span>
                </div>
              </SelectItem>
              <SelectItem value="disabled">
                <div class="select-item-content">
                  <strong>Disabled</strong>
                  <span class="description">Turn off all email functionality</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="help-text">
            <template v-if="selectedProvider === 'smtp'">
              SMTP provides reliable email delivery through any email service provider. Configure your credentials below.
            </template>
            <template v-else-if="selectedProvider === 'gmail_oauth'">
              Connect your Gmail account to send emails directly through Google. Requires Gmail API credentials configured in environment variables.
            </template>
            <template v-else-if="selectedProvider === 'disabled'">
              No emails will be sent. Useful for testing or when email is not needed.
            </template>
            <template v-else>
              Legacy mode: automatically detects available email methods.
            </template>
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useEmailSettings } from '@/composables/useEmailSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError } = useFormFeedback()

const {
  emailProvider,
  isLoadingProvider,
  setEmailProvider,
  isSettingProvider
} = useEmailSettings()

// Local state for provider selection
const selectedProvider = ref(null)

// Initialize selectedProvider when data loads
watch(
  () => emailProvider.value,
  (newProvider) => {
    if (newProvider) {
      selectedProvider.value = newProvider.provider || null
    }
  },
  { immediate: true }
)

// Handle provider change
const handleProviderChange = async (newProvider) => {
  try {
    await setEmailProvider(newProvider)
    showSuccess(`Email provider changed to ${newProvider === null ? 'auto-detect' : newProvider}`)
  } catch (error) {
    showError(`Failed to change provider: ${error.message}`)
    // Revert selection on error
    selectedProvider.value = emailProvider.value?.provider || null
  }
}
</script>

<style scoped>
.email-provider-settings {
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

.provider-selection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.required {
  color: var(--error-color);
}

.select-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.select-item-content .description {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.help-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
}
</style>
