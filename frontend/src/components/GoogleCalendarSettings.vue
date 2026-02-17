<template>
  <div class="calendar-settings">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p class="text-muted-foreground">Loading calendar settings...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="loadSettings" variant="outline" size="sm">Retry</Button>
    </div>

    <!-- Disabled / Not Configured -->
    <Card v-else-if="!calendarMethod || calendarMethod === 'disabled'">
      <CardHeader>
        <CardTitle class="text-base">Google Calendar Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          Calendar integration is not currently enabled. Please contact your administrator to set it up.
        </p>
      </CardContent>
    </Card>

    <!-- OAuth Method -->
    <Card v-else-if="calendarMethod === 'oauth'">
      <CardHeader>
        <CardTitle class="text-base">Google Calendar Integration</CardTitle>
        <p class="text-sm text-muted-foreground mt-1">
          Connect your Google Calendar to automatically block booked times.
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Connection Status -->
        <div class="status-row">
          <span
            class="status-badge"
            :class="setupInfo?.connection?.connected ? 'status-success' : 'status-warning'"
          >
            {{ setupInfo?.connection?.connected ? 'Connected' : 'Not Connected' }}
          </span>
          <span v-if="setupInfo?.connection?.connectedAt" class="text-xs text-muted-foreground">
            since {{ formatDate(setupInfo.connection.connectedAt) }}
          </span>
        </div>

        <!-- Connected: show scopes, actions, and settings -->
        <template v-if="setupInfo?.connection?.connected">
          <div v-if="parsedScopes.length" class="scope-list">
            <p class="text-sm font-medium mb-1">Active Services:</p>
            <ul class="text-sm text-muted-foreground space-y-0.5">
              <li v-for="scope in parsedScopes" :key="scope.type">
                {{ scope.name }} - {{ scope.description }}
              </li>
            </ul>
          </div>

          <!-- All-day Event Handling -->
          <div class="space-y-1.5">
            <Label for="all-day-handling">All-day Event Handling</Label>
            <select
              id="all-day-handling"
              v-model="allDayHandling"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              :disabled="saving"
            >
              <option value="ignore">Ignore all-day events</option>
              <option value="block">Block entire day for all-day events</option>
            </select>
            <p class="text-xs text-muted-foreground">
              How to handle all-day events from your calendar.
            </p>
          </div>

          <div class="flex flex-wrap gap-2 pt-2">
            <Button @click="saveSettings" :disabled="saving" size="sm">
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </Button>
            <Button @click="handleTestConnection" :disabled="testing" variant="outline" size="sm">
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </Button>
            <Button @click="disconnectOAuth" :disabled="disconnecting" variant="destructive" size="sm">
              {{ disconnecting ? 'Disconnecting...' : 'Disconnect' }}
            </Button>
          </div>
        </template>

        <!-- Not Connected: show connect button -->
        <template v-else>
          <p class="text-sm text-muted-foreground">
            {{ setupInfo?.connection?.message || 'Connect your Google account to enable calendar blocking.' }}
          </p>
          <Button
            @click="connectOAuth"
            :disabled="connecting || !setupInfo?.connection?.available"
            size="sm"
          >
            {{ connecting ? 'Connecting...' : 'Connect with Google' }}
          </Button>
        </template>
      </CardContent>
    </Card>

    <!-- Service Account Method -->
    <Card v-else-if="calendarMethod === 'service_account'">
      <CardHeader>
        <CardTitle class="text-base">Google Calendar Integration</CardTitle>
        <p class="text-sm text-muted-foreground mt-1">
          Share your Google Calendar with the service account to block booked times.
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Connection Status -->
        <div class="status-row">
          <span
            class="status-badge"
            :class="setupInfo?.connection?.connected ? 'status-success' : 'status-warning'"
          >
            {{ setupInfo?.connection?.connected ? 'Connected' : 'Not Connected' }}
          </span>
          <span v-if="setupInfo?.connection?.connectedAt" class="text-xs text-muted-foreground">
            since {{ formatDate(setupInfo.connection.connectedAt) }}
          </span>
        </div>

        <!-- Not available: admin hasn't configured service account -->
        <template v-if="!setupInfo?.connection?.available">
          <p class="text-sm text-muted-foreground">
            {{ setupInfo?.connection?.message || 'Service account not configured. Please contact your administrator.' }}
          </p>
        </template>

        <!-- Available: show setup form -->
        <template v-else>
          <!-- Calendar ID Input -->
          <div class="space-y-1.5">
            <Label for="calendar-id">Calendar ID</Label>
            <Input
              id="calendar-id"
              v-model="calendarId"
              placeholder="Enter your Google Calendar ID"
              :disabled="saving"
            />
            <p class="text-xs text-muted-foreground">
              Usually your email address or a specific calendar ID from Google Calendar settings.
            </p>
          </div>

          <!-- All-day Event Handling (show when connected) -->
          <div v-if="setupInfo?.connection?.connected" class="space-y-1.5">
            <Label for="all-day-handling-sa">All-day Event Handling</Label>
            <select
              id="all-day-handling-sa"
              v-model="allDayHandling"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              :disabled="saving"
            >
              <option value="ignore">Ignore all-day events</option>
              <option value="block">Block entire day for all-day events</option>
            </select>
            <p class="text-xs text-muted-foreground">
              How to handle all-day events from your calendar.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-2 pt-2">
            <Button @click="saveSettings" :disabled="saving || !calendarId" size="sm">
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </Button>
            <Button
              v-if="setupInfo?.connection?.connected"
              @click="handleTestConnection"
              :disabled="testing || !calendarId"
              variant="outline"
              size="sm"
            >
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </Button>
          </div>

          <!-- Setup Instructions -->
          <div v-if="!setupInfo?.connection?.connected" class="setup-instructions">
            <p class="text-sm font-medium mb-2">Setup Instructions</p>
            <ol class="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Open Google Calendar and go to the calendar's settings.</li>
              <li>Under "Share with specific people", add the service account email below.</li>
              <li>Grant "Make changes to events" permission.</li>
              <li>Copy the Calendar ID from the "Integrate calendar" section and paste it above.</li>
            </ol>
            <div v-if="setupInfo?.serviceAccountEmail" class="sa-email-display">
              <span class="text-sm font-medium">Service Account Email:</span>
              <code class="text-xs">{{ setupInfo.serviceAccountEmail }}</code>
            </div>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useOAuth } from '../composables/useOAuth'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useGoogleCalendar } from '../composables/useGoogleCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps({
    instructorId: {
        type: [String, Number],
        required: true
    }
})

