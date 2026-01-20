<template>
  <div class="theme-config-section">
    <div class="section-header">
      <h2>Theme & Branding Configuration</h2>
      <p class="section-description">
        Customize your application's colors and visual identity. Choose from curated palettes 
        or create a custom color scheme with accessibility validation.
      </p>
    </div>
    
    <div class="config-grid">
      <!-- Color Configuration -->
      <div class="config-card">
        <h3>Color Scheme</h3>
        <div class="color-picker-section">
          <div class="curated-palettes">
            <h4>Recommended Palettes</h4>
            <div class="palette-grid">
              <button 
                v-for="palette in curatedPalettes" 
                :key="palette.name"
                @click="selectPalette(palette)"
                :class="['palette-option', { active: selectedPalette?.name === palette.name }]"
                :aria-label="`Select ${palette.name} color palette`"
              >
                <div class="palette-colors">
                  <div 
                    class="palette-color primary" 
                    :style="{ backgroundColor: palette.primary }"
                  ></div>
                  <div 
                    class="palette-color secondary" 
                    :style="{ backgroundColor: palette.secondary }"
                  ></div>
                </div>
                <span class="palette-name">{{ palette.name }}</span>
              </button>
            </div>
          </div>
          
          <div class="custom-color-section">
            <h4>Custom Primary Color</h4>
            <div class="color-input-group">
              <input 
                type="color" 
                v-model="customPrimaryColor" 
                @input="validateAndPreviewCustomColor"
                class="color-input"
                :disabled="loading"
              />
              <input 
                type="text" 
                v-model="customPrimaryColor" 
                @input="validateAndPreviewCustomColor"
                class="color-text-input"
                placeholder="#28a745"
                pattern="^#[0-9A-Fa-f]{6}$"
                :disabled="loading"
              />
              <button 
                @click="applyCustomColor" 
                :disabled="!isCustomColorValid || loading"
                class="apply-color-btn"
              >
                Apply Custom
              </button>
            </div>
            
            <div v-if="contrastWarning" class="contrast-warning">
              <span class="warning-text">
                This color may not meet accessibility standards. 
                Consider using one of the recommended palettes above.
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Logo Upload -->
      <div class="config-card">
        <h3>Logo</h3>
        
        <!-- Logo Position Selection -->
        <div v-if="logoConfig" class="logo-position-section">
          <h4>Logo Position</h4>
          <div class="position-options">
            <label 
              v-for="option in logoConfig.positionOptions" 
              :key="option.value"
              class="position-option"
            >
              <input 
                type="radio" 
                :value="option.value" 
                v-model="selectedLogoPosition"
                @change="updateLogoPosition"
                :disabled="loading"
              />
              <span class="position-label">{{ option.label }}</span>
            </label>
          </div>
        </div>
        
        <div class="logo-upload-section">
          <div class="current-logo" v-if="currentLogoUrl">
            <img :src="currentLogoUrl" alt="Current logo" class="logo-preview" />
            <button @click="removeLogo" class="remove-logo-btn" :disabled="loading">
              Remove Logo
            </button>
          </div>
          
          <div class="logo-upload">
            <input 
              type="file" 
              ref="logoInput"
              @change="handleLogoUpload"
              accept="image/*"
              class="file-input"
              :disabled="loading"
            />
            <button 
              @click="$refs.logoInput.click()" 
              class="upload-btn"
              :disabled="loading"
            >
              {{ currentLogoUrl ? 'Change Logo' : 'Upload Logo' }}
            </button>
          </div>
          
          <div v-if="logoConfig" class="upload-requirements">
            <h5>Requirements:</h5>
            <ul>
              <li>Maximum size: {{ logoConfig.maxWidth }}×{{ logoConfig.maxHeight }} pixels</li>
              <li>Minimum size: {{ logoConfig.minWidth }}×{{ logoConfig.minHeight }} pixels</li>
              <li>Formats: {{ logoConfig.allowedFormats }}</li>
              <li>Oversized images will be automatically resized</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Live Preview -->
      <div class="config-card preview-card">
        <h3>Live Preview</h3>
        <div class="theme-preview" :style="previewStyles">
          <div class="preview-header">
            <div v-if="currentLogoUrl" class="preview-logo">
              <img :src="currentLogoUrl" alt="Logo preview" />
            </div>
            <span class="preview-title">{{ businessName || 'Your Business Name' }}</span>
          </div>
          
          <div class="preview-content">
            <button class="preview-btn primary">Primary Button</button>
            <button class="preview-btn secondary">Secondary Button</button>
            <div class="preview-text">
              <p>This is how your text content will appear with the selected theme.</p>
              <a href="#" class="preview-link">Sample link styling</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="section-actions">
      <button 
        @click="resetToDefaults" 
        class="btn secondary"
        :disabled="loading"
      >
        Reset to Defaults
      </button>
      <button 
        @click="saveThemeConfig" 
        class="btn primary"
        :disabled="loading || (!hasChanges)"
      >
        <span v-if="loading" class="loading-spinner"></span>
        {{ loading ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAdminSettings } from '@/composables/useAdminSettings'
import { CURATED_PALETTES, getThemeDefaults } from '@/constants/themeDefaults'

export default {
  name: 'ThemeConfigSection',
  props: {
    initialData: {
      type: Object,
      default: () => ({})
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['change'],
  
  setup(props, { emit }) {
    const settingsStore = useSettingsStore()
    const { saveThemeSettings, isSavingTheme } = useAdminSettings()
    
    // Reactive state
    const selectedPalette = ref(null)
    const customPrimaryColor = ref('#28a745')
    const currentLogoBaseUrl = ref('')
    const businessName = ref('Lesson Booking App')
    const contrastWarning = ref(false)
    const isCustomColorValid = ref(true)
    const originalData = ref({})
    const logoConfig = ref(null)
    const selectedLogoPosition = ref('left')
    
    // Computed property for versioned logo URL
    const currentLogoUrl = computed(() => {
      return settingsStore.versionedLogoUrl(currentLogoBaseUrl.value)
    })
    
    // Use imported curated palettes
    const curatedPalettes = CURATED_PALETTES
    
    // Computed properties
    const hasChanges = computed(() => {
      return JSON.stringify(getCurrentConfig()) !== JSON.stringify(originalData.value)
    })
    
    const previewStyles = computed(() => {
      const primary = selectedPalette.value?.primary || customPrimaryColor.value
      const secondary = selectedPalette.value?.secondary || generateSecondaryColor(primary)
      
      return {
        '--preview-primary': primary,
        '--preview-secondary': secondary,
        '--preview-primary-hover': darkenColor(primary, 0.1),
        '--preview-text-on-primary': getContrastText(primary)
      }
    })
    
    // Methods
    const selectPalette = (palette) => {
      selectedPalette.value = palette
      customPrimaryColor.value = palette.primary
      contrastWarning.value = false
      isCustomColorValid.value = true
      
      // Apply live preview when palette is selected
      settingsStore.updateThemePreview({
        primary_color: palette.primary,
        secondary_color: palette.secondary,
        palette_name: palette.name
      })
    }
    
    const validateAndPreviewCustomColor = () => {
      // Reset palette selection when custom color is used
      selectedPalette.value = null
      
      // Validate hex color format
      const hexRegex = /^#[0-9A-Fa-f]{6}$/
      isCustomColorValid.value = hexRegex.test(customPrimaryColor.value)
      
      if (isCustomColorValid.value) {
        // Check contrast
        contrastWarning.value = !validateContrast(customPrimaryColor.value)
        
        // Apply live preview for custom color
        settingsStore.updateThemePreview({
          primary_color: customPrimaryColor.value,
          secondary_color: generateSecondaryColor(customPrimaryColor.value),
          palette_name: 'custom'
        })
      }
    }
    
    const applyCustomColor = () => {
      if (isCustomColorValid.value) {
        // Custom color is already applied via reactive binding
        // Color validation and preview update automatically
      }
    }
    
    const handleLogoUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return
      
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('logo', file)
        
        // Upload to backend
        const response = await fetch('/api/admin/settings/logo/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.details || result.error || 'Upload failed')
        }
        
        // Update logo base URL
        currentLogoBaseUrl.value = result.logoUrl
        
        // Bust logo cache to force browser to reload new image
        settingsStore.bustLogoCache()
        
        // Emit success event with upload info
        emitChange('logo_uploaded', { 
          logoUrl: result.logoUrl,
          info: result.info,
          message: result.message
        })
        
      } catch (error) {
        // Reset file input
        event.target.value = ''
        
        // Handle error appropriately - emit error event to parent
        emitChange('upload_error', { error: error.message })
      }
    }
    
    const removeLogo = async () => {
      try {
        const response = await fetch('/api/admin/settings/logo', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to remove logo')
        }
        
        // Clear logo base URL
        currentLogoBaseUrl.value = ''
        
        // Bust logo cache
        settingsStore.bustLogoCache()
        
        // Emit success event
        emitChange('logo_removed', { message: result.message })
        
      } catch (error) {
        // Handle error appropriately - emit error event to parent
        emitChange('upload_error', { error: error.message })
      }
    }
    
    const saveThemeConfig = async () => {
      try {
        const config = getCurrentConfig()
        
        // Emit loading start
        emitChange('save_start', { config })
        
        // Save using the useAdminSettings composable
        const result = await saveThemeSettings({
          primaryColor: config.primaryColor,
          secondaryColor: config.secondaryColor,
          palette: config.palette
        })
        
        // Update local config in settingsStore (optimistic update)
        if (result.data) {
          settingsStore.config.theme = getThemeDefaults({
            primary_color: result.data.primaryColor,
            secondary_color: result.data.secondaryColor,
            palette_name: result.data.palette
          })
        }
        
        // Update original data to reflect saved state
        originalData.value = { ...config }
        
        // Emit success event
        emitChange('theme_saved', { 
          message: result.message,
          config: config
        })
      } catch (error) {
        // Emit error event
        emitChange('save_error', { error: error.message })
      }
    }
    
    const resetToDefaults = () => {
      selectedPalette.value = curatedPalettes[0]
      customPrimaryColor.value = curatedPalettes[0].primary
      contrastWarning.value = false
      isCustomColorValid.value = true
    }
    
    const updateLogoPosition = async () => {
      try {
        const response = await fetch('/api/admin/settings/logo/position', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ position: selectedLogoPosition.value })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to update logo position')
        }
        
        // Emit success event
        emitChange('logo_position_updated', { 
          position: selectedLogoPosition.value,
          message: result.message
        })
        
      } catch (error) {
        // Handle error appropriately - emit error event to parent
        emitChange('upload_error', { error: error.message })
      }
    }
    
    const getCurrentConfig = () => {
      return {
        primaryColor: customPrimaryColor.value,
        secondaryColor: selectedPalette.value?.secondary || generateSecondaryColor(customPrimaryColor.value),
        palette: selectedPalette.value?.name || 'custom',
        logoUrl: currentLogoUrl.value
      }
    }
    
    const emitChange = (action, payload = {}) => {
      emit('change', {
        action,
        payload: {
          ...payload,
          config: getCurrentConfig()
        }
      })
    }
    
    // Utility functions
    const validateContrast = (color) => {
      // Simplified contrast validation
      // In real implementation, use chroma-js or similar library
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      // Simple heuristic: mid-range luminance values may have contrast issues
      return luminance < 0.3 || luminance > 0.7
    }
    
    const getContrastText = (backgroundColor) => {
      // Simplified contrast text calculation
      const hex = backgroundColor.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      return luminance > 0.5 ? '#000000' : '#ffffff'
    }
    
    const darkenColor = (color, amount) => {
      // Simplified color darkening
      const hex = color.replace('#', '')
      const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount))
      const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount))
      const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount))
      
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
    }
    
    const generateSecondaryColor = (primaryColor) => {
      // Generate a complementary secondary color
      const hex = primaryColor.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      
      // Simple complementary color generation
      const newR = Math.min(255, r + 40)
      const newG = Math.min(255, g + 40)
      const newB = Math.max(0, b - 40)
      
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
    }
    
    // Fetch current logo and config
    const fetchCurrentLogo = async () => {
      try {
        // Fetch branding info (includes logo config)
        const brandingResponse = await fetch('/api/branding')
        if (brandingResponse.ok) {
          const branding = await brandingResponse.json()
          if (branding.logoUrl) {
            currentLogoBaseUrl.value = branding.logoUrl
          }
          if (branding.logoConfig) {
            logoConfig.value = branding.logoConfig
          }
          if (branding.logoPosition) {
            selectedLogoPosition.value = branding.logoPosition
          }
        }
      } catch (error) {
        console.warn('Could not fetch branding information:', error.message)
      }
    }

    // Initialize with props data
    watch(() => props.initialData, (newData) => {
      if (newData && Object.keys(newData).length > 0) {
        originalData.value = { ...newData }
        customPrimaryColor.value = newData.primaryColor || '#28a745'
        currentLogoBaseUrl.value = newData.logoUrl || ''
        
        // Try to match with a curated palette
        const matchingPalette = curatedPalettes.find(p => p.primary === newData.primaryColor)
        if (matchingPalette) {
          selectedPalette.value = matchingPalette
        }
      }
    }, { immediate: true })
    
    // Fetch current logo on component mount
    fetchCurrentLogo()
    
    return {
      selectedPalette,
      customPrimaryColor,
      currentLogoUrl,
      businessName,
      contrastWarning,
      isCustomColorValid,
      logoConfig,
      selectedLogoPosition,
      curatedPalettes,
      hasChanges,
      previewStyles,
      selectPalette,
      validateAndPreviewCustomColor,
      applyCustomColor,
      handleLogoUpload,
      removeLogo,
      updateLogoPosition,
      saveThemeConfig,
      resetToDefaults
    }
  }
}
</script>

