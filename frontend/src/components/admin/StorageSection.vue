<template>
  <div class="storage-section">
    <div class="section-header">
      <h2>Storage Configuration</h2>
      <p class="section-description">
        Configure where media files (logos, etc.) are stored. Choose between local storage or cloud storage like DigitalOcean Spaces.
      </p>
    </div>

    <!-- Current Configuration Display -->
    <div class="config-display" v-if="storageConfig">
      <div class="config-info">
        <h3>Current Storage Configuration</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Storage Type:</span>
            <span class="value">{{ storageConfig.storage_type || 'local' }}</span>
          </div>
          <div class="info-item" v-if="storageConfig.storage_type === 'spaces'">
            <span class="label">Bucket:</span>
            <span class="value">{{ storageConfig.storage_bucket || 'Not configured' }}</span>
          </div>
          <div class="info-item" v-if="storageConfig.storage_type === 'spaces'">
            <span class="label">Region:</span>
            <span class="value">{{ storageConfig.storage_region || 'Not configured' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Credentials:</span>
            <span class="value" :class="{ 'text-success': storageConfig.credentialsConfigured, 'text-danger': !storageConfig.credentialsConfigured }">
              {{ storageConfig.credentialsConfigured ? 'Configured ✓' : 'Not configured' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Form -->
    <div class="config-card">
      <h3>Change Storage Provider</h3>
      
      <form @submit.prevent="testAndSaveConfiguration" class="storage-form">
        <!-- Storage Type Selection -->
        <div class="form-group">
          <label for="storage-type">Storage Type</label>
          <select 
            id="storage-type"
            v-model="formData.storage_type"
            @change="onStorageTypeChange"
            :disabled="loading"
            class="form-control"
          >
            <option value="local">Local Storage (Filesystem)</option>
            <option value="spaces">DigitalOcean Spaces</option>
          </select>
          <small class="form-text">
            Local: Files stored on server. Spaces: Cloud storage with CDN.
          </small>
        </div>

        <!-- Spaces Configuration (conditional) -->
        <div v-if="formData.storage_type === 'spaces'" class="spaces-config">
          <div class="form-group">
            <label for="storage-endpoint">Spaces Endpoint</label>
            <input 
              id="storage-endpoint"
              v-model="formData.storage_endpoint"
              type="text"
              placeholder="nyc3.digitaloceanspaces.com"
              :disabled="loading"
              class="form-control"
            />
            <small class="form-text">Example: nyc3.digitaloceanspaces.com</small>
          </div>

          <div class="form-group">
            <label for="storage-region">Region</label>
            <input 
              id="storage-region"
              v-model="formData.storage_region"
              type="text"
              placeholder="nyc3"
              :disabled="loading"
              class="form-control"
            />
            <small class="form-text">Example: nyc3, sfo3, etc.</small>
          </div>

          <div class="form-group">
            <label for="storage-bucket">Bucket Name</label>
            <input 
              id="storage-bucket"
              v-model="formData.storage_bucket"
              type="text"
              placeholder="my-app-media"
              :disabled="loading"
              class="form-control"
            />
            <small class="form-text">Bucket must exist in Spaces</small>
          </div>

          <div class="form-group">
            <label for="storage-cdn-url">CDN URL (Optional)</label>
            <input 
              id="storage-cdn-url"
              v-model="formData.storage_cdn_url"
              type="text"
              placeholder="https://cdn.example.com"
              :disabled="loading"
              class="form-control"
            />
            <small class="form-text">Optional: Use CDN URL for faster delivery</small>
          </div>

          <div class="alert alert-info">
            <strong>Note:</strong> Credentials must be set as environment variables:
            <code>STORAGE_ACCESS_KEY_ID</code> and <code>STORAGE_SECRET_ACCESS_KEY</code>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>
        <div v-if="testSuccess" class="alert alert-success">
          ✓ Connection test successful! Configuration is valid.
        </div>

        <!-- Action Buttons -->
        <div class="button-group">
          <button 
            v-if="formData.storage_type === 'spaces'"
            type="button"
            @click="testConnection"
            :disabled="loading"
            class="btn btn-secondary"
          >
            {{ loading ? 'Testing...' : 'Test Connection' }}
          </button>
          <button 
            type="submit"
            :disabled="loading"
            class="btn btn-primary"
          >
            {{ loading ? 'Saving...' : 'Save Configuration' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useAdminSettings } from '../../composables/useAdminSettings'

const userStore = useUserStore()
const {
    storageConfig,
    isLoadingStorage,
    saveStorageConfig,
    testStorageConnection,
    isSavingStorage,
    isTestingConnection
} = useAdminSettings()

const loading = computed(() => isLoadingStorage.value || isSavingStorage.value || isTestingConnection.value)
const error = ref('')
const success = ref('')
const testSuccess = ref(false)

const formData = ref({
  storage_type: 'local',
  storage_endpoint: '',
  storage_region: '',
  storage_bucket: '',
  storage_cdn_url: ''
})

// Watch for storageConfig changes and update form
watch(storageConfig, (config) => {
    if (config) {
        formData.value = {
            storage_type: config.storage_type || 'local',
            storage_endpoint: config.storage_endpoint || '',
            storage_region: config.storage_region || '',
            storage_bucket: config.storage_bucket || '',
            storage_cdn_url: config.storage_cdn_url || ''
        }
    }
}, { immediate: true })

// Storage configuration is now loaded via useAdminSettings composable

const onStorageTypeChange = () => {
  testSuccess.value = false
  error.value = ''
}

const testConnection = async () => {
  try {
    error.value = ''
    testSuccess.value = false

    const data = await testStorageConnection({
        storage_type: formData.value.storage_type,
        storage_endpoint: formData.value.storage_endpoint,
        storage_region: formData.value.storage_region,
        storage_bucket: formData.value.storage_bucket
    })

    testSuccess.value = true
    success.value = data.message
  } catch (err) {
    error.value = 'Error testing connection: ' + err.message
    console.error('Error:', err)
  }
}

const testAndSaveConfiguration = async () => {
  try {
    error.value = ''
    success.value = ''

    const data = await saveStorageConfig(formData.value)

    success.value = data.message || 'Configuration saved successfully'
    testSuccess.value = false
  } catch (err) {
    error.value = 'Error saving configuration: ' + err.message
    console.error('Error:', err)
  }
}
</script>

<style scoped>
.storage-section {
  padding: 20px;
}

.section-header {
  margin-bottom: var(--spacing-xl, 30px);
  text-align: center;
}

.section-header h2 {
  color: var(--text-primary, #333);
  font-size: var(--font-size-2xl, 24px);
  margin: 0 0 var(--spacing-sm, 8px) 0;
  font-weight: 600;
}

.section-description {
  color: var(--text-secondary, #666);
  font-size: var(--font-size-base, 14px);
  margin-top: 4px;
  line-height: 1.5;
}

.config-display {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.config-info h3 {
  margin-top: 0;
  font-size: 16px;
  margin-bottom: 15px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.info-item .label {
  font-weight: 600;
  color: #555;
}

.info-item .value {
  color: #333;
  font-family: monospace;
}

.text-success {
  color: #28a745;
}

.text-danger {
  color: #dc3545;
}

.config-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-card h3 {
  margin-top: 0;
  font-size: 18px;
  margin-bottom: 20px;
}

.storage-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-control {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.form-control:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.form-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.spaces-config {
  background: #f0f7ff;
  border-left: 4px solid #007bff;
  padding: 15px;
  border-radius: 4px;
}

code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 0;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert-info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}
</style>
