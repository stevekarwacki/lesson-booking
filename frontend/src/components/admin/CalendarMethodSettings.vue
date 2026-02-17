<template>
  <Card class="calendar-method-settings">
    <CardHeader>
      <CardTitle>Calendar Connection Method</CardTitle>
      <CardDescription>
        Select how instructors connect their Google Calendars.
        Calendar events block time slots on the booking calendar, preventing students from booking unavailable times.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <!-- Loading State -->
      <div v-if="isLoadingMethod" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading calendar settings...</p>
      </div>

      <!-- Method Selection -->
      <div v-else class="method-selection">
        <div class="form-group">
          <Label for="calendar-method">
            Connection Method <span class="required">*</span>
          </Label>
          <Select
            v-model="selectedMethod"
            @update:modelValue="handleMethodChange"
            :disabled="isSettingMethod"
          >
            <SelectTrigger id="calendar-method">
              <SelectValue placeholder="Select connection method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service_account">
                <div class="select-item-content">
                  <strong>Service Account</strong>
                  <span class="description">Instructors share their calendar with a service account (recommended)</span>
                </div>
              </SelectItem>
              <SelectItem value="oauth">
                <div class="select-item-content">
                  <strong>OAuth</strong>
                  <span class="description">Instructors connect via Google sign-in (requires OAuth credentials)</span>
                </div>
              </SelectItem>
              <SelectItem value="disabled">
                <div class="select-item-content">
                  <strong>Disabled</strong>
                  <span class="description">Turn off Google Calendar integration</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="help-text">
            <template v-if="selectedMethod === 'service_account'">
              Instructors share their Google Calendar with a service account email. You configure the service account credentials below.
            </template>
            <template v-else-if="selectedMethod === 'oauth'">
              Instructors sign in with their Google account to grant calendar access. Requires OAuth credentials configured in Email Settings.
            </template>
            <template v-else-if="selectedMethod === 'disabled'">
              Google Calendar integration is turned off. Instructor calendars will not block booking time slots.
            </template>
            <template v-else>
              Select a connection method to configure Google Calendar integration.
            </template>
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useCalendarSettings } from '@/composables/useCalendarSettings'
import { useFormFeedback } from '@/composables/useFormFeedback'

const { showSuccess, showError } = useFormFeedback()

const {
  calendarMethod,
  isLoadingMethod,
  setCalendarMethod,
  isSettingMethod
} = useCalendarSettings()

const selectedMethod = ref(null)

// Initialize when data loads
watch(
  () => calendarMethod.value,
  (newMethod) => {
    if (newMethod) {
      selectedMethod.value = newMethod.method || null
    }
  },
  { immediate: true }
)

const handleMethodChange = async (newMethod) => {
  try {
    await setCalendarMethod(newMethod)
    showSuccess(`Calendar method changed to ${newMethod.replace('_', ' ')}`)
  } catch (error) {
    showError(`Failed to change calendar method: ${error.message}`)
    selectedMethod.value = calendarMethod.value?.method || null
  }
}
</script>

<style scoped>
.calendar-method-settings {
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

.method-selection {
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