const userStore = useUserStore()
const formFeedback = useFormFeedback()

const oauth = useOAuth(ref(props.instructorId))

const {
    calendarConfig,
    setupInfo,
    calendarMethod,
    isLoadingConfig,
    isLoadingSetup,
    saveCalendarConfig,
    testConnection,
    isSavingConfig,
    isTestingConnection
} = useGoogleCalendar(computed(() => props.instructorId))

const calendarId = ref('')
const allDayHandling = ref('ignore')

watch(calendarConfig, (data) => {
    if (data?.config) {
        calendarId.value = data.config.calendar_id || ''
        allDayHandling.value = data.config.all_day_event_handling || 'ignore'
    }
}, { immediate: true })

const loading = computed(() => isLoadingConfig.value || isLoadingSetup.value)
const saving = isSavingConfig
const testing = isTestingConnection

const connecting = oauth.connecting
const disconnecting = oauth.disconnecting
const error = ref(null)

const parsedScopes = computed(() => {
    const scopes = setupInfo.value?.scopes
    if (!scopes) return []
    const scopeStr = typeof scopes === 'string' ? scopes : scopes.join(' ')
    const result = []
    if (scopeStr.includes('calendar')) {
        result.push({ type: 'calendar', name: 'Calendar', description: 'Automatic blocking enabled' })
    }
    if (scopeStr.includes('gmail')) {
        result.push({ type: 'gmail', name: 'Gmail', description: 'Emails sent from your account' })
    }
    return result
})

const loadSettings = async () => {
    error.value = null
    try {
        await oauth.checkStatus()
    } catch (err) {
        error.value = 'Failed to load calendar settings. Please try again.'
    }
}

const saveSettings = async () => {
    error.value = null
    try {
        await saveCalendarConfig({
            calendar_id: calendarId.value || null,
            all_day_event_handling: allDayHandling.value
        })
        formFeedback.showSuccess('Calendar settings saved successfully!')
    } catch (err) {
        formFeedback.handleError(err, 'Failed to save calendar settings:')
    }
}

const handleTestConnection = async () => {
    try {
        const result = await testConnection()
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
    }
}

const connectOAuth = async () => {
    try {
        await oauth.connect()
        await loadSettings()
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
        await loadSettings()
        formFeedback.showSuccess('Google account disconnected successfully!')
    } catch (err) {
        formFeedback.handleError(err, 'Failed to disconnect OAuth:')
    }
}

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

onMounted(() => {
    loadSettings()
})
</script>

<style scoped>
.calendar-settings {
    margin-bottom: 1rem;
}

.loading-state,
.error-state {
    text-align: center;
    padding: 1.5rem;
}

.error-state {
    background: rgba(var(--error-color-rgb), 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--radius);
    color: var(--error-color);
}

.status-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.status-success {
    background: rgba(var(--success-color-rgb), 0.1);
    color: var(--success-color);
    border: 1px solid var(--success-color);
}

.status-warning {
    background: rgba(var(--error-color-rgb), 0.1);
    color: var(--error-color);
    border: 1px solid var(--error-color);
}

.setup-instructions {
    background: hsl(var(--muted));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    padding: 1rem;
}

.sa-email-display {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.sa-email-display code {
    font-family: monospace;
    font-size: 0.75rem;
    word-break: break-all;
    color: hsl(var(--primary));
}
</style>