<style scoped>
.theme-config-section {
  max-width: 100%;
}

.section-header {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.section-header h2 {
  color: var(--text-primary);
  font-size: var(--font-size-2xl);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.section-description {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.config-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.config-card h3 {
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--spacing-md) 0;
  font-weight: 600;
}

.preview-card {
  grid-column: 1 / -1;
}

/* Color Configuration Styles */
.curated-palettes h4,
.custom-color-section h4 {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 500;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.palette-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  background: white;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.palette-option:hover {
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.palette-option.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.palette-colors {
  display: flex;
  gap: 2px;
  border-radius: 4px;
  overflow: hidden;
}

.palette-color {
  width: 24px;
  height: 24px;
}

.palette-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-align: center;
}

.color-input-group {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.color-input {
  width: 50px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

.color-text-input {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-family: monospace;
}

.apply-color-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: background var(--transition-normal);
}

.apply-color-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.apply-color-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contrast-warning {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: #fef3cd;
  border: 1px solid #faebcd;
  border-radius: var(--border-radius-sm);
  color: #856404;
  font-size: var(--font-size-sm);
}

/* Logo Position Styles */
.logo-position-section {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.logo-position-section h4 {
  color: var(--text-primary);
  font-size: var(--font-size-base);
  margin: 0 0 var(--spacing-sm) 0;
  font-weight: 500;
}

.position-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.position-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background var(--transition-normal);
}

.position-option:hover {
  background: var(--background-hover);
}

.position-option input[type="radio"] {
  margin: 0;
}

.position-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

/* Logo Upload Styles */
.current-logo {
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.logo-preview {
  max-width: 400px;
  max-height: 100px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--spacing-sm);
}

.remove-logo-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--error-color);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.file-input {
  display: none;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--background-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  margin-bottom: var(--spacing-md);
}

.upload-requirements {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.upload-requirements h5 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.upload-requirements ul {
  margin: 0;
  padding-left: var(--spacing-md);
}

.upload-requirements li {
  margin-bottom: var(--spacing-xs);
}

/* Preview Styles */
.theme-preview {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  background: white;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.preview-logo img {
  max-height: 40px;
  max-width: 160px;
}

.preview-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--preview-primary, var(--primary-color));
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.preview-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-normal);
  width: fit-content;
}

.preview-btn.primary {
  background: var(--preview-primary, var(--primary-color));
  color: var(--preview-text-on-primary, white);
}

.preview-btn.primary:hover {
  background: var(--preview-primary-hover, var(--primary-dark));
}

.preview-btn.secondary {
  background: var(--preview-secondary, var(--success-color));
  color: white;
}

.preview-text p {
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--text-primary);
}

.preview-link {
  color: var(--preview-primary, var(--primary-color));
  text-decoration: none;
}

.preview-link:hover {
  text-decoration: underline;
}

/* Action Buttons */
.section-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.btn.primary {
  background: var(--primary-color);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn.secondary {
  background: var(--background-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--border-color);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .palette-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .color-input-group {
    flex-wrap: wrap;
  }
  
  .section-actions {
    flex-direction: column;
  }
  
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
