/**
 * Theme application composable
 * Handles applying theme colors to CSS custom properties
 */

import { computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Apply theme colors to CSS custom properties
 * @param {Object} colors - Theme colors object
 */
export function applyTheme(colors) {
  const root = document.documentElement
  
  if (!colors) return
  
  // Apply primary color and variants
  if (colors.primary_color) {
    root.style.setProperty('--theme-primary', colors.primary_color)
    root.style.setProperty('--primary-color', colors.primary_color) // Legacy compatibility
    
    // Generate primary variants
    root.style.setProperty('--theme-primary-hover', darkenColor(colors.primary_color, 0.1))
    root.style.setProperty('--primary-dark', darkenColor(colors.primary_color, 0.15)) // Legacy compatibility
  }
  
  // Apply secondary color and variants  
  if (colors.secondary_color) {
    root.style.setProperty('--theme-secondary', colors.secondary_color)
    root.style.setProperty('--success-color', colors.secondary_color) // Legacy compatibility
  }
  
  // Auto-calculate text colors for accessibility
  if (colors.primary_color) {
    const textOnPrimary = getContrastText(colors.primary_color)
    root.style.setProperty('--theme-text-on-primary', textOnPrimary)
  }
}

/**
 * Darken a hex color by a given amount
 * @param {string} color - Hex color (e.g., '#28a745')
 * @param {number} amount - Amount to darken (0-1)
 * @returns {string} Darkened hex color
 */
function darkenColor(color, amount) {
  const hex = color.replace('#', '')
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount))
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount))
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount))
  
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

/**
 * Calculate the best text color (black or white) for a background color
 * @param {string} backgroundColor - Hex background color
 * @returns {string} '#000000' or '#ffffff'
 */
function getContrastText(backgroundColor) {
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)  
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Composable for theme management
 * @returns {Object} Theme utilities and reactive state
 */
export function useTheme() {
  const settingsStore = useSettingsStore()
  
  // Reactive theme object
  const theme = computed(() => settingsStore.theme)
  
  // Watch for theme changes and apply them
  watch(theme, (newTheme) => {
    if (newTheme) {
      applyTheme(newTheme)
    }
  }, { immediate: true })
  
  return {
    theme,
    applyTheme
  }
}
