<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import { useFormFeedback } from '../composables/useFormFeedback'
import { useQueryClient } from '@tanstack/vue-query'
import SettingsTabs from '../components/SettingsTabs.vue'
import ThemeConfigSection from '../components/admin/ThemeConfigSection.vue'
import BusinessInfoSection from '../components/admin/BusinessInfoSection.vue'
import EmailTemplatesSection from '../components/admin/EmailTemplatesSection.vue'
import LessonsSection from '../components/admin/LessonsSection.vue'
import AdvancedSettingsSection from '../components/admin/AdvancedSettingsSection.vue'

const userStore = useUserStore()
const router = useRouter()
const queryClient = useQueryClient()
const { showSuccess, handleError } = useFormFeedback()

// Settings state
const currentSection = ref('business')
const settingsData = ref({})
const loading = ref(false)

// Tab configuration - using computed to make props reactive
const settingsTabs = computed(() => [
  {
    id: 'business',
    label: 'Business Information',
    component: BusinessInfoSection,
    props: {
      initialData: settingsData.value.business || {},
      loading: loading.value
    }
  },
  {
    id: 'theme',
    label: 'Theme & Branding',
    component: ThemeConfigSection,
    props: {
      initialData: settingsData.value.theme || {},
      loading: loading.value
    }
  },
  {
    id: 'lessons',
    label: 'Lesson Settings',
    component: LessonsSection,
    props: {
      initialData: settingsData.value.lessons || {},
      loading: loading.value
    }
  },
  {
    id: 'email',
    label: 'Email Settings',
    component: EmailTemplatesSection,
    props: {
      initialData: settingsData.value.email || {},
      loading: loading.value
    }
  },
  {
    id: 'advanced',
    label: 'Advanced Settings',
    component: AdvancedSettingsSection,
    props: {}
  }
])

// Methods
const loadSettings = async () => {
  try {
    loading.value = true
    
    const response = await fetch('/api/admin/settings', {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to load settings')
    }
    
    const data = await response.json()
    settingsData.value = data
  } catch (err) {
    handleError(err, 'Error loading settings: ')
    console.error('Error loading settings:', err)
  } finally {
    loading.value = false
  }
}

const handleTabChange = (tabId) => {
  currentSection.value = tabId
}

const handleContentChange = async (data) => {
  try {
    const { tabId, action, payload } = data
    
    // Handle logo-specific actions separately
    if (action === 'logo_uploaded' || action === 'logo_removed' || action === 'logo_position_updated') {
      if (action === 'logo_uploaded') {
        showSuccess(payload.message || 'Logo uploaded successfully')
      } else if (action === 'logo_removed') {
        showSuccess(payload.message || 'Logo removed successfully')
      } else if (action === 'logo_position_updated') {
        showSuccess(payload.message || 'Logo position updated successfully')
      }
      
      return
    }
    
    // Handle upload errors
    if (action === 'upload_error') {
      handleError(new Error(payload.error || 'Upload failed'))
      return
    }
    
    // Show loading state for standard form submissions
    loading.value = true
    
    const response = await fetch(`/api/admin/settings/${tabId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      
      // Handle validation errors specially
      if (response.status === 400 && errorData.details) {
        const fieldErrors = Object.entries(errorData.details)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ')
        throw new Error(`Validation failed: ${fieldErrors}`)
      }
      
      throw new Error(errorData.message || 'Failed to save settings')
    }
    
    const result = await response.json()
    
    // Update local state
    settingsData.value = {
      ...settingsData.value,
      [tabId]: result.data
    }
    
    // Invalidate appSettings cache if business hours were updated
    // This ensures instructor availability UI reflects new business hours immediately
    if (tabId === 'business') {
      await queryClient.invalidateQueries({ queryKey: ['appSettings'] })
    }
    
    // Clear any component-level validation errors on successful save
    // This will trigger reactive updates in child components
    
    const tabLabel = settingsTabs.value.find(t => t.id === tabId)?.label
    showSuccess(`${tabLabel} updated successfully`)
    
  } catch (err) {
    handleError(err, 'Error saving settings: ')
    console.error('Error saving settings:', err)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // Check admin permissions
  if (!userStore.canManageUsers) { // Using existing admin permission check
    router.push('/')
    return
  }
  
  // Load initial settings
  loadSettings()
})
</script>

<template>
  <div class="admin-settings-page">
    <div class="page-header">
      <h1>Settings</h1>
    </div>
    
    <!-- Settings Tabs -->
    <div class="settings-container">
      <SettingsTabs
        :tabs="settingsTabs"
        :initial-tab="currentSection"
        default-tab-id="business"
        @tab-change="handleTabChange"
        @content-change="handleContentChange"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-settings-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--spacing-lg);
}

.page-header h1 {
  color: var(--text-primary);
  font-size: var(--font-size-3xl);
}

.settings-container {
  background: var(--background-light);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  min-height: 600px;
  border: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-settings-page {
    padding: var(--spacing-md);
  }
  
  .page-header h1 {
    font-size: var(--font-size-2xl);
  }
  
  .settings-container {
    min-height: 500px;
    border-radius: var(--border-radius);
  }
}

@media (max-width: 480px) {
  .admin-settings-page {
    padding: var(--spacing-sm);
  }
  
  .settings-container {
    min-height: 400px;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .settings-container {
    border-width: 2px;
  }
}
</style>
