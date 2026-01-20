import { defineStore } from 'pinia'
import { THEME_DEFAULTS, getThemeDefaults } from '@/constants/themeDefaults'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // App configuration loaded once on startup
    config: {
      // Lesson settings
      defaultLessonDurationMinutes: 30,
      slotDuration: 2, // 30 minutes = 2 slots of 15 minutes each
      inPersonPaymentEnabled: false,
      
      // Add other common config here as needed
      // timezone: 'UTC',
      // maxBookingDays: 30,
      // etc.
    },
    
    // Branding configuration
    branding: {
      logoVersion: Date.now(), // Timestamp for cache busting
    },
    
    // Loading state
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    /**
     * Get slot duration for scheduling calculations
     */
    slotDuration: (state) => state.config.slotDuration,

    /**
     * Get default lesson duration in minutes
     */
    defaultLessonDuration: (state) => state.config.defaultLessonDurationMinutes,

    /**
     * Get in-person payment enabled setting
     */
    inPersonPaymentEnabled: (state) => state.config.inPersonPaymentEnabled,

    /**
     * Get versioned logo URL for cache busting
     * @param {string} baseUrl - Base logo URL (e.g., '/api/assets/logo')
     * @returns {string} URL with version query parameter
     */
    versionedLogoUrl: (state) => (baseUrl) => {
      if (!baseUrl) return null
      return `${baseUrl}?v=${state.branding.logoVersion}`
    },

    /**
     * Check if settings are ready to use
     */
    isReady: (state) => state.isLoaded,

    /**
     * Get current theme settings for UI consumption
     */
    theme: (state) => state.config.theme || THEME_DEFAULTS,

    /**
     * Get primary color for UI components
     */
    primaryColor: (state) => state.config.theme?.primary_color || THEME_DEFAULTS.primary_color,

    /**
     * Get secondary color for UI components
     */
    secondaryColor: (state) => state.config.theme?.secondary_color || THEME_DEFAULTS.secondary_color,

    /**
     * Get palette name for admin interface
     */
    paletteName: (state) => state.config.theme?.palette_name || THEME_DEFAULTS.palette_name
  },

  actions: {
    /**
     * Load all app configuration on startup
     * Simple, fast, and reliable - loads once and stores for entire session
     */
    async initialize() {
      if (this.isLoaded || this.isLoading) {
        return // Already loaded or loading
      }

      this.isLoading = true

      try {
        // Load all public configuration (no auth required)
        const response = await fetch('/api/public/config')

        if (response.ok) {
          const data = await response.json()
          
          // Update config with loaded values
          this.config.defaultLessonDurationMinutes = data.default_duration_minutes || 30
          this.config.slotDuration = Math.ceil((data.default_duration_minutes || 30) / 15) // Convert minutes to slots
          this.config.inPersonPaymentEnabled = data.in_person_payment_enabled || false
          
          // Update theme config (single source of truth)
          this.config.theme = getThemeDefaults(data.theme)
        } else {
          console.warn('Failed to load settings, using defaults')
        }
      } catch (error) {
        console.warn('Error loading settings, using defaults:', error)
        // Keep default values - no need to throw, app can work with defaults
      } finally {
        this.isLoaded = true
        this.isLoading = false
      }
    },

    /**
     * Refresh settings (useful after admin updates)
     * Simple pattern: just reload and update the config
     */
    async refresh() {
      this.isLoaded = false
      await this.initialize()
    },


    /**
     * Update config directly (useful for admin interface)
     * @param {Object} updates - Config updates to apply
     */
    updateConfig(updates) {
      Object.assign(this.config, updates)
    },

    /**
     * Bust logo cache by updating version timestamp
     * Call this after uploading or removing a logo
     */
    bustLogoCache() {
      this.branding.logoVersion = Date.now()
    },


    /**
     * Update theme temporarily for preview (without saving)
     * @param {Object} themeUpdates - Theme updates to apply
     */
    updateThemePreview(themeUpdates) {
      this.config.theme = getThemeDefaults({
        ...this.config.theme,
        ...themeUpdates
      })
    }
  }
})
