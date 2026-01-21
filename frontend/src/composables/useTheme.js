/**
 * Theme application composable
 * Handles applying theme colors to CSS custom properties
 * 
 * NOTE: Theme colors are injected server-side into the HTML <head> on page load
 * (see middleware/themeInjection.js) to eliminate FOUC. This composable provides:
 * 1. Dynamic updates when theme changes (e.g., admin updates settings)
 * 2. Fallback for edge cases where server injection fails
 * 3. Consistent theme application logic for both server and client
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
    
    // Shadcn integration: Convert primary color to HSL for Tailwind
    const primaryHSL = hexToHSL(colors.primary_color)
    root.style.setProperty('--primary', primaryHSL)
    root.style.setProperty('--ring', primaryHSL) // Focus ring matches primary
  }
  
  // Apply secondary color and variants  
  if (colors.secondary_color) {
    root.style.setProperty('--theme-secondary', colors.secondary_color)
    root.style.setProperty('--success-color', colors.secondary_color) // Legacy compatibility
  }
  
  // Apply error color for destructive actions (shadcn integration)
  // Using --error-color which is set in main.css
  const errorColorHex = getComputedStyle(root).getPropertyValue('--error-color').trim()
  if (errorColorHex && errorColorHex.startsWith('#')) {
    const destructiveHSL = hexToHSL(errorColorHex)
    root.style.setProperty('--destructive', destructiveHSL)
  }
  
  // Auto-calculate text colors for accessibility
  if (colors.primary_color) {
    const textOnPrimary = getContrastText(colors.primary_color)
    root.style.setProperty('--theme-text-on-primary', textOnPrimary)
    
    // Shadcn integration: Set primary-foreground (text on primary buttons)
    const foregroundHSL = hexToHSL(textOnPrimary)
    root.style.setProperty('--primary-foreground', foregroundHSL)
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
 * Convert hex color to HSL format for Tailwind/Shadcn
 * @param {string} hex - Hex color (e.g., '#42b883')
 * @returns {string} HSL values without hsl() wrapper (e.g., '151 47% 49%')
 */
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255
  
  // Find min and max values
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  // Calculate lightness
  const l = (max + min) / 2
  
  // Calculate saturation
  let s = 0
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min)
  }
  
  // Calculate hue
  let h = 0
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
    } else if (max === g) {
      h = ((b - r) / diff + 2) / 6
    } else {
      h = ((r - g) / diff + 4) / 6
    }
  }
  
  // Convert to degrees and percentages
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const lPercent = Math.round(l * 100)
  
  // Return in Tailwind format (no hsl() wrapper, space-separated)
  return `${h} ${s}% ${lPercent}%`
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
