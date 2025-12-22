<template>
  <div class="calendar-settings">
    <h3>Google Calendar Integration</h3>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <p>Loading calendar settings...</p>
    </div>
    
    <!-- Error State -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadSettings" class="btn btn-secondary">Retry</button>
    </div>
    
    <!-- Settings Form -->
    <div v-if="!loading && !error" class="settings-form">
      
      <!-- OAuth Section (if available) -->
      <div v-if="setupInfo?.oauth?.available" class="oauth-section">
        <h4> Easy Setup with OAuth</h4>
        <p class="oauth-description">
          Connect your Google Calendar with just a few clicks - no manual sharing required!
        </p>
        
        <div v-if="setupInfo.oauth.connected" class="oauth-connected">
          <div class="status-badge success">
            <i class="icon-check"></i>
            Connected via OAuth
          </div>
          <p>
            <strong>Connected:</strong> {{ formatDate(setupInfo.oauth.connectedAt) }}
          </p>
          <p v-if="setupInfo.oauth.scopes">
            <strong>Active Services:</strong>
          </p>
          <ul v-if="setupInfo.oauth.scopes" class="scope-list">
            <li v-if="setupInfo.oauth.scopes.includes('calendar')">
              📅 Calendar - Automatic blocking enabled
            </li>
            <li v-if="setupInfo.oauth.scopes.includes('gmail')">
              📧 Gmail - Emails sent from your account
            </li>
          </ul>
          
          <div class="oauth-actions">
            <button @click="disconnectOAuth" :disabled="disconnecting" class="btn btn-danger">
              {{ disconnecting ? 'Disconnecting...' : 'Disconnect OAuth' }}
            </button>
            <button @click="testConnection" :disabled="testing" class="btn btn-secondary">
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </button>
          </div>
        </div>
        
        <div v-else class="oauth-disconnected">
          <div class="status-badge warning">
            <i class="icon-warning"></i>
            Not Connected
          </div>
          <p>{{ setupInfo.oauth.message }}</p>
          
          <div class="oauth-actions">
            <button @click="connectOAuth" :disabled="connecting" class="btn btn-success">
              {{ connecting ? 'Connecting...' : 'Connect with Google' }}
            </button>
          </div>
        </div>
        
        <!-- Divider if service account option also available (only show when OAuth not connected) -->
        <div v-if="setupInfo.serviceAccountEmail && !setupInfo?.oauth?.connected" class="method-divider">
          <span>OR</span>
        </div>
      </div>
      
      <!-- Service Account Section (hidden when OAuth is connected) -->
      <div v-if="setupInfo?.serviceAccountEmail && !setupInfo?.oauth?.connected" class="service-account-section">
        <h4 v-if="setupInfo?.oauth?.available">🔧 Manual Setup (Advanced)</h4>
        <h4 v-else>🔧 Service Account Setup</h4>
        
        <!-- Calendar Selection -->
        <div class="form-group">
          <label for="calendar-id">Calendar ID:</label>
          <input
            id="calendar-id"
            v-model="calendarId"
            type="text"
            class="form-control"
            placeholder="Enter your Google Calendar ID"
            :disabled="saving || setupInfo?.oauth?.connected"
          />
          <small class="form-text">
            Usually your email address or a specific calendar ID
          </small>
        </div>
        
        <!-- Setup Instructions -->
        <div class="setup-instructions">
          <h5>Setup Instructions</h5>
          <div class="instructions">
            <ol>
              <li v-for="(instruction, key) in setupInfo.instructions" :key="key">
                {{ instruction }}
              </li>
            </ol>
            <div class="service-account-email">
              <strong>Service Account Email:</strong>
              <code>{{ setupInfo.serviceAccountEmail }}</code>
            </div>
          </div>
        </div>
      </div>
      
      <!-- All-day Event Handling -->
      <div class="form-group">
        <label for="all-day-handling">All-day Event Handling:</label>
        <select
          id="all-day-handling"
          v-model="allDayHandling"
          class="form-control"
          :disabled="saving"
        >
          <option value="ignore">Ignore all-day events</option>
          <option value="block">Block entire day for all-day events</option>
        </select>
        <small class="form-text">
          How to handle all-day events from your calendar
        </small>
      </div>
      
      <!-- Action Buttons -->
      <div class="button-group">
        <button
          @click="saveSettings"
          :disabled="saving || (!calendarId && !setupInfo?.oauth?.connected)"
          class="btn btn-primary"
        >
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
        
        <button
          v-if="!setupInfo?.oauth?.connected"
          @click="testConnection"
          :disabled="testing || !calendarId"
          class="btn btn-secondary"
        >
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useOAuth } from '../composables/useOAuth'
import { useFormFeedback } from '../composables/useFormFeedback'

