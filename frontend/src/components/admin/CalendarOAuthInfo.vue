<template>
  <Card class="calendar-oauth-info">
    <CardHeader>
      <CardTitle>OAuth Configuration Status</CardTitle>
      <CardDescription>
        OAuth credentials are shared with email integration.
        Manage them in the Email Settings tab under Gmail OAuth Configuration.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingOAuthCredentials" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Checking OAuth status...</p>
      </div>

      <div v-else class="oauth-status">
        <!-- Configured -->
        <div v-if="oauthCredentials?.is_configured" class="status-connected">
          <div class="status-badge success">
            <span class="icon">&#10003;</span>
            OAuth Credentials Configured
          </div>
          <div class="config-details">
            <p><strong>Client ID:</strong> {{ oauthCredentials.google_client_id }}</p>
            <p><strong>Redirect URI:</strong> {{ oauthCredentials.google_redirect_uri }}</p>
          </div>
          <p class="help-text">
            Instructors can connect their Google account from their calendar settings page.
          </p>
        </div>

        <!-- Not Configured -->
        <div v-else class="status-not-configured">
          <div class="status-badge warning">
            <span class="icon">&#9888;</span>
            OAuth Not Configured
          </div>
          <p class="warning-message">
            OAuth credentials have not been set up yet. Configure them in the
            <strong>Email Settings</strong> tab under "Gmail OAuth Configuration" to enable Google sign-in for instructors.
          </p>
        </div>

        <!-- Connected Instructors (from calendar settings composable) -->
        <div v-if="connectedInstructors && connectedInstructors.count > 0" class="connected-users-section">
          <h4>Connected Instructors ({{ connectedInstructors.count }})</h4>
          <ul class="user-list">
            <li v-for="instructor in connectedInstructors.instructors" :key="instructor.instructor_id" class="user-item">
              <div class="user-info">
                <span class="user-name">{{ instructor.name }}</span>
                <span class="user-email">{{ instructor.email }}</span>
              </div>
              <div class="user-status">
                <span class="connection-type">{{ formatConnectionType(instructor.connection_type) }}</span>
                <span v-if="instructor.has_oauth_token && instructor.has_refresh_token" class="status-badge success small">
                  <span class="icon">&#10003;</span>
                  Active
                </span>
                <span v-else-if="instructor.has_oauth_token" class="status-badge warning small">
                  <span class="icon">&#9888;</span>
                  Token Issue
                </span>
                <span v-else-if="instructor.is_active" class="status-badge success small">
                  <span class="icon">&#10003;</span>
                  Connected
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEmailSettings } from '@/composables/useEmailSettings'
import { useCalendarSettings } from '@/composables/useCalendarSettings'

const {
  oauthCredentials,
  isLoadingOAuthCredentials
} = useEmailSettings()

const {
  connectedInstructors
} = useCalendarSettings()

const formatConnectionType = (type) => {
  switch (type) {
    case 'oauth': return 'OAuth'
    case 'service_account': return 'Service Account'
    default: return type
  }
}
</script>

<style scoped>
.calendar-oauth-info {
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

.oauth-status {
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

.status-badge.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.status-badge .icon {
  font-size: 1.2em;
}

.config-details {
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
}

.help-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin: 0;
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

.user-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-type {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
</style>
