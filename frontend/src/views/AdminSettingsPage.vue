<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'
import SettingsTabs from '../components/SettingsTabs.vue'
import ThemeConfigSection from '../components/admin/ThemeConfigSection.vue'
import BusinessInfoSection from '../components/admin/BusinessInfoSection.vue'
import EmailTemplatesSection from '../components/admin/EmailTemplatesSection.vue'

const userStore = useUserStore()
const router = useRouter()

// Settings state
const currentSection = ref('theme')
const settingsData = ref({})
const loading = ref(false)
const error = ref('')
const success = ref('')

// Tab configuration
const settingsTabs = [
  {
    id: 'theme',
    label: 'Theme & Branding',
    component: ThemeConfigSection,
    icon: '🎨',
    props: {
      initialData: () => settingsData.value.theme || {},
      loading: loading.value
    }
  },
  {
    id: 'business',
    label: 'Business Information',
    component: BusinessInfoSection,
    icon: '🏢',
    props: {
      initialData: () => settingsData.value.business || {},
      loading: loading.value
    }
  },
  {
    id: 'email',
    label: 'Email Templates',
    component: EmailTemplatesSection,
    icon: '📧',
    badge: 'Future',
    disabled: true, // Enable when WYSIWYG is implemented
    props: {
      initialData: () => settingsData.value.email || {},
      loading: loading.value
    }
  }
]

// Methods
const loadSettings = async () => {
  try {
    loading.value = true
    error.value = ''
    
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
    error.value = 'Error loading settings: ' + err.message
    console.error('Error loading settings:', err)
  } finally {
    loading.value = false
  }
}

const handleTabChange = (tabId) => {
  currentSection.value = tabId
  // Clear any previous messages when switching tabs
  error.value = ''
  success.value = ''
}

const handleContentChange = async (data) => {
  try {
    const { tabId, action, payload } = data
    
    // Show loading state
    loading.value = true
    error.value = ''
    success.value = ''
    
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
      throw new Error(errorData.message || 'Failed to save settings')
    }
    
    const result = await response.json()
    
    // Update local state
    settingsData.value = {
      ...settingsData.value,
      [tabId]: result.data
    }
    
    success.value = `${settingsTabs.find(t => t.id === tabId)?.label} updated successfully`
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = ''
    }, 3000)
    
  } catch (err) {
    error.value = 'Error saving settings: ' + err.message
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
      <p class="page-description">
        Manage your application's theme, branding, and configuration
      </p>
    </div>
    
    <!-- Global Messages -->
    <div v-if="error" class="message error-message">
      <span class="message-icon">⚠️</span>
      <span class="message-text">{{ error }}</span>
      <button class="message-close" @click="error = ''" aria-label="Close error">&times;</button>
    </div>
    
    <div v-if="success" class="message success-message">
      <span class="message-icon">✅</span>
      <span class="message-text">{{ success }}</span>
      <button class="message-close" @click="success = ''" aria-label="Close success">&times;</button>
    </div>
    
    <!-- Settings Tabs -->
    <div class="settings-container">
      <SettingsTabs
        :tabs="settingsTabs"
        :initial-tab="currentSection"
        default-tab-id="theme"
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
  padding: var(--spacing-lg);
  min-height: calc(100vh - 70px);
}

.page-header {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.page-header h1 {
  color: var(--text-primary);
  font-size: var(--font-size-3xl);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 700;
}

.page-description {
  color: var(--text-secondary);
  font-size: var(--font-size-lg);
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
}

.settings-container {
  background: var(--background-light);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  min-height: 600px;
  border: 1px solid var(--border-color);
}

/* Global Messages */
.message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-md);
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.message-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.message-text {
  flex: 1;
}

.message-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background var(--transition-normal);
  color: inherit;
  opacity: 0.7;
}

.message-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-settings-page {
    padding: var(--spacing-md);
  }
  
  .page-header h1 {
    font-size: var(--font-size-2xl);
  }
  
  .page-description {
    font-size: var(--font-size-base);
  }
  
  .settings-container {
    min-height: 500px;
    border-radius: var(--border-radius);
  }
  
  .message {
    padding: var(--spacing-sm);
    font-size: var(--font-size-sm);
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

/* Dark mode support (future) */
@media (prefers-color-scheme: dark) {
  .error-message {
    background: #1f1f23;
    color: #f87171;
    border-color: #3f3f46;
  }
  
  .success-message {
    background: #1f1f23;
    color: #4ade80;
    border-color: #3f3f46;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .settings-container {
    border-width: 2px;
  }
  
  .message {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .message {
    animation: none;
  }
}
</style>