const props = defineProps({
    instructorId: {
        type: [String, Number],
        required: true
    }
})

const userStore = useUserStore()
const formFeedback = useFormFeedback()

// OAuth composable
const oauth = useOAuth(ref(props.instructorId))

// Reactive data
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const error = ref(null)
const calendarId = ref('')
const allDayHandling = ref('ignore')
const setupInfo = ref(null)

// Alias for template compatibility
const connecting = oauth.connecting
const disconnecting = oauth.disconnecting

// Load current settings
const loadSettings = async () => {
    loading.value = true
    error.value = null
    
    try {
        // Load calendar config
        const configResponse = await fetch(`/api/auth/calendar/config/${props.instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (configResponse.ok) {
            const config = await configResponse.json()
            calendarId.value = config.calendar_id || ''
            allDayHandling.value = config.all_day_event_handling || 'ignore'
        }
        
        // Load setup info (including OAuth status)
        const setupResponse = await fetch(`/api/auth/calendar/setup-info/${props.instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        if (setupResponse.ok) {
            setupInfo.value = await setupResponse.json()
        }
        
        // Check OAuth status
        await oauth.checkStatus()
        
    } catch (err) {
        console.error('Failed to load calendar settings:', err)
        error.value = 'Failed to load calendar settings. Please try again.'
    } finally {
        loading.value = false
    }
}

// Save settings
const saveSettings = async () => {
    saving.value = true
    error.value = null
    
    try {
        const response = await fetch(`/api/auth/calendar/config/${props.instructorId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userStore.token}`
            },
            body: JSON.stringify({
                calendar_id: calendarId.value || null,
                all_day_event_handling: allDayHandling.value
            })
        })
        
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to save settings')
        }
        
        // Show success toast
        formFeedback.showSuccess('Calendar settings saved successfully!')
        
        // Reload setup info to reflect changes
        await loadSettings()
        
    } catch (err) {
        formFeedback.handleError(err, 'Failed to save calendar settings:')
    } finally {
        saving.value = false
    }
}

// Test connection
const testConnection = async () => {
    testing.value = true
    
    try {
        const response = await fetch(`/api/auth/calendar/test/${props.instructorId}`, {
            headers: {
                'Authorization': `Bearer ${userStore.token}`
            }
        })
        
        const result = await response.json()
        
        // Show toast notification based on result
        if (result.success) {
            const message = result.eventsFound !== undefined 
                ? `Connection successful! Found ${result.eventsFound} events for today.`
                : 'Calendar connection test successful!'
            formFeedback.showSuccess(message)
        } else {
            formFeedback.showError(result.message || 'Calendar connection test failed')
        }
        
    } catch (err) {
        formFeedback.handleError(err, 'Failed to test connection:')
    } finally {
        testing.value = false
    }
}

// OAuth connection methods
const connectOAuth = async () => {
    try {
        await oauth.connect()
        await loadSettings() // Refresh settings after connection
    } catch (err) {
        error.value = err.message || 'Failed to connect OAuth'
    }
}

const disconnectOAuth = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account?')) {
        return
    }
    
    try {
        await oauth.disconnect()
        await loadSettings() // Refresh settings after disconnection
        formFeedback.showSuccess('Google account disconnected successfully!')
    } catch (err) {
        formFeedback.handleError(err, 'Failed to disconnect OAuth:')
    }
}

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Format scopes for display
const formatScopesDisplay = (scopes) => {
    if (!scopes) return 'None'
    if (typeof scopes === 'string') {
        // Parse the scope string and make it human-readable
        return scopes.split(' ')
            .map(scope => {
                if (scope.includes('calendar')) return 'Calendar'
                if (scope.includes('gmail')) return 'Gmail'
                return scope
            })
            .join(', ')
    }
    // If it's already an array
    return scopes.join(', ')
}

// Initialize
onMounted(() => {
    loadSettings()
})
</script>

<style scoped>
.calendar-settings {
    margin-bottom: 2rem;
}

.card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
}

.card-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
    border-radius: 8px 8px 0 0;
}

.card-header h3 {
    margin: 0;
    color: #374151;
    font-size: 1.125rem;
    font-weight: 600;
}

.card-body {
    padding: 1.5rem;
}

