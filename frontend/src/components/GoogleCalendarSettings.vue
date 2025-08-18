<template>
    <div class="calendar-settings">
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <!-- Calendar Integration Section -->
        <div class="calendar-section card">
            <div class="card-header">
                <h3>Google Calendar Integration</h3>
            </div>
            <div class="card-body">
                <!-- Connection Status -->
                <div class="connection-status">
                    <div class="status-indicator">
                        <span 
                            class="status-dot" 
                            :class="{ 
                                'connected': connectionStatus.connected,
                                'disconnected': !connectionStatus.connected,
                                'loading': isLoading
                            }"
                        ></span>
                        <span class="status-text">
                            {{ getStatusText() }}
                        </span>
                    </div>
                    
                    <div v-if="connectionStatus.connected && connectionStatus.config" class="connection-details">
                        <p class="text-sm">
                            Calendar: {{ connectionStatus.config.calendar_name || connectionStatus.config.calendar_id }}
                        </p>
                        <p class="text-sm">
                            Connected: {{ formatDate(connectionStatus.connectedAt) }}
                        </p>
                        <p v-if="connectionStatus.config.last_test_status === 'failed'" class="text-sm error-text">
                            ⚠️ Last connection test failed. Please check your calendar sharing settings.
                        </p>
                    </div>
                </div>

                <!-- Connection Form (Not Connected State) -->
                <div v-if="!connectionStatus.connected" class="connect-section">
                    <p class="help-text">
                        Connect your Google Calendar to automatically block out busy times from your lesson scheduling.
                    </p>
                    
                    <div class="calendar-form">
                        <div class="form-group">
                            <label for="calendar-id">Google Calendar ID *</label>
                            <input 
                                id="calendar-id"
                                v-model="calendarForm.calendar_id"
                                type="email"
                                placeholder="your-email@gmail.com"
                                class="form-input"
                                :disabled="isLoading"
                                @keyup.enter="connectCalendar"
                            />
                            <small class="form-help">Usually your email address or a Google Calendar ID</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="calendar-name">Display Name (optional)</label>
                            <input 
                                id="calendar-name"
                                v-model="calendarForm.calendar_name"
                                type="text"
                                placeholder="My Calendar"
                                class="form-input"
                                :disabled="isLoading"
                            />
                            <small class="form-help">Friendly name for this calendar</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="calendar-type">Calendar Type</label>
                            <select 
                                id="calendar-type"
                                v-model="calendarForm.calendar_type"
                                class="form-input"
                                :disabled="isLoading"
                            >
                                <option value="personal">Personal Calendar</option>
                                <option value="shared">Shared Calendar</option>
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        class="btn btn-primary"
                        @click="connectCalendar"
                        :disabled="isLoading || !calendarForm.calendar_id"
                    >
                        <span v-if="isLoading">Connecting...</span>
                        <span v-else>Connect Calendar</span>
                    </button>
                </div>

                <!-- Connected State -->
                <div v-else class="connected-section">
                    <p class="help-text success-text">
                        ✅ Your Google Calendar is connected and will automatically block busy times.
                    </p>
                    
                    <div class="connected-actions">
                        <button 
                            class="btn btn-secondary"
                            @click="testConnection"
                            :disabled="isLoading || isTesting"
                        >
                            <span v-if="isTesting">Testing...</span>
                            <span v-else>Test Connection</span>
                        </button>
                        
                        <button 
                            class="btn btn-outline"
                            @click="showDisconnectConfirm = true"
                            :disabled="isLoading"
                        >
                            Disconnect
                        </button>
                    </div>

                    <!-- Test Results -->
                    <div v-if="testResults" class="test-results">
                        <h4>Connection Test Results:</h4>
                        <div v-if="testResults.working" class="test-success">
                            ✅ Connection is working properly
                            <p class="text-sm">
                                Found {{ testResults.testResults?.eventsFound || 0 }} events for today
                            </p>
                            <p class="text-sm">
                                Calendar: {{ testResults.testResults?.calendarName || testResults.testResults?.calendarId }}
                            </p>
                        </div>
                        <div v-else class="test-error">
                            ❌ Connection test failed
                            <p class="text-sm">{{ testResults.error }}</p>
                        </div>
                    </div>
                </div>

                <!-- Disconnect Confirmation Modal -->
                <div v-if="showDisconnectConfirm" class="modal-overlay" @click="showDisconnectConfirm = false">
                    <div class="modal-content" @click.stop>
                        <h3>Disconnect Calendar?</h3>
                        <p>
                            This will remove the connection between your instructor account and Google Calendar. 
                            Your Google Calendar events will no longer automatically block lesson booking times.
                        </p>
                        <div class="modal-actions">
                            <button 
                                class="btn btn-outline"
                                @click="showDisconnectConfirm = false"
                                :disabled="isLoading"
                            >
                                Cancel
                            </button>
                            <button 
                                class="btn btn-danger"
                                @click="disconnectCalendar"
                                :disabled="isLoading"
                            >
                                <span v-if="isLoading">Disconnecting...</span>
                                <span v-else>Disconnect</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Setup Instructions -->
                <div class="setup-info">
                    <details>
                        <summary>How to set up calendar sharing</summary>
                        <div class="info-content" v-if="setupInfo">
                            <p><strong>Service Account Email:</strong> <code>{{ setupInfo.serviceAccountEmail }}</code></p>
                            <ol>
                                <li v-for="(instruction, key) in setupInfo.instructions" :key="key">
                                    {{ instruction }}
                                </li>
                            </ol>
                            <p class="note">
                                <strong>Note:</strong> This approach uses a service account, so you don't need to go through OAuth authorization. 
                                Just share your calendar with the service account email above.
                            </p>
                        </div>
                        <div v-else class="info-loading">
                            Loading setup instructions...
                        </div>
                    </details>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
    instructorId: {
        type: [String, Number],
        required: true
    }
})

