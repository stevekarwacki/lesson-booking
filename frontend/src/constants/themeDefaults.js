/**
 * Default theme configuration
 * Single source of truth for all theme fallback values
 */
export const THEME_DEFAULTS = {
  primary_color: '#28a745',
  secondary_color: '#20c997',
  palette_name: 'Forest Green'
}

/**
 * Curated color palettes for admin interface
 * These are WCAG AA compliant color combinations
 */
export const CURATED_PALETTES = [
  { name: 'Forest Green', primary: '#28a745', secondary: '#20c997' },
  { name: 'Ocean Blue', primary: '#007bff', secondary: '#17a2b8' },
  { name: 'Sunset Orange', primary: '#fd7e14', secondary: '#ffc107' },
  { name: 'Royal Purple', primary: '#6f42c1', secondary: '#e83e8c' },
  { name: 'Charcoal', primary: '#495057', secondary: '#6c757d' }
]

/**
 * Get default theme with optional overrides
 * @param {Object} overrides - Values to override in default theme
 * @returns {Object} Complete theme configuration
 */
export function getThemeDefaults(overrides = {}) {
  return {
    ...THEME_DEFAULTS,
    ...overrides
  }
}

/**
 * Validate if a color is a valid hex color
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid hex color
 */
export function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}
