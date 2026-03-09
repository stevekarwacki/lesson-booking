<template>
  <Card class="storage-settings">
    <CardHeader>
      <CardTitle>Storage Configuration</CardTitle>
      <CardDescription>
        Configure where media files (logos, etc.) are stored. Choose between local storage or cloud storage like DigitalOcean Spaces.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingStorage" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading storage settings...</p>
      </div>

      <!-- Storage Type Selection -->
      <div v-else class="storage-selection">
        <div class="form-group form-group-horizontal">
          <Label for="storage-type" class="form-label">
            Storage Type <span class="required">*</span>
          </Label>
          <div class="form-input-wrapper">
            <Select
              v-model="selectedType"
              @update:modelValue="handleTypeChange"
              :disabled="isSavingStorage"
            >
              <SelectTrigger id="storage-type">
                <SelectValue placeholder="Select storage type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  <div class="select-item-content">
                    <strong>Local Storage</strong>
                    <span class="description">Files stored on server filesystem</span>
                  </div>
                </SelectItem>
                <SelectItem value="spaces">
                  <div class="select-item-content">
                    <strong>DigitalOcean Spaces</strong>
                    <span class="description">Cloud storage with CDN support</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="help-text">
              <template v-if="selectedType === 'local'">
                Files are stored on the server's local filesystem. Simple and no additional setup required.
              </template>
              <template v-else-if="selectedType === 'spaces'">
                Files are stored in DigitalOcean Spaces with CDN support for faster delivery. Configure your Spaces credentials below.
              </template>
              <template v-else>
                Select a storage type to configure where media files are stored.
              </template>
            </p>
          </div>
        </div>

        <!-- Spaces Configuration (conditional) -->
        <div v-if="selectedType === 'spaces'" class="spaces-configuration">
          <div class="form-group form-group-horizontal">
            <Label for="storage-endpoint" class="form-label">
              Spaces Endpoint <span class="required">*</span>
            </Label>
            <div class="form-input-wrapper">
              <Input
                id="storage-endpoint"
                v-model="formData.storage_endpoint"
                type="text"
                placeholder="sfo3.digitaloceanspaces.com"
                :disabled="isSavingStorage"
              />
              <p class="help-text">Example: nyc3.digitaloceanspaces.com, sfo3.digitaloceanspaces.com</p>
            </div>
          </div>

          <div class="form-group form-group-horizontal">
            <Label for="storage-region" class="form-label">
              Region <span class="required">*</span>
            </Label>
            <div class="form-input-wrapper">
              <Input
                id="storage-region"
                v-model="formData.storage_region"
                type="text"
                placeholder="sfo3"
                :disabled="isSavingStorage"
              />
              <p class="help-text">Must match the region of your Spaces endpoint</p>
            </div>
          </div>

          <div class="form-group form-group-horizontal">
            <Label for="storage-bucket" class="form-label">
              Bucket Name <span class="required">*</span>
            </Label>
            <div class="form-input-wrapper">
              <Input
                id="storage-bucket"
                v-model="formData.storage_bucket"
                type="text"
                placeholder="my-app-media"
                :disabled="isSavingStorage"
              />
              <p class="help-text">Bucket must already exist in your DigitalOcean Spaces</p>
            </div>
          </div>

          <div class="form-group form-group-horizontal">
            <Label for="storage-cdn-url" class="form-label">
              CDN URL (Optional)
            </Label>
            <div class="form-input-wrapper">
              <Input
                id="storage-cdn-url"
                v-model="formData.storage_cdn_url"
                type="text"
                placeholder="https://cdn.example.com"
                :disabled="isSavingStorage"
              />
              <p class="help-text">Optional: Custom CDN URL for faster delivery</p>
            </div>
          </div>

          <div class="credentials-note">
            <strong>Note:</strong> Credentials must be set as environment variables:
            <code>STORAGE_ACCESS_KEY_ID</code> and <code>STORAGE_SECRET_ACCESS_KEY</code>
          </div>

          <!-- Action Buttons -->
          <div class="button-group">
            <Button
              type="button"
              @click="testConnection"
              :disabled="isSavingStorage || isTestingConnection"
              variant="outline"
            >
              {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
            </Button>
            <Button
              type="button"
              @click="saveConfiguration"
              :disabled="isSavingStorage || isTestingConnection"
              variant="default"
            >
              {{ isSavingStorage ? 'Saving...' : 'Save Configuration' }}
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminSettings } from '@/composables/useAdminSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError } = useFormFeedback()

const {
  storageConfig,
  isLoadingStorage,
  saveStorageConfig,
  testStorageConnection,
  isSavingStorage,
  isTestingConnection
} = useAdminSettings()

const selectedType = ref(null)

const formData = ref({
  storage_endpoint: '',
  storage_region: '',
  storage_bucket: '',
  storage_cdn_url: ''
})

// Initialize when data loads
watch(
  () => storageConfig.value,
  (config) => {
    if (config) {
      selectedType.value = config.storage_type || 'local'
      formData.value = {
        storage_endpoint: config.storage_endpoint || '',
        storage_region: config.storage_region || '',
        storage_bucket: config.storage_bucket || '',
        storage_cdn_url: config.storage_cdn_url || ''
      }
    }
  },
  { immediate: true }
)

const handleTypeChange = async (newType) => {
  if (newType === 'local') {
    // For local storage, save immediately since no config needed
    try {
      await saveStorageConfig({ storage_type: 'local' })
      showSuccess('Storage changed to local filesystem')
    } catch (error) {
      showError(`Failed to change storage: ${error.message}`)
      selectedType.value = storageConfig.value?.storage_type || 'local'
    }
  }
  // For spaces, wait for user to configure and click save
}

const testConnection = async () => {
  try {
    const data = await testStorageConnection({
      storage_type: 'spaces',
      storage_endpoint: formData.value.storage_endpoint,
      storage_region: formData.value.storage_region,
      storage_bucket: formData.value.storage_bucket
    })
    showSuccess(data.message || 'Connection test successful!')
  } catch (error) {
    showError(`Connection test failed: ${error.message}`)
  }
}

const saveConfiguration = async () => {
  try {
    const data = await saveStorageConfig({
      storage_type: 'spaces',
      ...formData.value
    })
    showSuccess(data.message || 'Storage configuration saved successfully')
  } catch (error) {
    showError(`Failed to save configuration: ${error.message}`)
  }
}
</script>

<style scoped>
.storage-settings {
  margin-bottom: 2rem;
}

.storage-selection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.spaces-configuration {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 0.5rem;
}

.credentials-note {
  padding: 1rem;
  background: var(--background-secondary);
  border-left: 3px solid var(--primary-color);
  border-radius: 4px;
  font-size: var(--font-size-sm);
}

.credentials-note code {
  background: var(--background-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

</style>