.connection-status {
    margin-bottom: 1.5rem;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
}

.status-dot.connected {
    background-color: #10b981;
}

.status-dot.disconnected {
    background-color: #ef4444;
}

.status-dot.loading {
    background-color: #f59e0b;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.status-text {
    font-weight: 500;
    color: #374151;
}

.connection-details {
    margin-top: 0.5rem;
}

.text-sm {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
}

.error-text {
    color: #ef4444;
}

.success-text {
    color: #10b981;
}

.help-text {
    margin-bottom: 1rem;
    color: #6b7280;
    line-height: 1.5;
}

.connected-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
}

.setting-group {
    background-color: #f9fafb;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
}

.btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background-color: #3b82f6;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
}

.btn-secondary {
    background-color: #6b7280;
    color: white;
}

.btn-secondary:hover:not(:disabled) {
    background-color: #4b5563;
}

.btn-outline {
    background-color: transparent;
    color: #374151;
    border: 1px solid #d1d5db;
}

.btn-outline:hover:not(:disabled) {
    background-color: #f9fafb;
}

.btn-danger {
    background-color: #ef4444;
    color: white;
}

.btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
}


.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
    margin: 0 0 1rem 0;
    color: #374151;
}

.modal-content p {
    margin-bottom: 1.5rem;
    color: #6b7280;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
}

.setup-info {
    margin-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
    padding-top: 1.5rem;
}

.setup-info details {
    cursor: pointer;
}

.setup-info summary {
    color: #3b82f6;
    font-weight: 500;
    margin-bottom: 0.5rem;
}

.info-content {
    padding-left: 1rem;
    color: #6b7280;
}

.info-content ul {
    margin: 0.5rem 0;
    padding-left: 1rem;
}

.info-content li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
}

.error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
}

.success-message {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
}

.calendar-form {
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
    font-weight: 500;
    font-size: 0.875rem;
}

.form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    color: #374151;
    transition: border-color 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
}

.form-input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
    color: #9ca3af;
}

.form-help {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
}

.note {
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #6b7280;
    font-style: italic;
}

.info-loading {
    color: #6b7280;
    font-style: italic;
}
.info-loading {
    color: #6b7280;
    font-style: italic;
}

/* OAuth Section Styles */
.oauth-section {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.oauth-section h4 {
    color: #374151;
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
}

.oauth-description {
    margin-bottom: 1rem;
    color: #6b7280;
    line-height: 1.5;
    font-size: 0.875rem;
}

.oauth-connected,
.oauth-disconnected {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 1rem;
}

.oauth-actions {
    margin-top: 1rem;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.oauth-actions .btn {
    border: 1px solid #d1d5db;
}

.oauth-actions .btn-success {
    background: #10b981;
    color: white;
    border-color: #10b981;
}

.oauth-actions .btn-success:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
}

.oauth-actions .btn-danger {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
}

.oauth-actions .btn-danger:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
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

.method-divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    text-align: center;
}

.method-divider::before,
.method-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
}

.method-divider span {
    padding: 0 1rem;
    color: #6b7280;
    font-weight: 500;
    font-size: 0.875rem;
}

.service-account-section {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
}

.service-account-section h4 {
    color: #374151;
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
}

.setup-instructions {
    margin-top: 1rem;
    background: white;
    border-radius: 6px;
    padding: 1rem;
    border: 1px solid #e5e7eb;
}

.setup-instructions h5 {
    margin: 0 0 0.75rem 0;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 600;
}

.instructions ol {
    margin: 0;
    padding-left: 1.25rem;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
}

.instructions li {
    margin-bottom: 0.5rem;
}

.service-account-email {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #f1f5f9;
    border-radius: 4px;
    border-left: 3px solid #3b82f6;
}

.service-account-email code {
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.75rem;
    color: #1e40af;
}

.settings-form {
    max-width: none;
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
}

.error {
    text-align: center;
    padding: 1.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    margin-bottom: 1rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
    font-weight: 500;
    font-size: 0.875rem;
}

.form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    color: #374151;
    transition: border-color 0.2s;
}

.form-control:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
    color: #9ca3af;
}

.form-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
}

.button-group {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.btn-success {
    background-color: #10b981;
    color: white;
}

.btn-success:hover:not(:disabled) {
    background-color: #059669;
}

.scope-list {
    list-style: none;
    padding-left: 0;
    margin: 0.5rem 0;
}

.scope-list li {
    padding: 0.25rem 0;
    font-size: 0.875rem;
    color: #374151;
}
</style>