// Reactive state
const error = ref('')
const success = ref('')
const isLoading = ref(false)
const isTesting = ref(false)
const showDisconnectConfirm = ref(false)
const connectionStatus = ref({
    connected: false,
    config: null,
    connectedAt: null,
    message: 'Not connected'
})
const testResults = ref(null)
const setupInfo = ref(null)

// Form data for connecting calendar
const calendarForm = ref({
    calendar_id: '',
    calendar_name: '',
    calendar_type: 'personal'
})

// Computed properties
const getStatusText = () => {
    if (isLoading.value) return 'Checking connection...'
    if (connectionStatus.value.connected) return 'Connected to Google Calendar'
    return 'Not connected to Google Calendar'
}

// Helper functions
const clearMessages = () => {
    error.value = ''
    success.value = ''
    testResults.value = null
}

const resetForm = () => {
    calendarForm.value = {
        calendar_id: '',
        calendar_name: '',
        calendar_type: 'personal'
    }
}

const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString()
}

const handleError = (err, defaultMessage = 'An error occurred') => {
    console.error('Calendar Settings Error:', err)
    
    if (err.response?.data?.message) {
        error.value = err.response.data.message
    } else if (err.response?.data?.error) {
        error.value = err.response.data.error
    } else if (err.message) {
        error.value = err.message
    } else {
        error.value = defaultMessage
    }
}

// API functions
const checkConnectionStatus = async () => {
    if (!props.instructorId) return
    
    try {
        clearMessages()
        isLoading.value = true
        
        const response = await axios.get(`/api/auth/calendar/config/${props.instructorId}`)
        connectionStatus.value = response.data
        
    } catch (err) {
        handleError(err, 'Failed to check calendar connection status')
    } finally {
        isLoading.value = false
    }
}

const loadSetupInfo = async () => {
    if (!props.instructorId) return
    
    try {
        const response = await axios.get(`/api/auth/calendar/setup-info/${props.instructorId}`)
        setupInfo.value = response.data
    } catch (err) {
        console.error('Failed to load setup info:', err)
    }
}

const connectCalendar = async () => {
    if (!props.instructorId || !calendarForm.value.calendar_id) return
    
    try {
        clearMessages()
        isLoading.value = true
        
        const response = await axios.post(`/api/auth/calendar/config/${props.instructorId}`, calendarForm.value)
        
        success.value = response.data.message
        resetForm()
        
        // Refresh the connection status
        await checkConnectionStatus()
        
    } catch (err) {
        handleError(err, 'Failed to connect calendar')
    } finally {
        isLoading.value = false
    }
}

const testConnection = async () => {
    if (!props.instructorId) return
    
    try {
        clearMessages()
        isTesting.value = true
        
        const response = await axios.get(`/api/auth/calendar/test/${props.instructorId}`)
        testResults.value = response.data
        
        if (response.data.working) {
            success.value = 'Calendar connection test successful!'
        }
        
    } catch (err) {
        testResults.value = {
            working: false,
            error: err.response?.data?.error || 'Connection test failed'
        }
        handleError(err, 'Failed to test calendar connection')
    } finally {
        isTesting.value = false
    }
}

const disconnectCalendar = async () => {
    if (!props.instructorId) return
    
    try {
        clearMessages()
        isLoading.value = true
        
        await axios.delete(`/api/auth/calendar/config/${props.instructorId}`)
        
        success.value = 'Calendar disconnected successfully'
        showDisconnectConfirm.value = false
        testResults.value = null
        
        // Refresh the connection status
        await checkConnectionStatus()
        
    } catch (err) {
        showDisconnectConfirm.value = false
        handleError(err, 'Failed to disconnect calendar')
    } finally {
        isLoading.value = false
    }
}

// Watchers
watch(() => props.instructorId, (newId) => {
    if (newId) {
        checkConnectionStatus()
        loadSetupInfo()
    }
}, { immediate: true })

// Lifecycle
onMounted(() => {
    if (props.instructorId) {
        checkConnectionStatus()
        loadSetupInfo()
    }
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

.test-results {
    background-color: #f9fafb;
    border-radius: 6px;
    padding: 1rem;
    margin-top: 1rem;
}

.test-results h4 {
    margin: 0 0 0.5rem 0;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 600;
}

.test-success {
    color: #10b981;
}

.test-error {
    color: #ef4444;
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
</style> 