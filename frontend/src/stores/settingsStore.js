import { defineStore } from 'pinia'

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
     * Check if settings are ready to use
     */
    isReady: (state) => state.isLoaded
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
    }
  }
})
