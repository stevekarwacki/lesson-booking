<template>
  <div class="storage-section">
    <div class="section-header">
      <h2>Storage Configuration</h2>
      <p class="section-description">
        Configure where media files (logos, etc.) are stored. Choose between local storage or cloud storage like DigitalOcean Spaces.
      </p>
    </div>

    <!-- Current Configuration Display -->
    <div class="config-display" v-if="currentConfig">
      <div class="config-info">
        <h3>Current Storage Configuration</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Storage Type:</span>
            <span class="value">{{ currentConfig.storage_type || 'local' }}</span>
          </div>
          <div class="info-item" v-if="currentConfig.storage_type === 'spaces'">
            <span class="label">Bucket:</span>
            <span class="value">{{ currentConfig.storage_bucket || 'Not configured' }}</span>
          </div>
          <div class="info-item" v-if="currentConfig.storage_type === 'spaces'">
            <span class="label">Region:</span>
            <span class="value">{{ currentConfig.storage_region || 'Not configured' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Credentials:</span>
            <span class="value" :class="{ 'text-success': currentConfig.credentialsConfigured, 'text-danger': !currentConfig.credentialsConfigured }">
              {{ currentConfig.credentialsConfigured ? 'Configured ✓' : 'Not configured' }}
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
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../stores/userStore'

const userStore = useUserStore()

const loading = ref(false)
const error = ref('')
const success = ref('')
const testSuccess = ref(false)
const currentConfig = ref(null)

const formData = ref({
  storage_type: 'local',
  storage_endpoint: '',
  storage_region: '',
  storage_bucket: '',
  storage_cdn_url: ''
})

onMounted(() => {
  loadConfiguration()
})

const loadConfiguration = async () => {
  try {
    loading.value = true
    error.value = ''
    const response = await fetch('/api/admin/settings/storage', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to load storage configuration')
    }
    
    const data = await response.json()
    currentConfig.value = data
    
    // Load current config into form
    formData.value = {
      storage_type: data.storage_type || 'local',
      storage_endpoint: data.storage_endpoint || '',
      storage_region: data.storage_region || '',
      storage_bucket: data.storage_bucket || '',
      storage_cdn_url: data.storage_cdn_url || ''
    }
  } catch (err) {
    error.value = 'Error loading configuration: ' + err.message
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const onStorageTypeChange = () => {
  testSuccess.value = false
  error.value = ''
}

const testConnection = async () => {
  try {
    loading.value = true
    error.value = ''
    testSuccess.value = false

    const response = await fetch('/api/admin/settings/storage/test-connection', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storage_type: formData.value.storage_type,
        storage_endpoint: formData.value.storage_endpoint,
        storage_region: formData.value.storage_region,
        storage_bucket: formData.value.storage_bucket
      })
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Connection test failed'
      if (data.details) {
        error.value += ': ' + data.details
      }
      return
    }

    testSuccess.value = true
    success.value = data.message
  } catch (err) {
    error.value = 'Error testing connection: ' + err.message
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const testAndSaveConfiguration = async () => {
  try {
    loading.value = true
    error.value = ''
    success.value = ''

    const response = await fetch('/api/admin/settings/storage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData.value)
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Failed to save configuration'
      if (data.details) {
        error.value += ': ' + data.details
      }
      return
    }

    success.value = data.message
    testSuccess.value = false
    
    // Reload configuration to show updates
    setTimeout(() => {
      loadConfiguration()
    }, 1000)
  } catch (err) {
    error.value = 'Error saving configuration: ' + err.message
    console.error('Error:', err)
  } finally {
    loading.value = false
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
