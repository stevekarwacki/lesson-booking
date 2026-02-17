<template>
  <div class="calendar-settings-section">
    <!-- Method Selection (always visible) -->
    <CalendarMethodSettings />

    <div class="section-divider"></div>

    <!-- Service Account Configuration (when method is service_account) -->
    <ServiceAccountSettings v-if="selectedMethod === 'service_account'" />

    <!-- OAuth Info (when method is oauth) -->
    <CalendarOAuthInfo v-if="selectedMethod === 'oauth'" />

    <!-- Connected Instructors (when method is not disabled and not oauth, since OAuth info shows its own list) -->
    <div v-if="selectedMethod === 'service_account' && connectedInstructors && connectedInstructors.count > 0" class="connected-section">
      <Card>
        <CardHeader>
          <CardTitle>Connected Instructors ({{ connectedInstructors.count }})</CardTitle>
          <CardDescription>
            Instructors with active Google Calendar integration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="user-list">
            <li v-for="instructor in connectedInstructors.instructors" :key="instructor.instructor_id" class="user-item">
              <div class="user-info">
                <span class="user-name">{{ instructor.name }}</span>
                <span class="user-email">{{ instructor.email }}</span>
              </div>
              <div class="user-status">
                <span v-if="instructor.last_test_status === 'success'" class="status-badge success small">
                  <span class="icon">&#10003;</span>
                  Working
                </span>
                <span v-else-if="instructor.last_test_status === 'failed'" class="status-badge warning small">
                  <span class="icon">&#9888;</span>
                  Failed
                </span>
                <span v-else class="status-badge neutral small">
                  Not Tested
                </span>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendarSettings } from '@/composables/useCalendarSettings'
import CalendarMethodSettings from './CalendarMethodSettings.vue'
import ServiceAccountSettings from './ServiceAccountSettings.vue'
import CalendarOAuthInfo from './CalendarOAuthInfo.vue'

const {
  calendarMethod,
  connectedInstructors
} = useCalendarSettings()

const selectedMethod = computed(() => calendarMethod.value?.method || null)
</script>

<style scoped>
.calendar-settings-section {
  max-width: 100%;
  padding: var(--spacing-lg);
}

.section-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-2xl) 0;
}

.connected-section {
  margin-top: var(--spacing-xl);
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

.status-badge.neutral {
  background-color: var(--background-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.status-badge.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.status-badge .icon {
  font-size: 1.2em;
}
</style>
